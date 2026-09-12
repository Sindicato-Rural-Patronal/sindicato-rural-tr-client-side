import { describe, it, expect } from 'vitest'
import { valorPorExtenso } from '@/utils/extenso'

describe('valorPorExtenso', () => {
  it('reproduz o valor da nota de empenho', () => {
    expect(valorPorExtenso(23000)).toBe('DUZENTOS E TRINTA REAIS')
  })

  it('singular de real', () => {
    expect(valorPorExtenso(100)).toBe('UM REAL')
  })

  it('centavos', () => {
    expect(valorPorExtenso(1)).toBe('UM CENTAVO')
    expect(valorPorExtenso(199)).toBe('UM REAL E NOVENTA E NOVE CENTAVOS')
  })

  it('milhares', () => {
    expect(valorPorExtenso(100000)).toBe('MIL REAIS')
    expect(valorPorExtenso(150000)).toBe('MIL E QUINHENTOS REAIS')
  })

  it('cem exato', () => {
    expect(valorPorExtenso(10000)).toBe('CEM REAIS')
  })

  it('zero', () => {
    expect(valorPorExtenso(0)).toBe('ZERO REAIS')
  })

  it('reais + centavos juntos', () => {
    expect(valorPorExtenso(123456)).toContain('CINQUENTA E SEIS CENTAVOS')
  })
})
