// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import '@/i18n'
import { apiErrorMessage } from '@/lib/api-error-message'
import { ApiError } from '@/lib/api'

describe('apiErrorMessage', () => {
  it('traduz mensagem conhecida do backend pra pt-BR', () => {
    expect(apiErrorMessage(new ApiError(404, 'Course not found'))).toBe('Curso não encontrado.')
    expect(apiErrorMessage(new Error('Invalid username or password'))).toBe('Usuário ou senha inválidos.')
    expect(apiErrorMessage(new ApiError(409, 'CPF already in use'))).toBe('CPF já cadastrado.')
  })

  it('aceita string crua', () => {
    expect(apiErrorMessage('User not found')).toBe('Usuário não encontrado.')
  })

  it('"HTTP nnn" vira mensagem genérica traduzida', () => {
    expect(apiErrorMessage(new Error('HTTP 500'))).toBe('Ocorreu um erro inesperado. Tente novamente.')
  })

  it('mensagem desconhecida passa como veio; vazio usa fallback', () => {
    expect(apiErrorMessage(new Error('Mensagem exótica'))).toBe('Mensagem exótica')
    expect(apiErrorMessage(null, 'fallback local')).toBe('fallback local')
  })
})
