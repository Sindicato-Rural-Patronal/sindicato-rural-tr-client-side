import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ApiError } from '@/lib/api'
import { CATALOGO_PESSOAS_CRU } from '../lib/export-catalog.fixture'

// O catálogo do montador. Contra o back velho (sem a rota) e nas fontes que
// ainda não têm montador, a API responde 404: o hook devolve null e o item
// "Montar relatório…" não aparece.

const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

const { useExportCatalog, EXPORT_CATALOG_STALE_TIME } = await import('@/hooks/useExportCatalog')

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('useExportCatalog', () => {
  it('lê o catálogo da fonte', async () => {
    apiFetch.mockResolvedValue({ json: () => Promise.resolve(CATALOGO_PESSOAS_CRU) })
    const { result } = renderHook(() => useExportCatalog('people'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiFetch).toHaveBeenCalledWith('/admin/export/people/catalog')
    expect(result.current.data?.title).toBe('Pessoas')
  })

  it('404 (back velho ou fonte sem montador) = null, sem erro', async () => {
    apiFetch.mockRejectedValue(new ApiError(404, 'Este conjunto ainda não tem o montador.'))
    const { result } = renderHook(() => useExportCatalog('companies'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('403 também = null', async () => {
    apiFetch.mockRejectedValue(new ApiError(403, 'Forbidden'))
    const { result } = renderHook(() => useExportCatalog('people'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('resposta fora do formato = null', async () => {
    apiFetch.mockResolvedValue({ json: () => Promise.resolve({ data: [], total: 0 }) })
    const { result } = renderHook(() => useExportCatalog('people'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('falha do servidor fica como erro (o item também não aparece)', async () => {
    apiFetch.mockRejectedValue(new ApiError(500, 'HTTP 500'))
    const { result } = renderHook(() => useExportCatalog('people'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })

  it('fica guardado por bastante tempo (não pede de novo a cada menu)', () => {
    expect(EXPORT_CATALOG_STALE_TIME).toBeGreaterThanOrEqual(10 * 60_000)
  })
})
