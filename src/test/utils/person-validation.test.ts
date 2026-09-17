import { describe, it, expect } from 'vitest'
import { firstInvalidField, validatePersonFields } from '@/lib/person-validation'

describe('validatePersonFields', () => {
  it('cadastro completo e válido não tem erro', () => {
    expect(validatePersonFields({
      name: 'JOAO DA SILVA',
      email: 'joao@example.com',
      phone: '(44) 99999-0001',
      phone2: '',
      phone3: '(44) 3333-4444',
      cpf: '529.982.247-25',
      rg: '12.345.678-9',
      driverLicense: '',
    })).toEqual({})
  })

  it('nome, e-mail, telefone e CPF são obrigatórios', () => {
    const errors = validatePersonFields({ name: '  ', email: '', phone: '', cpf: '' })
    expect(Object.keys(errors).sort()).toEqual(['cpf', 'email', 'name', 'phone'])
  })

  it('confere formato de e-mail, telefones, CPF, RG e CNH', () => {
    const errors = validatePersonFields({
      email: 'joao@',
      phone: '(44) 9999',
      phone2: '123',
      cpf: '529.982.247-26',
      rg: '123456',
      driverLicense: '11111111111',
    })
    expect(Object.keys(errors).sort()).toEqual(['cpf', 'driverLicense', 'email', 'phone', 'phone2', 'rg'])
    expect(validatePersonFields({ rg: '123456789' })).toEqual({})
    expect(validatePersonFields({ rg: '1234567890' }).rg).toBeTruthy()
    expect(validatePersonFields({ driverLicense: '12345678901' })).toEqual({})
  })

  it('só valida os campos informados', () => {
    expect(validatePersonFields({ rg: '12.345.678-9' })).toEqual({})
    expect(validatePersonFields({})).toEqual({})
  })
})

describe('firstInvalidField', () => {
  it('segue a ordem da tela', () => {
    const errors = { email: 'x', cpf: 'y' }
    expect(firstInvalidField(errors, ['cpf', 'name', 'email'])).toBe('cpf')
    expect(firstInvalidField(errors, ['name', 'email', 'cpf'])).toBe('email')
    expect(firstInvalidField({}, ['name'])).toBeNull()
  })
})
