import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isRedirect } from '@tanstack/react-router'
import { ApiError } from '@/lib/api'

const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))
// Sem as repetições (e a espera entre elas) do query-client: o teste é da regra.
vi.mock('@/lib/query-retry', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/query-retry')>()),
  shouldRetryQuery: () => false,
}))

const { requirePermission, NoPermissionError } = await import('@/lib/auth-guard')
const { queryClient } = await import('@/lib/query-client')

const me = (permissions: string[]) => ({ json: () => Promise.resolve({ permissions }) })

async function falha(perm: string) {
  return requirePermission(perm).then(() => null, e => e)
}

beforeEach(() => {
  queryClient.clear()
  apiFetch.mockReset()
  localStorage.setItem('token', 't')
})

describe('requirePermission', () => {
  it('com a permissão, deixa entrar', async () => {
    apiFetch.mockResolvedValue(me(['READ_BANNER']))
    await expect(requirePermission('READ_BANNER')).resolves.toBeUndefined()
  })

  it('sem a permissão, lança NoPermissionError (a tela mostra o aviso, não redireciona)', async () => {
    apiFetch.mockResolvedValue(me(['READ_USER']))
    const err = await falha('READ_BANNER')
    expect(isRedirect(err)).toBe(false)
    expect(err).toBeInstanceOf(NoPermissionError)
    expect(err.permission).toBe('READ_BANNER')
  })

  it('falha ao conferir (sem rede, 5xx) não é "sem permissão": sobe como erro', async () => {
    apiFetch.mockRejectedValue(new TypeError('Failed to fetch'))
    const semRede = await falha('READ_BANNER')
    expect(isRedirect(semRede)).toBe(false)
    expect(semRede.message).toBe('Não foi possível conferir suas permissões.')

    queryClient.clear()
    apiFetch.mockRejectedValue(new ApiError(503, 'HTTP 503'))
    const foraDoAr = await falha('READ_BANNER')
    expect(isRedirect(foraDoAr)).toBe(false)
  })

  it('sessão vencida (401) leva ao login', async () => {
    apiFetch.mockRejectedValue(new ApiError(401, 'Unauthorized'))
    const err = await falha('READ_BANNER')
    expect(isRedirect(err)).toBe(true)
    expect(err.options.to).toBe('/login')
  })

  it('usa o mesmo cache do useMe: duas telas seguidas, um pedido só', async () => {
    apiFetch.mockResolvedValue(me(['READ_BANNER', 'READ_NEWS']))
    await requirePermission('READ_BANNER')
    await requirePermission('READ_NEWS')
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
})
