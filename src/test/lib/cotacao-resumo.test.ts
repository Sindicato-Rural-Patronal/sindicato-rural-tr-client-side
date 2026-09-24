import { describe, it, expect } from 'vitest'
import { diaDaCotacao, resumoDaCotacao } from '@/lib/cotacao-resumo'
import type { MarketQuote } from '@/hooks/useMarketQuotes'

function cot(over: Partial<MarketQuote> = {}): MarketQuote {
  return {
    id: Math.random().toString(36).slice(2),
    label: 'SOJA',
    value: 'R$ 140,00 /sc 60kg',
    priceCents: 14000,
    unit: 'sc 60kg',
    period: 'AFTERNOON',
    morningCents: 12000,
    afternoonCents: 14000,
    variation: '+16,7%',
    referenceDate: '2026-09-17T00:00:00.000Z',
    isActive: true,
    order: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-17T00:00:00.000Z',
    ...over,
  } as MarketQuote
}

describe('diaDaCotacao', () => {
  it('pega o dia mais recente entre os produtos', () => {
    expect(diaDaCotacao([
      cot({ referenceDate: '2026-09-16T00:00:00.000Z' }),
      cot({ referenceDate: '2026-09-17T00:00:00.000Z' }),
    ])).toBe('17/09/2026')
  })

  it('sem data lançada, não inventa dia', () => {
    expect(diaDaCotacao([cot({ referenceDate: null })])).toBeNull()
    expect(diaDaCotacao([])).toBeNull()
  })
})

describe('resumoDaCotacao', () => {
  it('uma linha curta, com o preço que vale agora', () => {
    // A prévia do link corta: vale o último período lançado.
    expect(resumoDaCotacao([cot(), cot({ label: 'MILHO', afternoonCents: 5800 })]))
      .toBe('Soja R$ 140,00 · Milho R$ 58,00')
  })

  it('produto sem preço fica de fora', () => {
    const semPreco = cot({ label: 'TRIGO', morningCents: null, afternoonCents: null, priceCents: null })
    expect(resumoDaCotacao([cot(), semPreco])).toBe('Soja R$ 140,00')
  })
})
