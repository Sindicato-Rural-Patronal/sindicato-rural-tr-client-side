import { describe, it, expect, vi, beforeEach } from 'vitest'

// downloadExport com o que o montador manda (decisão 006): `fields`, `format`,
// `modelo` e `confirmed`. Com `format: 'pdf'` a API devolve JSON e o PDF é
// desenhado no navegador; "Imprimir" abre esse mesmo PDF numa aba.

const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))
const saveBlob = vi.fn()
vi.mock('@/utils/download', async importOriginal => ({
  ...(await importOriginal<typeof import('@/utils/download')>()),
  saveBlob: (...args: unknown[]) => saveBlob(...args),
}))
const relatorioJsonPdf = vi.fn()
const saveRelatorioPdf = vi.fn()
vi.mock('@/lib/relatorio-pdf', () => ({
  relatorioJsonPdf: (...args: unknown[]) => relatorioJsonPdf(...args),
  saveRelatorioPdf: (...args: unknown[]) => saveRelatorioPdf(...args),
}))

const {
  downloadExport, exportarRelatorio, reportBody, lerRelatorioJson, exportErrorMessage, ehLimiteDoPdf, RelatorioVazioError,
} = await import('@/lib/export')
const { ApiError } = await import('@/lib/api')
await import('@/i18n')

const JSON_PDF = {
  title: 'Pessoas',
  filename: 'pessoas-2026-11-11.pdf',
  count: 2,
  filters: 'Busca: silva',
  modelo: 'Nome e CPF',
  columns: [{ key: 'name', label: 'Nome', type: 'text', weight: 3 }, { key: 'cpf', label: 'CPF', type: 'cpf' }],
  rows: [['ANA EXPORTA', '529.982.247-25'], ['BRUNO', null]],
}

function respostaJson(corpo: unknown) {
  return { json: () => Promise.resolve(corpo), headers: new Headers() }
}

function respostaCsv(texto: string, headers: Record<string, string> = {}) {
  return { blob: () => Promise.resolve(new Blob([texto])), headers: new Headers(headers) }
}

function corpoEnviado(): Record<string, unknown> {
  return JSON.parse(apiFetch.mock.calls[0][1].body as string)
}

beforeEach(() => {
  vi.clearAllMocks()
  relatorioJsonPdf.mockResolvedValue(new Blob(['%PDF']))
  // jsdom não tem URL.createObjectURL.
  URL.createObjectURL = vi.fn(() => 'blob:relatorio')
  URL.revokeObjectURL = vi.fn()
})

describe('reportBody', () => {
  it('CSV sem fields, é o corpo de hoje (sem format, modelo nem pdfDoNavegador)', () => {
    expect(reportBody({ search: 'ana', ids: [] }, 'csv')).toEqual({ search: 'ana' })
  })

  it('PDF sem fields (montado do CSV): leva pdfDoNavegador e nenhum format (SR-125)', () => {
    expect(reportBody({ search: 'ana', ids: [] }, 'pdf')).toEqual({ search: 'ana', pdfDoNavegador: true })
  })

  it('pdfDoNavegador nunca vai com format (xlsx, ou PDF da API com fields)', () => {
    expect(reportBody({}, 'xlsx')).not.toHaveProperty('pdfDoNavegador')
    expect(reportBody({}, 'xlsx', { fields: ['name'] })).not.toHaveProperty('pdfDoNavegador')
    expect(reportBody({}, 'pdf', { fields: ['name'] })).not.toHaveProperty('pdfDoNavegador')
    expect(reportBody({}, 'csv', { fields: ['name'] })).not.toHaveProperty('pdfDoNavegador')
  })

  it('com fields, manda as chaves na ordem, o formato e o modelo', () => {
    expect(reportBody({ ids: ['a'] }, 'csv', { fields: ['cpf', 'name'], modelo: 'Nome e CPF' }))
      .toEqual({ ids: ['a'], fields: ['cpf', 'name'], format: 'csv', modelo: 'Nome e CPF' })
  })

  it('Excel: o formato vai sempre, com ou sem fields (a planilha rápida e o cadastros)', () => {
    expect(reportBody({ search: 'ana' }, 'xlsx')).toEqual({ search: 'ana', format: 'xlsx' })
    expect(reportBody({}, 'xlsx', { fields: ['name'], modelo: 'Nome' }))
      .toEqual({ fields: ['name'], format: 'xlsx', modelo: 'Nome' })
  })

  it('"Só confirmadas" vai como booleano; desligado não vai', () => {
    expect(reportBody({ courseIds: ['c1'] }, 'pdf', { fields: ['name'], confirmed: true }))
      .toEqual({ courseIds: ['c1'], fields: ['name'], format: 'pdf', confirmed: true })
    expect(reportBody({}, 'csv', { fields: ['name'], confirmed: false })).not.toHaveProperty('confirmed')
  })
})

