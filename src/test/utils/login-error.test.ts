import { describe, it, expect, vi, afterEach } from 'vitest'
import { ApiError } from '@/lib/api'
import { loginErrorMessage } from '@/lib/login-error'
import { authenticateUser } from '@/hooks/use-users'
import '@/i18n'

function resposta(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => vi.unstubAllGlobals())

describe('loginErrorMessage', () => {
  it('senha errada (401) continua "Usuário ou senha inválidos"', () => {
    expect(loginErrorMessage(new ApiError(401, 'Invalid username or password'))).toBe('Usuário ou senha inválidos.')
  })

  it('bloqueio por excesso de tentativas (429) pede para esperar', () => {
    expect(loginErrorMessage(new ApiError(429, 'Too Many Requests'))).toMatch(/Muitas tentativas.*Espere alguns minutos/)
  })

  it('sistema fora do ar (5xx, inclusive o 502 do proxy) não culpa a senha', () => {
    for (const status of [500, 502, 503]) {
      expect(loginErrorMessage(new ApiError(status, 'x'))).toMatch(/fora do ar/)
    }
  })

  it('sem resposta (sem internet) fala da conexão', () => {
    expect(loginErrorMessage(new TypeError('Failed to fetch'))).toMatch(/Sem conexão/)
  })
})

describe('authenticateUser', () => {
  it('devolve o token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(200, { token: 'abc' })))
    await expect(authenticateUser('maria', 'segredo')).resolves.toBe('abc')
  })

  it('falha HTTP vira ApiError com o status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(429, { error: 'Too Many Requests' })))
    const erro = await authenticateUser('maria', 'segredo').catch(e => e)
    expect(erro).toBeInstanceOf(ApiError)
    expect(erro.status).toBe(429)
  })

  it('sem internet, o erro do fetch passa adiante', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(authenticateUser('maria', 'segredo')).rejects.toBeInstanceOf(TypeError)
  })
})
