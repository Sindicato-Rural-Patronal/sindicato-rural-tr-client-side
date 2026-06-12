import { describe, it, expect } from 'vitest'
import { maskCPF, maskPhone } from '@/utils/masks'

describe('maskCPF', () => {
  it('formata CPF completo', () => {
    expect(maskCPF('12345678901')).toBe('123.456.789-01')
  })

  it('formata CPF parcial', () => {
    expect(maskCPF('123456')).toBe('123.456')
  })

  it('ignora caracteres não numéricos', () => {
    expect(maskCPF('123.456.789-01')).toBe('123.456.789-01')
  })

  it('retorna string vazia para input vazio', () => {
    expect(maskCPF('')).toBe('')
  })

  it('trunca em 11 dígitos', () => {
    expect(maskCPF('123456789012345')).toBe('123.456.789-01')
  })
})

describe('maskPhone', () => {
  it('formata celular com 11 dígitos', () => {
    expect(maskPhone('11987654321')).toBe('(11) 98765-4321')
  })

  it('formata telefone fixo com 10 dígitos', () => {
    expect(maskPhone('1134567890')).toBe('(11) 3456-7890')
  })

  it('ignora caracteres não numéricos', () => {
    expect(maskPhone('(11) 98765-4321')).toBe('(11) 98765-4321')
  })

  it('retorna string vazia para input vazio', () => {
    expect(maskPhone('')).toBe('')
  })
})
