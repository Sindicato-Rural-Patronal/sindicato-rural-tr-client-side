// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import {
  RelatorioJsonDocument, largurasDasColunas, layoutDoPdf, linhaDoModeloEFiltros,
} from '@/lib/relatorio-pdf'
import type { RelatorioJson } from '@/lib/export'

// PDF do montador (decisão 006): desenhado do JSON da API, só com as colunas
// escolhidas. Em pé até 5 colunas, deitado com mais; letra 8/7/6 pt.

function relatorio(colunas: number, linhas: number, over: Partial<RelatorioJson> = {}): RelatorioJson {
  const columns = Array.from({ length: colunas }, (_, i) => ({ key: `c${i}`, label: `Coluna ${i + 1}`, type: 'text' }))
  return {
    title: 'Pessoas',
    filename: 'pessoas.pdf',
    count: linhas,
    filters: 'Busca: silva',
    modelo: 'Nome e CPF',
    columns,
    rows: Array.from({ length: linhas }, (_, n) => columns.map((_, i) => `PESSOA ${n} · ${i}`)),
    ...over,
  }
}

type Pdf = Awaited<ReturnType<typeof renderToBuffer>>

/** Orientação da primeira página: /MediaBox [0 0 largura altura]. */
function primeiraPagina(buf: Pdf): { largura: number; altura: number } {
  const m = buf.toString('latin1').match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/)
  return { largura: Number(m?.[1]), altura: Number(m?.[2]) }
}

function paginas(buf: Pdf): number {
  return Number(buf.toString('latin1').match(/\/Count\s+(\d+)/)?.[1])
}

describe('layoutDoPdf', () => {
  it('até 5 colunas em pé; com mais, deitado', () => {
    expect(layoutDoPdf(1).orientation).toBe('portrait')
    expect(layoutDoPdf(5).orientation).toBe('portrait')
    expect(layoutDoPdf(6).orientation).toBe('landscape')
  })

  it('letra de 8 pt até 8 colunas, 7 até 12 e 6 acima', () => {
    expect(layoutDoPdf(8).fontSize).toBe(8)
    expect(layoutDoPdf(9).fontSize).toBe(7)
    expect(layoutDoPdf(12).fontSize).toBe(7)
    expect(layoutDoPdf(13).fontSize).toBe(6)
  })
})

describe('larguras e cabeçalho', () => {
  it('usa o weight da coluna e, sem ele, o peso do tipo', () => {
    expect(largurasDasColunas([
      { key: 'a', label: 'Nome', type: 'text', weight: 3 },
      { key: 'b', label: 'CPF', type: 'text', weight: 1 },
    ])).toEqual(['75%', '25%'])
    const [nome, assinatura] = largurasDasColunas([
      { key: 'a', label: 'Nome', type: 'text' },
      { key: 'b', label: 'Assinatura', type: 'blank' },
    ]).map(parseFloat)
    expect(assinatura).toBeGreaterThan(nome)
  })

  it('a linha do modelo e dos filtros só aparece com algum dos dois', () => {
    expect(linhaDoModeloEFiltros({ modelo: 'Nome e CPF', filters: 'Busca: silva' }))
      .toBe('Modelo: Nome e CPF · Filtros: Busca: silva')
    expect(linhaDoModeloEFiltros({ modelo: null, filters: null })).toBeNull()
    expect(linhaDoModeloEFiltros({ modelo: null, filters: 'Seleção: 8 registros' })).toBe('Seleção: 8 registros')
  })
})

describe('relatório em PDF do JSON', { timeout: 30_000 }, () => {
  it('2 colunas: PDF válido, A4 em pé', async () => {
    const buf = await renderToBuffer(<RelatorioJsonDocument data={relatorio(2, 3)} geradoEm="11/11/2026 10:00" />)
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
    const { largura, altura } = primeiraPagina(buf)
    expect(altura).toBeGreaterThan(largura)
  })

  it('9 colunas: A4 deitado', async () => {
    const buf = await renderToBuffer(<RelatorioJsonDocument data={relatorio(9, 3)} geradoEm="11/11/2026 10:00" />)
    const { largura, altura } = primeiraPagina(buf)
    expect(largura).toBeGreaterThan(altura)
  })

  it('lista longa continua nas páginas seguintes', async () => {
    const buf = await renderToBuffer(<RelatorioJsonDocument data={relatorio(3, 150)} geradoEm="11/11/2026 10:00" />)
    expect(paginas(buf)).toBeGreaterThan(1)
  })

  it('sem linhas, sem modelo e com coluna de assinatura não quebra', async () => {
    const vazio = await renderToBuffer(
      <RelatorioJsonDocument data={relatorio(2, 0, { modelo: null, filters: null })} geradoEm="11/11/2026 10:00" />,
    )
    expect(vazio.subarray(0, 4).toString()).toBe('%PDF')
    const presenca = relatorio(3, 5, {
      columns: [
        { key: 'ordem', label: 'Nº', type: 'number' },
        { key: 'name', label: 'Nome', type: 'text' },
        { key: 'signature', label: 'Assinatura', type: 'blank' },
      ],
      rows: Array.from({ length: 5 }, (_, i) => [String(i + 1), `PESSOA ${i}`, '']),
    })
    const buf = await renderToBuffer(<RelatorioJsonDocument data={presenca} geradoEm="11/11/2026 10:00" />)
    expect(paginas(buf)).toBe(1)
  })
})
