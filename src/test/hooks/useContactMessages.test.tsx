import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// O contador de mensagens da sidebar só pergunta à API com READ_CONTACT:
// sem a permissão, GET /admin/contacts/messages responde 403 no console.

const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

const { useContactMessages } = await import('@/hooks/useAdmin')

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  apiFetch.mockResolvedValue({ json: () => Promise.resolve({ data: [], total: 3, page: 1, limit: 1, totalPages: 3 }) })
})

describe('useContactMessages: enabled', () => {
  it('desligado não chama a API', async () => {
    const { result } = renderHook(() => useContactMessages({ page: 1, limit: 1, read: false }, { enabled: false }), { wrapper })
    await new Promise(r => setTimeout(r, 20))
    expect(apiFetch).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })

  it('por padrão (a tela de Mensagens) chama', async () => {
    const { result } = renderHook(() => useContactMessages({ page: 1, limit: 1, read: false }), { wrapper })
    await waitFor(() => expect(result.current.data?.total).toBe(3))
    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(apiFetch.mock.calls[0][0]).toContain('/admin/contacts/messages?')
  })
})
