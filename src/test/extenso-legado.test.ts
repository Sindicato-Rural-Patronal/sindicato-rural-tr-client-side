import { describe, it, expect } from 'vitest'
import { valorPorExtensoLegado } from '@/lib/extenso-legado'

describe('valorPorExtensoLegado (nota de empenho)', () => {
  it('reproduz o texto da nota do legado', () => {
    expect(valorPorExtensoLegado(104277)).toBe('UM MIL QUARENTA E DOIS REAIS E SETENTA E SETE CENTAVOS')
  })

  it('milhar e real no singular', () => {
    expect(valorPorExtensoLegado(100000)).toBe('UM MIL REAIS')
    expect(valorPorExtensoLegado(100)).toBe('UM REAL')
  })

  it('só centavos', () => {
    expect(valorPorExtensoLegado(50)).toBe('CINQUENTA CENTAVOS')
    expect(valorPorExtensoLegado(1)).toBe('UM CENTAVO')
  })

  it('centenas e milhares com "e"', () => {
    expect(valorPorExtensoLegado(15000)).toBe('CENTO E CINQUENTA REAIS')
    expect(valorPorExtensoLegado(10000)).toBe('CEM REAIS')
    expect(valorPorExtensoLegado(250000)).toBe('DOIS MIL E QUINHENTOS REAIS')
    expect(valorPorExtensoLegado(1700)).toBe('DEZESSETE REAIS')
  })

  it('milhão', () => {
    expect(valorPorExtensoLegado(100000000)).toBe('UM MILHÃO DE REAIS')
    expect(valorPorExtensoLegado(123456789)).toBe(
      'UM MILHÃO DUZENTOS E TRINTA E QUATRO MIL QUINHENTOS E SESSENTA E SETE REAIS E OITENTA E NOVE CENTAVOS',
    )
  })

  it('zero', () => {
    expect(valorPorExtensoLegado(0)).toBe('ZERO')
  })
})
