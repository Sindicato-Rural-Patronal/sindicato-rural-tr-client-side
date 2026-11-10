import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QuoteBoard } from '@/components/cotacoes/QuoteBoard'
import { boardDay, variationBasis } from '@/components/cotacoes/quote-variation'
import type { MarketQuote } from '@/hooks/useMarketQuotes'

function quote(over: Partial<MarketQuote>): MarketQuote {
  return {
    id: 'soja', label: 'SOJA', value: 'R$ 129,14 /sc 60kg', priceCents: 12914, unit: 'sc 60kg',
    period: 'AFTERNOON', morningCents: 12869, afternoonCents: 12914, variation: '+0,3%',
    referenceDate: '2026-11-10T00:00:00.000Z', isActive: true, order: 0,
    createdAt: '2026-11-05T19:41:38.473Z', updatedAt: '2026-11-10T18:32:20.402Z',
    ...over,
  }
}

// Intl coloca espaço não separável entre "R$" e o número.
const normalize = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim()

describe('variationBasis (com o que a variação compara)', () => {
  it('preço da tarde com a manhã lançada: compara com a manhã', () => {
    expect(variationBasis({ period: 'AFTERNOON', morningCents: 12869 }).short).toBe('vs manhã')
  })

  it('preço da manhã: o anterior pode ser de outro dia, e a API não diz qual', () => {
    expect(variationBasis({ period: 'MORNING', morningCents: 12869 }).short).toBe('vs anterior')
  })

  it('tarde sem manhã lançada no dia: também é o lançamento anterior', () => {
    expect(variationBasis({ period: 'AFTERNOON', morningCents: null }).short).toBe('vs anterior')
  })
})

describe('boardDay', () => {
  it('usa o dia de referência mais recente, com o dia da semana', () => {
    expect(boardDay([
      { referenceDate: '2026-11-09T00:00:00.000Z' },
      { referenceDate: '2026-11-10T00:00:00.000Z' },
      { referenceDate: null },
    ])).toEqual({ weekday: 'terça-feira', date: '10/11/2026' })
  })

  it('sem nenhuma data devolve null', () => {
    expect(boardDay([{ referenceDate: null }])).toBeNull()
  })
})

describe('QuoteBoard', () => {
  it('mostra produto, unidade, manhã, tarde e a variação dizendo com o que compara', () => {
    render(<QuoteBoard quotes={[quote({})]} source="Cvale" />)
    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Manhã' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Tarde' })).toBeInTheDocument()

    const row = within(table).getAllByRole('row')[1]
    expect(within(row).getByRole('rowheader')).toHaveTextContent('Soja')
    expect(within(row).getByRole('rowheader')).toHaveTextContent('sc 60kg')
    const cells = within(row).getAllByRole('cell').map(c => normalize(c.textContent))
    expect(cells[0]).toBe('R$ 128,69')
    expect(cells[1]).toBe('R$ 129,14')
    expect(cells[2]).toContain('+0,3%')
    expect(cells[2]).toContain('vs manhã')

    expect(screen.getByText('Fonte: Cvale')).toBeInTheDocument()
    expect(screen.getByText('10/11/2026')).toBeInTheDocument()
  })

  it('período sem lançamento mostra "—", não R$ 0,00', () => {
    render(<QuoteBoard quotes={[quote({ period: 'MORNING', afternoonCents: null, variation: '-0,2%' })]} />)
    const row = screen.getAllByRole('row')[1]
    const cells = within(row).getAllByRole('cell').map(c => normalize(c.textContent))
    expect(cells[1]).toBe('—')
    expect(cells[2]).toContain('-0,2%')
    expect(cells[2]).toContain('vs anterior')
  })

  it('lançamento antigo, sem manhã nem tarde: o preço atual vai na coluna do período', () => {
    render(<QuoteBoard quotes={[quote({ morningCents: null, afternoonCents: null, period: 'MORNING', priceCents: 6000 })]} />)
    const row = screen.getAllByRole('row')[1]
    const cells = within(row).getAllByRole('cell').map(c => normalize(c.textContent))
    expect(cells[0]).toBe('R$ 60,00')
    expect(cells[1]).toBe('—')
  })

  it('sem fonte cadastrada, não mostra "Fonte:"', () => {
    render(<QuoteBoard quotes={[quote({})]} />)
    expect(screen.queryByText(/Fonte:/)).not.toBeInTheDocument()
  })
})