describe('exportErrorMessage', () => {
  it('o 429 da exportação mostra o texto da API, não o do login', () => {
    const msg = 'Muitas exportações seguidas. Aguarde um minuto e tente de novo.'
    expect(exportErrorMessage(new ApiError(429, msg), 'x')).toBe(msg)
    expect(exportErrorMessage(new ApiError(429, 'Too Many Requests'), 'x')).toMatch(/^Muitas tentativas/)
    const docs = 'Muitos documentos seguidos. Aguarde um minuto e tente de novo.'
    expect(exportErrorMessage(new ApiError(429, docs), 'x')).toBe(docs)
  })

  it('os outros erros seguem o apiErrorMessage (o 403 por campo vem como a API mandou)', () => {
    expect(exportErrorMessage(new ApiError(403, 'Sem permissão para exportar: RG.'), 'x')).toBe('Sem permissão para exportar: RG.')
    expect(exportErrorMessage(new ApiError(500, 'HTTP 500'), 'Erro ao exportar.')).not.toBe('HTTP 500')
  })
})

describe('lerRelatorioJson', () => {
  it('célula nula vira vazio e o que falta tem padrão', () => {
    const r = lerRelatorioJson({ columns: [{ key: 'a', label: 'A' }], rows: [[null, 3]] }, 'Pessoas', 'p.pdf')
    expect(r).toEqual({
      title: 'Pessoas', filename: 'p.pdf', count: 1, filters: null, modelo: null,
      columns: [{ key: 'a', label: 'A', type: 'text' }], rows: [['', '3']],
    })
  })

  it('sem colunas ou linhas é erro', () => {
    expect(() => lerRelatorioJson('a;b', 'X', 'x.pdf')).toThrow()
    expect(() => lerRelatorioJson({ columns: [] }, 'X', 'x.pdf')).toThrow()
  })
})

