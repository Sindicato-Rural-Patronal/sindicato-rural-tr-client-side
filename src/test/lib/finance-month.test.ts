import { describe, it, expect } from 'vitest'
import { addMonths, currentMonth, monthLabel, nextMonthToGenerate } from '@/lib/finance-month'

const rec = (over: Partial<Parameters<typeof nextMonthToGenerate>[0]> = {}) => ({
  active: true,
  startMonth: '2026-01',
  endMonth: null,
  lastGeneratedMonth: null,
  ...over,
})

describe('meses do Financeiro', () => {
  it('rotula o mês em português abreviado', () => {
    expect(monthLabel('2026-01')).toBe('jan/26')
    expect(monthLabel('2026-09')).toBe('set/26')
    expect(monthLabel('2027-12')).toBe('dez/27')
  })

  it('soma meses virando o ano', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-05', 7)).toBe('2026-12')
  })

  it('mês atual sai como AAAA-MM', () => {
    expect(currentMonth(new Date(2026, 8, 18))).toBe('2026-09')
    expect(currentMonth(new Date(2026, 0, 1))).toBe('2026-01')
  })
})

describe('nextMonthToGenerate', () => {
  it('sem nada gerado, começa no primeiro mês', () => {
    expect(nextMonthToGenerate(rec())).toBe('2026-01')
  })

  it('retoma do mês seguinte ao último gerado', () => {
    expect(nextMonthToGenerate(rec({ lastGeneratedMonth: '2026-03' }))).toBe('2026-04')
  })

  it('nunca antes do primeiro mês', () => {
    expect(nextMonthToGenerate(rec({ startMonth: '2026-06', lastGeneratedMonth: '2026-01' })))
      .toBe('2026-06')
  })

  it('pausada não gera', () => {
    expect(nextMonthToGenerate(rec({ active: false }))).toBeNull()
  })

  it('passou do mês final: encerrada', () => {
    expect(nextMonthToGenerate(rec({ endMonth: '2026-03', lastGeneratedMonth: '2026-03' }))).toBeNull()
    expect(nextMonthToGenerate(rec({ endMonth: '2026-03', lastGeneratedMonth: '2026-02' }))).toBe('2026-03')
  })
})
