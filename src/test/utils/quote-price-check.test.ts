import { describe, it, expect } from 'vitest'
import { findQuoteDeviations, formatQuoteChange, quotePriceChange } from '@/lib/quote-price-check'

const item = (lastCents: number | null, newCents: number, id = 'soja') => ({ id, label: 'Soja', lastCents, newCents })

describe('quotePriceChange', () => {
  it('calcula a variação relativa', () => {
    expect(quotePriceChange(10000, 12500)).toBe(0.25)
    expect(quotePriceChange(10000, 5000)).toBe(-0.5)
  })

  it('sem preço anterior → null', () => {
    expect(quotePriceChange(null, 12500)).toBeNull()
    expect(quotePriceChange(undefined, 12500)).toBeNull()
    expect(quotePriceChange(0, 12500)).toBeNull()
  })
})

describe('findQuoteDeviations', () => {
  it('pega o erro de digitação (vírgula no lugar errado)', () => {
    const r = findQuoteDeviations([item(12500, 125000)])
    expect(r).toEqual([{ id: 'soja', label: 'Soja', lastCents: 12500, newCents: 125000, change: 9 }])
  })

  it('pega queda grande também', () => {
    expect(findQuoteDeviations([item(12500, 1250)])).toHaveLength(1)
  })

  it('até 20% (para mais ou para menos) passa sem confirmação', () => {
    expect(findQuoteDeviations([item(10000, 12000), item(10000, 8000, 'milho'), item(12500, 15000, 'trigo')])).toEqual([])
  })

  it('logo acima de 20% pede confirmação', () => {
    expect(findQuoteDeviations([item(10000, 12001)])).toHaveLength(1)
    expect(findQuoteDeviations([item(10000, 7999)])).toHaveLength(1)
  })

  it('produto sem lançamento anterior não é conferido', () => {
    expect(findQuoteDeviations([item(null, 999999)])).toEqual([])
  })

  it('só devolve os produtos fora do limite, na ordem recebida', () => {
    const r = findQuoteDeviations([item(10000, 30000, 'a'), item(10000, 10100, 'b'), item(10000, 100, 'c')])
    expect(r.map(d => d.id)).toEqual(['a', 'c'])
  })

  it('aceita outro limite', () => {
    expect(findQuoteDeviations([item(10000, 11000)], 5)).toHaveLength(1)
  })
})

describe('formatQuoteChange', () => {
  it('formata com sinal e vírgula', () => {
    expect(formatQuoteChange(0.253)).toBe('+25,3%')
    expect(formatQuoteChange(-0.5)).toBe('-50%')
    expect(formatQuoteChange(9)).toBe('+900%')
  })
})