describe('downloadExport do montador', () => {
  it('PDF: pede JSON com os campos e desenha o PDF com o nome que a API mandou', async () => {
    apiFetch.mockResolvedValue(respostaJson(JSON_PDF))
    const n = await downloadExport('people', { search: 'silva' }, 'pdf', { fields: ['name', 'cpf'], modelo: 'Nome e CPF' })

    expect(apiFetch).toHaveBeenCalledWith('/admin/export/people', expect.objectContaining({ method: 'POST' }))
    expect(corpoEnviado()).toEqual({ search: 'silva', fields: ['name', 'cpf'], format: 'pdf', modelo: 'Nome e CPF' })
    expect(relatorioJsonPdf).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Pessoas', modelo: 'Nome e CPF', rows: [['ANA EXPORTA', '529.982.247-25'], ['BRUNO', '']],
    }))
    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'pessoas-2026-11-11.pdf')
    expect(saveRelatorioPdf).not.toHaveBeenCalled()
    expect(n).toBe(2)
  })

  it('CSV: baixa o arquivo da API como hoje, com os campos no corpo', async () => {
    apiFetch.mockResolvedValue(respostaCsv('﻿"Nome"', {
      'Content-Disposition': 'attachment; filename="pessoas-2026-11-11.csv"', 'X-Export-Count': '7',
    }))
    const n = await downloadExport('people', {}, 'csv', { fields: ['name'] })
    expect(corpoEnviado()).toEqual({ fields: ['name'], format: 'csv' })
    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'pessoas-2026-11-11.csv')
    expect(relatorioJsonPdf).not.toHaveBeenCalled()
    expect(n).toBe(7)
  })

  it('Excel: baixa o arquivo da API com o nome do Content-Disposition, sem desenhar nada', async () => {
    apiFetch.mockResolvedValue(respostaCsv('PK', {
      'Content-Disposition': 'attachment; filename="pessoas-2026-11-11.xlsx"', 'X-Export-Count': '2500',
    }))
    const n = await downloadExport('people', { search: 'silva' }, 'xlsx')
    expect(corpoEnviado()).toEqual({ search: 'silva', format: 'xlsx' })
    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'pessoas-2026-11-11.xlsx')
    expect(saveRelatorioPdf).not.toHaveBeenCalled()
    expect(relatorioJsonPdf).not.toHaveBeenCalled()
    expect(n).toBe(2500)
  })

  it('Excel sem Content-Disposition: o nome de sempre, com .xlsx', async () => {
    apiFetch.mockResolvedValue(respostaCsv('PK', { 'X-Export-Count': '4' }))
    await downloadExport('cadastros', {}, 'xlsx')
    expect(corpoEnviado()).toEqual({ format: 'xlsx' })
    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^relatorio-de-cadastros-\d{4}-\d{2}-\d{2}\.xlsx$/))
  })

  it('Imprimir: o PDF vai para a aba aberta no clique, sem baixar', async () => {
    apiFetch.mockResolvedValue(respostaJson(JSON_PDF))
    const aba = { closed: false, location: { href: '' } } as unknown as Window

    const r = await exportarRelatorio('people', {}, 'pdf', { fields: ['name'], print: true, printWindow: aba })

    expect(aba.location.href).toBe('blob:relatorio')
    expect(saveBlob).not.toHaveBeenCalled()
    expect(r).toEqual({ count: 2, abriuAba: true })
  })

  it('Imprimir sem aba (bloqueada): tenta abrir e, se não der, baixa e diz que baixou', async () => {
    apiFetch.mockResolvedValue(respostaJson(JSON_PDF))
    const open = vi.spyOn(window, 'open').mockReturnValue(null)

    const r = await exportarRelatorio('people', {}, 'pdf', { fields: ['name'], print: true, printWindow: null })

    expect(open).toHaveBeenCalledWith('blob:relatorio', '_blank')
    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'pessoas-2026-11-11.pdf')
    expect(r).toEqual({ count: 2, abriuAba: false })
    open.mockRestore()
  })

  it('recusarVazio: PDF ou planilha sem nenhum registro não vira arquivo', async () => {
    apiFetch.mockResolvedValue(respostaJson({ ...JSON_PDF, count: 0, rows: [] }))
    await expect(exportarRelatorio('registrations', {}, 'pdf', { fields: ['name'], recusarVazio: true }))
      .rejects.toBeInstanceOf(RelatorioVazioError)
    expect(relatorioJsonPdf).not.toHaveBeenCalled()

    apiFetch.mockResolvedValue(respostaCsv('"Nome"', { 'X-Export-Count': '0' }))
    await expect(exportarRelatorio('registrations', {}, 'csv', { fields: ['name'], recusarVazio: true }))
      .rejects.toBeInstanceOf(RelatorioVazioError)
    expect(saveBlob).not.toHaveBeenCalled()

    // Sem recusarVazio (os itens rápidos), baixa como sempre.
    apiFetch.mockResolvedValue(respostaCsv('"Nome"', { 'X-Export-Count': '0' }))
    expect(await downloadExport('registrations', {}, 'csv')).toBe(0)
    expect(saveBlob).toHaveBeenCalled()
  })

  it('os itens rápidos do menu continuam montando o PDF do CSV', async () => {
    apiFetch.mockResolvedValue(respostaCsv('"Nome"\r\n"ANA"', { 'Content-Disposition': 'attachment; filename="pessoas.csv"' }))
    await downloadExport('people', { ids: ['1'] }, 'pdf')
    expect(corpoEnviado()).toEqual({ ids: ['1'], pdfDoNavegador: true })
    expect(saveRelatorioPdf).toHaveBeenCalledWith('"Nome"\r\n"ANA"', 'Pessoas', 'pessoas.pdf', undefined)
    expect(relatorioJsonPdf).not.toHaveBeenCalled()
  })

  it('PDF do CSV acima do limite: as colunas pedidas vão para o desenho; sem nome no cabeçalho, o da fonte', async () => {
    apiFetch.mockResolvedValue(respostaCsv('"Nº";"Data"', { 'X-Export-Count': '2500' }))
    await downloadExport('finance-transactions', { search: 'coop' }, 'pdf', { colunasDoPdf: ['Nº', 'Data'] })
    expect(corpoEnviado()).toEqual({ search: 'coop', pdfDoNavegador: true })
    expect(saveRelatorioPdf).toHaveBeenCalledWith(
      '"Nº";"Data"', 'Lançamentos', expect.stringMatching(/^lancamentos-\d{4}-\d{2}-\d{2}\.pdf$/), ['Nº', 'Data'],
    )
  })

  it('Relatório de cadastros: o PDF do CSV leva pdfDoNavegador; a planilha CSV e a do Excel não', async () => {
    apiFetch.mockResolvedValue(respostaCsv('"Nome"', { 'X-Export-Count': '3' }))
    await downloadExport('cadastros', {}, 'pdf')
    expect(corpoEnviado()).toEqual({ pdfDoNavegador: true })
    expect(saveRelatorioPdf).toHaveBeenCalledTimes(1)

    apiFetch.mockClear()
    await downloadExport('cadastros', {}, 'csv')
    expect(corpoEnviado()).toEqual({})

    apiFetch.mockClear()
    await downloadExport('cadastros', {}, 'xlsx')
    expect(corpoEnviado()).toEqual({ format: 'xlsx' })
  })

  it('o PDF rápido da API (com fields) segue pedindo JSON, sem pdfDoNavegador', async () => {
    apiFetch.mockResolvedValue(respostaJson(JSON_PDF))
    await downloadExport('people', {}, 'pdf', { fields: ['name'], modelo: 'Resumo' })
    expect(corpoEnviado()).toEqual({ fields: ['name'], format: 'pdf', modelo: 'Resumo' })
  })
})

describe('ehLimiteDoPdf', () => {
  it('só o 400 do limite de linhas do PDF', () => {
    expect(ehLimiteDoPdf(new ApiError(400, 'O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.'))).toBe(true)
    expect(ehLimiteDoPdf(new ApiError(400, 'O relatório passa de 20.000 linhas. Use um filtro para diminuir.'))).toBe(false)
    expect(ehLimiteDoPdf(new ApiError(403, 'O PDF aceita até 2.000 linhas.'))).toBe(false)
    expect(ehLimiteDoPdf(new Error('O PDF aceita até 2.000 linhas.'))).toBe(false)
  })
})
