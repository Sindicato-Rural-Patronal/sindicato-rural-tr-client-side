import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useDeleteCourse } from '@/hooks/useCourse'

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/lib/api'
const mockApiFetch = vi.mocked(apiFetch)

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return {
    qc,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children),
  }
}

describe('useDeleteCourse', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('chama DELETE /courses/:id com o id correto', async () => {
    mockApiFetch.mockResolvedValue(new Response(null, { status: 204 }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteCourse(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('curso-123')
    })

    expect(mockApiFetch).toHaveBeenCalledOnce()
    expect(mockApiFetch).toHaveBeenCalledWith('/courses/curso-123', { method: 'DELETE' })
  })

  it('mutation fica em status success após 204', async () => {
    mockApiFetch.mockResolvedValue(new Response(null, { status: 204 }))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteCourse(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('curso-abc')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('mutation fica em status error quando API retorna 400', async () => {
    mockApiFetch.mockRejectedValue(new Error('HTTP 400'))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteCourse(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('curso-invalido').catch(() => {})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('HTTP 400')
  })

  it('mutation fica em status error quando API retorna 404', async () => {
    mockApiFetch.mockRejectedValue(new Error('HTTP 404'))

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteCourse(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('id-inexistente').catch(() => {})
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('HTTP 404')
  })

  it('invalida queries corretas após delete bem-sucedido', async () => {
    mockApiFetch.mockResolvedValue(new Response(null, { status: 204 }))

    const { wrapper, qc } = makeWrapper()
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')
    const removeSpy = vi.spyOn(qc, 'removeQueries')

    const { result } = renderHook(() => useDeleteCourse(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('curso-xyz')
    })

    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'courses', 'curso-xyz'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['courses'], exact: true })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'courses'], exact: true })
  })
})
