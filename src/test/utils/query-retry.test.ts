import { describe, it, expect } from 'vitest'
import { ApiError } from '@/lib/api'
import { errorStatus, shouldRetryQuery, MAX_QUERY_RETRIES } from '@/lib/query-retry'

describe('errorStatus', () => {
  it('lê o status do ApiError e do "HTTP 500" dos hooks com fetch cru', () => {
    expect(errorStatus(new ApiError(404, 'Notícia não encontrada'))).toBe(404)
    expect(errorStatus(new Error('HTTP 503'))).toBe(503)
  })

  it('sem resposta do servidor → null', () => {
    expect(errorStatus(new TypeError('Failed to fetch'))).toBeNull()
    expect(errorStatus('qualquer coisa')).toBeNull()
  })
})

describe('shouldRetryQuery', () => {
  it('repete falha de rede e erro do servidor (5xx)', () => {
    expect(shouldRetryQuery(0, new TypeError('Failed to fetch'))).toBe(true)
    expect(shouldRetryQuery(0, new ApiError(500, 'x'))).toBe(true)
    expect(shouldRetryQuery(1, new Error('HTTP 502'))).toBe(true)
  })

  it('nunca repete erro do pedido (4xx)', () => {
    expect(shouldRetryQuery(0, new ApiError(404, 'x'))).toBe(false)
    expect(shouldRetryQuery(0, new ApiError(401, 'x'))).toBe(false)
    expect(shouldRetryQuery(0, new ApiError(403, 'x'))).toBe(false)
    expect(shouldRetryQuery(0, new Error('HTTP 429'))).toBe(false)
  })

  it(`para depois de ${MAX_QUERY_RETRIES} repetições`, () => {
    expect(shouldRetryQuery(MAX_QUERY_RETRIES - 1, new TypeError('Failed to fetch'))).toBe(true)
    expect(shouldRetryQuery(MAX_QUERY_RETRIES, new TypeError('Failed to fetch'))).toBe(false)
  })
})
