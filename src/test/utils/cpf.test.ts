import { describe, it, expect } from 'vitest'
import { cpfDigits, isValidCpf, sameCpf } from '@/utils/cpf'

describe('isValidCpf', () => {
  it('aceita CPF válido com ou sem pontuação', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('52998224725')).toBe(true)
    expect(isValidCpf('111.444.777-35')).toBe(true)
  })

  it('rejeita dígito errado, tamanho errado, repetidos e vazio', () => {
    expect(isValidCpf('529.982.247-26')).toBe(false)
    expect(isValidCpf('5299822472')).toBe(false)
    expect(isValidCpf('529982247250')).toBe(false)
    expect(isValidCpf('111.111.111-11')).toBe(false)
    expect(isValidCpf('')).toBe(false)
    expect(isValidCpf(null)).toBe(false)
  })
})

describe('cpfDigits / sameCpf', () => {
  it('compara só os dígitos', () => {
    expect(cpfDigits('529.982.247-25')).toBe('52998224725')
    expect(sameCpf('529.982.247-25', '52998224725')).toBe(true)
    expect(sameCpf('52998224725', '11144477735')).toBe(false)
  })

  it('vazio nunca é o mesmo CPF', () => {
    expect(sameCpf('', '')).toBe(false)
    expect(sameCpf(null, undefined)).toBe(false)
  })
})
