import { describe, it, expect, vi, beforeEach } from 'vitest'

// Os três documentos da Unimed (tela da Unimed e aba Unimed da ficha da pessoa)
// vão para a auditoria antes de gerar, com o nome da pessoa (SR-106). Se o
// registro falhar, o PDF não sai.

const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))
const downloadFichaUnimed = vi.fn()
const downloadTermoUnimed = vi.fn()
const downloadContratoUnimed = vi.fn()
vi.mock('@/lib/unimed-ficha-pdf', () => ({ downloadFichaUnimed: (...a: unknown[]) => downloadFichaUnimed(...a) }))
vi.mock('@/lib/unimed-termo-pdf', () => ({ downloadTermoUnimed: (...a: unknown[]) => downloadTermoUnimed(...a) }))
vi.mock('@/lib/unimed-contrato-pdf', () => ({ downloadContratoUnimed: (...a: unknown[]) => downloadContratoUnimed(...a) }))

const { baixarFichaUnimed, baixarTermoUnimed, baixarContratoUnimed } = await import('@/lib/unimed-docs')
const { ApiError } = await import('@/lib/api')
const { DocumentoNaoRegistradoError } = await import('@/lib/registrar-documento')
const { apiErrorMessage } = await import('@/lib/api-error-message')

let ordem: string[] = []

function simular(documento: () => Promise<unknown> = () => Promise.resolve({ status: 204 })) {
  apiFetch.mockImplementation((path: string) => {
    if (path.startsWith('/admin/export/documents/')) { ordem.push(path); return documento() }
    const corpo = path === '/admin/unimed/un-1' ? { id: 'un-1', userDataId: 'u-1', titularId: 'u-2' }
      : path === '/admin/users/u-1' ? { id: 'u-1', name: 'MARIA DA SILVA' }
        : path === '/admin/users/u-2' ? { id: 'u-2', name: 'JOSE DA SILVA' }
          : {}
    return Promise.resolve({ json: () => Promise.resolve(corpo) })
  })
}

function corpo(kind: string) {
  const chamada = apiFetch.mock.calls.find(c => c[0] === `/admin/export/documents/${kind}`)
  return chamada ? JSON.parse((chamada[1] as RequestInit).body as string) : null
}

beforeEach(() => {
  vi.clearAllMocks()
  ordem = []
  for (const fn of [downloadFichaUnimed, downloadTermoUnimed, downloadContratoUnimed]) {
    fn.mockImplementation(() => { ordem.push('pdf'); return Promise.resolve() })
  }
})

describe('documentos da Unimed na auditoria', () => {
  it('Ficha: registra com a pessoa e o beneficiário, depois de buscar o titular, e só então gera', async () => {
    simular()
    await baixarFichaUnimed('un-1')
    expect(ordem).toEqual(['/admin/export/documents/unimed-ficha', 'pdf'])
    expect(corpo('unimed-ficha')).toEqual({ linhas: 1, alvo: 'MARIA DA SILVA', ids: ['un-1'] })
    expect(downloadFichaUnimed).toHaveBeenCalledWith(expect.objectContaining({ titularName: 'JOSE DA SILVA' }))
  })

  it('Termo e Contrato: cada um com o seu tipo', async () => {
    simular()
    await baixarTermoUnimed('un-1')
    await baixarContratoUnimed('un-1')
    expect(ordem).toEqual([
      '/admin/export/documents/unimed-termo-adesao', 'pdf', '/admin/export/documents/unimed-contrato', 'pdf',
    ])
    expect(corpo('unimed-contrato')).toEqual({ linhas: 1, alvo: 'MARIA DA SILVA', ids: ['un-1'] })
  })

  it('registro recusado: o PDF não sai e a tela mostra a mensagem pelo apiErrorMessage', async () => {
    simular(() => Promise.reject(new ApiError(403, 'Forbidden')))
    const erro = await baixarTermoUnimed('un-1').catch(e => e)
    expect(erro).toBeInstanceOf(DocumentoNaoRegistradoError)
    expect(downloadTermoUnimed).not.toHaveBeenCalled()
    // As duas telas mostram com apiErrorMessage(e, fallback): a mensagem passa como está.
    expect(apiErrorMessage(erro, 'Erro ao gerar o documento (Termo).')).toBe('Você não tem permissão para gerar este documento.')
  })
})
