import { describe, it, expect, vi, beforeEach } from 'vitest'

// Documentos montados no navegador na auditoria (SR-106, rota da SR-104): o
// painel avisa ANTES de gerar e, se o aviso falhar, não gera.

const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

const {
  alvoDoDocumento, corpoDoRegistro, erroDoDocumento, mensagemDoRegistro, periodoDoDocumento, registrarDocumento,
  DocumentoNaoRegistradoError, TEXTOS_DO_REGISTRO,
} = await import('@/lib/registrar-documento')
const { ApiError } = await import('@/lib/api')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('alvoDoDocumento', () => {
  it('junta as partes com " · ", sem vazio nem espaço sobrando', () => {
    expect(alvoDoDocumento('  HORTA  ', null, '', undefined, false, 'JOÃO   DA SILVA')).toBe('HORTA · JOÃO DA SILVA')
    expect(alvoDoDocumento()).toBe('')
  })

  it('corta em 120 caracteres com reticências (a API recusaria mais)', () => {
    const alvo = alvoDoDocumento('X'.repeat(200))
    expect(alvo).toHaveLength(120)
    expect(alvo.endsWith('…')).toBe(true)
  })
})

describe('periodoDoDocumento', () => {
  it('um dia, um período ou uma ponta só', () => {
    expect(periodoDoDocumento('2026-11-12', '2026-11-12')).toBe('12/11/2026')
    expect(periodoDoDocumento('2026-10-05', '2026-10-11')).toBe('05/10/2026 a 11/10/2026')
    expect(periodoDoDocumento('2026-10-05', null)).toBe('desde 05/10/2026')
    expect(periodoDoDocumento(undefined, '2026-10-11')).toBe('até 11/10/2026')
    expect(periodoDoDocumento()).toBe('')
  })
})

describe('corpoDoRegistro', () => {
  it('só o que tem valor; ids sem vazio nem repetido', () => {
    expect(corpoDoRegistro({ linhas: 12, alvo: 'HORTA', ids: ['r1', '', null, 'r1', ' r2 '] }))
      .toEqual({ linhas: 12, alvo: 'HORTA', ids: ['r1', 'r2'] })
    expect(corpoDoRegistro({ linhas: 1, alvo: '  ', ids: [undefined], escopo: 'seleção' }))
      .toEqual({ linhas: 1, escopo: 'seleção' })
  })

  it('fica dentro dos limites da API', () => {
    expect(corpoDoRegistro({ linhas: -3 }).linhas).toBe(0)
    expect(corpoDoRegistro({ linhas: 200_000 }).linhas).toBe(100_000)
    expect(corpoDoRegistro({ linhas: Number.NaN }).linhas).toBe(0)
    // Mais de 1000 ids: a lista sai inteira (uma parte pareceria a lista toda).
    const muitos = Array.from({ length: 1001 }, (_, i) => `id${i}`)
    expect(corpoDoRegistro({ linhas: 1001, ids: muitos })).toEqual({ linhas: 1001 })
    expect(corpoDoRegistro({ linhas: 1, ids: ['x'.repeat(65)] })).toEqual({ linhas: 1 })
  })
})

describe('mensagemDoRegistro', () => {
  it('429 da rota e 400 com o texto da API; 403, rede e 5xx com o texto da tela', () => {
    const muitos = 'Muitos documentos seguidos. Aguarde um minuto e tente de novo.'
    expect(mensagemDoRegistro(new ApiError(429, muitos))).toBe(muitos)
    expect(mensagemDoRegistro(new ApiError(429, 'Rate limit exceeded, retry in 1 minute'))).toBe(TEXTOS_DO_REGISTRO.muitos)
    expect(mensagemDoRegistro(new ApiError(400, 'Informe o campo "linhas".'))).toBe('Informe o campo "linhas".')
    expect(mensagemDoRegistro(new ApiError(403, 'Forbidden'))).toBe('Você não tem permissão para gerar este documento.')
    expect(mensagemDoRegistro(new TypeError('Failed to fetch'))).toBe(TEXTOS_DO_REGISTRO.falhou)
    expect(mensagemDoRegistro(new ApiError(500, 'HTTP 500'))).toBe(TEXTOS_DO_REGISTRO.falhou)
    expect(mensagemDoRegistro(new ApiError(400, 'HTTP 400'))).toBe(TEXTOS_DO_REGISTRO.falhou)
  })
})

describe('registrarDocumento', () => {
  it('POST na rota do tipo, com o corpo já limpo', async () => {
    apiFetch.mockResolvedValue({ status: 204 })
    await registrarDocumento('lista-presenca', { linhas: 2, alvo: 'HORTA', ids: ['r1', 'r2'] })
    expect(apiFetch).toHaveBeenCalledWith('/admin/export/documents/lista-presenca', {
      method: 'POST',
      body: JSON.stringify({ linhas: 2, alvo: 'HORTA', ids: ['r1', 'r2'] }),
    })
  })

  it('falhou: lança o erro com a mensagem da tela e o status', async () => {
    apiFetch.mockRejectedValue(new ApiError(403, 'Forbidden'))
    const erro = await registrarDocumento('recibo', { linhas: 1 }).catch(e => e)
    expect(erro).toBeInstanceOf(DocumentoNaoRegistradoError)
    expect(erro.status).toBe(403)
    expect(erroDoDocumento(erro, 'Erro ao gerar o recibo.')).toBe('Você não tem permissão para gerar este documento.')
    // Outro erro (o do PDF): o texto de sempre da tela.
    expect(erroDoDocumento(new Error('boom'), 'Erro ao gerar o recibo.')).toBe('Erro ao gerar o recibo.')
  })

  it('sem internet: status null', async () => {
    apiFetch.mockRejectedValue(new TypeError('Failed to fetch'))
    const erro = await registrarDocumento('agenda', { linhas: 0 }).catch(e => e)
    expect(erro).toBeInstanceOf(DocumentoNaoRegistradoError)
    expect(erro.status).toBeNull()
    expect(erro.message).toBe(TEXTOS_DO_REGISTRO.falhou)
  })
})
