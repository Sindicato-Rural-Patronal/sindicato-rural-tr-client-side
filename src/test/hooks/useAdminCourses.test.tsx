import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// A lista de cursos do painel pede a aba (?view=upcoming|stored). Sem a aba, o
// pedido é o de sempre: o Painel Geral continua listando como antes.

const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

const { useAdminCourses } = await import('@/hooks/useCourse')

function pagina(titulos: string[]) {
  return {
    json: () => Promise.resolve({
      data: titulos.map((title, i) => ({ id: `c${i}`, title })),
      total: titulos.length, page: 1, limit: 8, totalPages: 1,
    }),
  }
}

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const urlDaChamada = (n: number) => new URL(`http://x${apiFetch.mock.calls[n][0] as string}`)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAdminCourses: aba da lista', () => {
  it('"Próximos" manda view=upcoming', async () => {
    apiFetch.mockResolvedValue(pagina(['Soja']))
    const { result } = renderHook(() => useAdminCourses({ page: 1, limit: 8, view: 'upcoming' }), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const url = urlDaChamada(0)
    expect(url.pathname).toBe('/admin/courses')
    expect(url.searchParams.get('view')).toBe('upcoming')
  })

  it('"Armazenados" manda view=stored, junto da página, da busca e do ano', async () => {
    apiFetch.mockResolvedValue(pagina(['Milho']))
    const { result } = renderHook(
      () => useAdminCourses({ page: 2, limit: 16, search: ' milho ', year: 2026, view: 'stored' }),
      { wrapper: wrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const p = urlDaChamada(0).searchParams
    expect(p.get('view')).toBe('stored')
    expect(p.get('page')).toBe('2')
    expect(p.get('limit')).toBe('16')
    expect(p.get('search')).toBe('milho')
    expect(p.get('year')).toBe('2026')
  })

  it('sem aba o pedido não leva view (Painel Geral e outros usos continuam iguais)', async () => {
    apiFetch.mockResolvedValue(pagina(['Soja']))
    const { result } = renderHook(() => useAdminCourses({ page: 1, limit: 5, status: 'PUBLIC' }), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const p = urlDaChamada(0).searchParams
    expect(p.has('view')).toBe(false)
    expect(p.get('status')).toBe('PUBLIC')
  })

  it('trocar de aba busca a lista da outra aba, sem mostrar a anterior no lugar', async () => {
    apiFetch.mockImplementation((path: string) =>
      Promise.resolve(path.includes('view=stored') ? pagina(['Curso antigo']) : pagina(['Curso novo'])))
    const { result, rerender } = renderHook(
      ({ view }: { view: 'upcoming' | 'stored' }) => useAdminCourses({ page: 1, limit: 8, view }),
      { wrapper: wrapper(), initialProps: { view: 'upcoming' } },
    )
    await waitFor(() => expect(result.current.data?.data[0].title).toBe('Curso novo'))

    rerender({ view: 'stored' })
    // Outra chave de cache: enquanto carrega, não há lista (não herda a de Próximos).
    expect(result.current.data).toBeUndefined()
    await waitFor(() => expect(result.current.data?.data[0].title).toBe('Curso antigo'))
    expect(apiFetch).toHaveBeenCalledTimes(2)
    expect(urlDaChamada(1).searchParams.get('view')).toBe('stored')

    // Voltar para Próximos mostra a lista dela, guardada no cache.
    rerender({ view: 'upcoming' })
    await waitFor(() => expect(result.current.data?.data[0].title).toBe('Curso novo'))
  })
})
