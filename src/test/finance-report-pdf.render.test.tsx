// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { FinanceReportDocument } from '@/lib/finance-report-pdf'
import type { FinanceSummary } from '@/hooks/useFinance'

// Relatório Financeiro da aba Visão geral (SR-132): "Entradas por categoria"
// antes de "Saídas por categoria", com o aviso de vazio em cada uma.

type Pdf = Awaited<ReturnType<typeof renderToBuffer>>

const latin1 = (bytes: Uint8Array) => Array.from(bytes, b => String.fromCharCode(b)).join('')

async function textoDoPdf(buf: Pdf): Promise<string> {
  const bruto = buf.toString('latin1')
  const trechos: string[] = []
  for (const m of bruto.matchAll(/\/Length (\d+)[^]*?>>\s*stream\r?\n/g)) {
    const inicio = m.index + m[0].length
    const comprimido = new Uint8Array(buf.subarray(inicio, inicio + Number(m[1])))
    let conteudo: string
    try {
      const fluxo = new Blob([comprimido]).stream().pipeThrough(new DecompressionStream('deflate'))
      conteudo = latin1(new Uint8Array(await new Response(fluxo).arrayBuffer()))
    } catch {
      continue
    }
    for (const tj of conteudo.matchAll(/\[(.*?)\] TJ/g)) {
      const hex = [...tj[1].matchAll(/<([0-9a-f]*)>/g)].map(h => h[1]).join('')
      trechos.push((hex.match(/../g) ?? []).map(h => String.fromCharCode(parseInt(h, 16))).join(''))
    }
  }
  return trechos.join('|')
}

function resumo(byCategory: FinanceSummary['byCategory']): FinanceSummary {
  return {
    balanceAllTimeCents: 100000, periodInCents: 50000, periodOutCents: 20000, periodResultCents: 30000,
    byCategory, byMonth: [], byAccount: [],
  }
}

const render = (s: FinanceSummary) =>
  renderToBuffer(<FinanceReportDocument summary={s} transactions={[]} range={{ from: '2026-11-01', to: '2026-11-30' }} />)

describe('Relatório Financeiro: categorias', () => {
  it('lista entradas e saídas, as entradas antes', async () => {
    const texto = await textoDoPdf(await render(resumo([
      { categoryId: 'a', name: 'MENSALIDADES', color: '#000', type: 'IN', totalCents: 50000 },
      { categoryId: 'b', name: 'ENERGIA', color: '#000', type: 'OUT', totalCents: 20000 },
    ])))
    const entradas = texto.indexOf('Entradas por categoria')
    const saidas = texto.indexOf('Saídas por categoria')
    expect(entradas).toBeGreaterThan(-1)
    expect(saidas).toBeGreaterThan(entradas)
    expect(texto.indexOf('MENSALIDADES')).toBeGreaterThan(entradas)
    expect(texto.indexOf('MENSALIDADES')).toBeLessThan(saidas)
    expect(texto.indexOf('ENERGIA')).toBeGreaterThan(saidas)
    expect(texto).not.toContain('Sem entradas no per')
  })

  it('sem entradas ou sem saídas, diz que não há', async () => {
    const semEntradas = await textoDoPdf(await render(resumo([
      { categoryId: 'b', name: 'ENERGIA', color: '#000', type: 'OUT', totalCents: 20000 },
    ])))
    expect(semEntradas).toContain('Sem entradas no período.')
    expect(semEntradas).not.toContain('Sem saídas no per')
    const vazio = await textoDoPdf(await render(resumo([])))
    expect(vazio).toContain('Sem entradas no período.')
    expect(vazio).toContain('Sem saídas no período.')
  })
})
