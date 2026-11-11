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

const { downloadExport, reportBody, lerRelatorioJson } = await import('@/lib/export')

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
  it('sem fields, é o corpo de hoje (sem format nem modelo)', () => {
    expect(reportBody({ search: 'ana', ids: [] }, 'pdf')).toEqual({ search: 'ana' })
  })

  it('com fields, manda as chaves na ordem, o formato e o modelo', () => {
    expect(reportBody({ ids: ['a'] }, 'csv', { fields: ['cpf', 'name'], modelo: 'Nome e CPF' }))
      .toEqual({ ids: ['a'], fields: ['cpf', 'name'], format: 'csv', modelo: 'Nome e CPF' })
  })

  it('"Só confirmadas" vai como booleano; desligado não vai', () => {
    expect(reportBody({ courseIds: ['c1'] }, 'pdf', { fields: ['name'], confirmed: true }))
      .toEqual({ courseIds: ['c1'], fields: ['name'], format: 'pdf', confirmed: true })
    expect(reportBody({}, 'csv', { fields: ['name'], confirmed: false })).not.toHaveProperty('confirmed')
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

  it('Imprimir: o PDF vai para a aba aberta no clique, sem baixar', async () => {
    apiFetch.mockResolvedValue(respostaJson(JSON_PDF))
    const aba = { closed: false, location: { href: '' } } as unknown as Window

    await downloadExport('people', {}, 'pdf', { fields: ['name'], print: true, printWindow: aba })

    expect(aba.location.href).toBe('blob:relatorio')
    expect(saveBlob).not.toHaveBeenCalled()
  })

  it('Imprimir sem aba (bloqueada): tenta abrir e, se não der, baixa', async () => {
    apiFetch.mockResolvedValue(respostaJson(JSON_PDF))
    const open = vi.spyOn(window, 'open').mockReturnValue(null)

    await downloadExport('people', {}, 'pdf', { fields: ['name'], print: true, printWindow: null })

    expect(open).toHaveBeenCalledWith('blob:relatorio', '_blank')
    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'pessoas-2026-11-11.pdf')
    open.mockRestore()
  })

  it('os itens rápidos do menu continuam montando o PDF do CSV', async () => {
    apiFetch.mockResolvedValue(respostaCsv('"Nome"\r\n"ANA"', { 'Content-Disposition': 'attachment; filename="pessoas.csv"' }))
    await downloadExport('people', { ids: ['1'] }, 'pdf')
    expect(corpoEnviado()).toEqual({ ids: ['1'] })
    expect(saveRelatorioPdf).toHaveBeenCalledWith('"Nome"\r\n"ANA"', 'Pessoas', 'pessoas.pdf')
    expect(relatorioJsonPdf).not.toHaveBeenCalled()
  })
})
