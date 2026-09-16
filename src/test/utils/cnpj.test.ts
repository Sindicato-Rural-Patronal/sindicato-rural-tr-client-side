import { describe, it, expect } from 'vitest'
import { isValidCnpj } from '@/utils/cnpj'
import { maskCNPJ } from '@/utils/masks'

describe('maskCNPJ', () => {
  it('formata progressivamente', () => {
    expect(maskCNPJ('11')).toBe('11')
    expect(maskCNPJ('11222')).toBe('11.222')
    expect(maskCNPJ('11222333')).toBe('11.222.333')
    expect(maskCNPJ('112223330001')).toBe('11.222.333/0001')
    expect(maskCNPJ('11222333000181')).toBe('11.222.333/0001-81')
  })
  it('ignora não-dígitos e corta em 14', () => {
    expect(maskCNPJ('11.222.333/0001-81999')).toBe('11.222.333/0001-81')
    expect(maskCNPJ('ab11c222')).toBe('11.222')
  })
})

describe('isValidCnpj', () => {
  it('aceita CNPJ válido com ou sem pontuação', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true)
    expect(isValidCnpj('45723174000110')).toBe(true)
  })
  it('rejeita dígito errado, tamanho errado e repetidos', () => {
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false)
    expect(isValidCnpj('1122233300018')).toBe(false)
    expect(isValidCnpj('11111111111111')).toBe(false)
    expect(isValidCnpj('')).toBe(false)
  })
})
