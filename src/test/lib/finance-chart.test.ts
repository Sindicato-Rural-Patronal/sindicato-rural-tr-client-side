import { describe, it, expect } from 'vitest'
import { axisLabel, monthLabel, monthLong, niceScale } from '@/lib/finance-chart'

// Contas do gráfico de entradas × saídas do Financeiro (SR-081). Valores em centavos.

describe('niceScale: topo e passo redondos', () => {
  it('o maior mês de R$ 34.500 vira uma escala até R$ 40.000, de 10 em 10 mil', () => {
    expect(niceScale(3_450_000)).toEqual({ top: 4_000_000, step: 1_000_000 })
  })

  it('o passo é 1, 2, 2,5 ou 5 vezes uma potência de 10', () => {
    expect(niceScale(700_000)).toEqual({ top: 800_000, step: 200_000 })
    expect(niceScale(950_000)).toEqual({ top: 1_000_000, step: 250_000 })
    expect(niceScale(1_800_000)).toEqual({ top: 2_000_000, step: 500_000 })
  })

  it('o topo nunca fica abaixo do maior valor', () => {
    for (const max of [1, 99, 12_345, 3_999_999, 123_456_789]) {
      const { top, step } = niceScale(max)
      expect(top).toBeGreaterThanOrEqual(max)
      expect(top / step).toBeLessThanOrEqual(5)
    }
  })

  it('sem valor nenhum (período só com zeros) ainda desenha a grade', () => {
    expect(niceScale(0)).toEqual({ top: 40_000, step: 10_000 })
  })
})

describe('rótulos', () => {
  it('eixo em reais, curto', () => {
    // O Intl põe espaço que não quebra entre o número e o "mil".
    const rotulo = (cents: number) => axisLabel(cents).replace(/\s/g, ' ')
    expect(rotulo(0)).toBe('0')
    expect(rotulo(3_000_000)).toBe('30 mil')
    expect(rotulo(150_000_000)).toBe('1,5 mi')
  })

  it('mês curto e por extenso', () => {
    expect(monthLabel('2026-06')).toBe('jun/26')
    expect(monthLong('2026-11')).toBe('Novembro de 2026')
    expect(monthLong('2026-03')).toBe('Março de 2026')
  })
})
