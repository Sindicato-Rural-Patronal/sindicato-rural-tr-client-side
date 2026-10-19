import { describe, it, expect } from 'vitest'
import { ApiError } from '@/lib/api'
import {
  isAlreadyRegistered, isCannotConfirmRegistration, phoneEndOf, registrationErrorMessage,
} from '@/lib/registration-errors'
import '@/i18n'

describe('registrationErrorMessage', () => {
  it('429 do CPF mostra o texto do servidor, não o genérico do login', () => {
    const e = new ApiError(429, 'Muitas tentativas com este CPF. Aguarde uma hora ou procure o Sindicato.')
    expect(registrationErrorMessage(e, 'x')).toBe('Muitas tentativas com este CPF. Aguarde uma hora ou procure o Sindicato.')
  })

  it('429 sem mensagem própria cai no texto traduzido', () => {
    expect(registrationErrorMessage(new ApiError(429, 'HTTP 429'), 'x')).toMatch(/Muitas tentativas/)
    expect(registrationErrorMessage(new ApiError(429, 'Too Many Requests'), 'x')).toMatch(/Muitas tentativas/)
  })

  it('404 e 409 em português passam como vieram', () => {
    expect(registrationErrorMessage(new ApiError(404, 'Não encontramos cadastro com este CPF e telefone.'), 'x'))
      .toBe('Não encontramos cadastro com este CPF e telefone.')
  })

  it('erro de rede usa o fallback', () => {
    expect(registrationErrorMessage(new Error(''), 'Erro ao realizar inscrição.')).toBe('Erro ao realizar inscrição.')
  })
})

describe('classificação dos 409', () => {
  const sindicato = new ApiError(409, 'Não foi possível confirmar seu cadastro pelo site. Procure o Sindicato para fazer a inscrição.')
  const repetida = new ApiError(409, 'User already registered for this course')

  it('separa "Procure o Sindicato" de "já inscrito"', () => {
    expect(isCannotConfirmRegistration(sindicato)).toBe(true)
    expect(isAlreadyRegistered(sindicato)).toBe(false)
    expect(isAlreadyRegistered(repetida)).toBe(true)
    expect(isCannotConfirmRegistration(repetida)).toBe(false)
  })

  it('só vale para 409', () => {
    expect(isCannotConfirmRegistration(new ApiError(400, sindicato.message))).toBe(false)
    expect(isCannotConfirmRegistration(new Error(sindicato.message))).toBe(false)
  })
})

describe('phoneEndOf', () => {
  it('fica só com números, no máximo 4', () => {
    expect(phoneEndOf('(44) 9')).toBe('449')
    expect(phoneEndOf('12345678')).toBe('1234')
    expect(phoneEndOf('abc')).toBe('')
  })
})
