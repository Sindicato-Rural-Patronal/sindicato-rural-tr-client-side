import { describe, it, expect, vi, afterEach } from 'vitest'
import { publicGet } from '@/lib/public-fetch'
import { errorStatus, shouldRetryQuery } from '@/lib/query-retry'

afterEach(() => vi.unstubAllGlobals())

// Parceiros, galerias e banners usavam `r.ok ? r.json() : []`: a falha virava
// lista vazia, sem nova tentativa e sem "Tentar de novo".
describe('publicGet', () => {
  it('devolve o JSON da rota pública, sem mandar token', async () => {
    localStorage.setItem('token', 'token-velho')
    const fetchMock = vi.fn().mockResolvedValue(new Response('[{"id":"p1"}]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(publicGet('/partners')).resolves.toEqual([{ id: 'p1' }])
    expect(fetchMock.mock.calls[0]).toHaveLength(1) // sem opções → sem Authorization
    localStorage.removeItem('token')
  })

  it('erro do servidor é erro (e a consulta repete), não lista vazia', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"x"}', { status: 503 })))
    const erro = await publicGet('/galleries').catch(e => e)
    expect(erro).toBeInstanceOf(Error)
    expect(errorStatus(erro)).toBe(503)
    expect(shouldRetryQuery(0, erro)).toBe(true)
  })
})
