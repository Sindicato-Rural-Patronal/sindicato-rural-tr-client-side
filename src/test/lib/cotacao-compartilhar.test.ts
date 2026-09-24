import { describe, it, expect } from 'vitest'
import {
  diaDaCotacao, linhaDoProduto, resumoDaCotacao, textoDaCotacao, whatsappDaCotacao,
} from '@/lib/cotacao-compartilhar'
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

describe('linhaDoProduto', () => {
  it('traz os dois períodos e a unidade', () => {
    expect(linhaDoProduto(cot())).toBe('Soja (sc 60kg): manhã R$ 120,00 · tarde R$ 140,00')
  })

  it('só um período lançado, só ele aparece', () => {
    expect(linhaDoProduto(cot({ morningCents: null })))
      .toBe('Soja (sc 60kg): tarde R$ 140,00')
  })

  it('lançamento antigo, sem os dois períodos, cai no preço atual', () => {
    expect(linhaDoProduto(cot({ morningCents: null, afternoonCents: null })))
      .toBe('Soja (sc 60kg): R$ 140,00')
  })

  it('produto sem unidade (dólar) não ganha parênteses vazio', () => {
    const dolar = cot({ label: 'DOLAR', unit: null, morningCents: 518, afternoonCents: null })
    expect(linhaDoProduto(dolar)).toBe('Dólar: manhã R$ 5,18')
  })
})

describe('textoDaCotacao', () => {
  const quotes = [
    cot(),
    cot({ label: 'MILHO', unit: 'sc 60kg', morningCents: 6000, afternoonCents: 5800 }),
  ]

  it('abre com o dia e o nome do sindicato', () => {
    const linhas = textoDaCotacao(quotes).split('\n')
    expect(linhas[0]).toBe('Cotações do dia 17/09/2026')
    expect(linhas[1]).toBe('Sindicato Rural de Terra Roxa')
  })

  it('tem uma linha por produto', () => {
    const texto = textoDaCotacao(quotes)
    expect(texto).toContain('Soja (sc 60kg): manhã R$ 120,00 · tarde R$ 140,00')
    expect(texto).toContain('Milho (sc 60kg): manhã R$ 60,00 · tarde R$ 58,00')
  })

  it('fonte e link entram só quando existem', () => {
    expect(textoDaCotacao(quotes)).not.toContain('Fonte:')
    const completo = textoDaCotacao(quotes, { fonte: 'CEPEA', link: 'https://x.com/cotacao' })
    expect(completo).toContain('Fonte: CEPEA')
    expect(completo.trimEnd().endsWith('https://x.com/cotacao')).toBe(true)
  })

  it('sem asterisco nem emoji', () => {
    // O WhatsApp formata *assim*, mas o mesmo texto vai para SMS e e-mail,
    // onde os asteriscos apareceriam crus.
    const texto = textoDaCotacao(quotes, { fonte: 'CEPEA' })
    expect(texto).not.toMatch(/[*_~`]/)
  })
})

describe('whatsappDaCotacao', () => {
  it('monta o link com o texto escapado', () => {
    const url = whatsappDaCotacao('Soja R$ 140,00\nMilho R$ 58,00')
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(url.split('text=')[1])).toBe('Soja R$ 140,00\nMilho R$ 58,00')
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
