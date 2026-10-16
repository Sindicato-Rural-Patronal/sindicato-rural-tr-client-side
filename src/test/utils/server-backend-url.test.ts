import { describe, it, expect } from 'vitest'
import { backendUrlFrom, MISSING_BACKEND_URL } from '../../../server/backend-url.mjs'

// Sem BACKEND_URL a produção caía na API de staging (o padrão do Dockerfile) e
// gravava dado real no banco errado. Agora não há padrão: em produção o
// servidor se recusa a subir e diz por quê.
describe('BACKEND_URL do servidor do container', () => {
  it('em produção, sem a variável, recusa e explica', () => {
    expect(() => backendUrlFrom({ NODE_ENV: 'production' })).toThrow(MISSING_BACKEND_URL)
    expect(() => backendUrlFrom({ NODE_ENV: 'production', BACKEND_URL: '   ' })).toThrow(/BACKEND_URL não definida/)
  })

  it('usa o endereço informado, sem a barra do fim', () => {
    expect(backendUrlFrom({ NODE_ENV: 'production', BACKEND_URL: 'http://sindicato_api:3000/' }))
      .toBe('http://sindicato_api:3000')
    expect(backendUrlFrom({ NODE_ENV: 'production', BACKEND_URL: ' https://api.exemplo.com.br ' }))
      .toBe('https://api.exemplo.com.br')
  })

  it('fora de produção, sem a variável, não inventa endereço', () => {
    expect(backendUrlFrom({})).toBeNull()
    expect(backendUrlFrom({ NODE_ENV: 'development' })).toBeNull()
  })

  it('recusa o que não é endereço http(s)', () => {
    expect(() => backendUrlFrom({ NODE_ENV: 'production', BACKEND_URL: 'sindicato_api:3000' })).toThrow(/inválida/)
    expect(() => backendUrlFrom({ BACKEND_URL: 'ftp://api' })).toThrow(/inválida/)
    expect(() => backendUrlFrom({ BACKEND_URL: 'localhost' })).toThrow(/inválida/)
  })
})
