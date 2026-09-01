import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export type MarketQuote = {
  id: string
  label: string
  value: string
  variation: string | null
  referenceDate: string | null
  isActive: boolean
  order: number
  createdAt: string
  updatedAt: string
}

// `variation` não entra aqui — é calculada no backend pelo histórico de valores.
export type MarketQuoteInput = {
  label: string
  value: string
  referenceDate?: string | null
  isActive?: boolean
  order?: number
}

// Público (home): apenas cotações ativas, ordenadas.
export function useMarketQuotes() {
  return useQuery<MarketQuote[]>({
    queryKey: ['market-quotes'],
    queryFn: () => apiFetch('/market-quotes').then(r => r.json()),
  })
}

// Admin: todas (inclui inativas).
export function useAdminMarketQuotes() {
  return useQuery<MarketQuote[]>({
    queryKey: ['admin', 'market-quotes'],
    queryFn: () => apiFetch('/admin/market-quotes').then(r => r.json()),
  })
}

function invalidateQuotes(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['market-quotes'] })
  qc.invalidateQueries({ queryKey: ['admin', 'market-quotes'] })
}

export function useCreateMarketQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: MarketQuoteInput) =>
      apiFetch('/market-quotes', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => invalidateQuotes(qc),
  })
}

export function useUpdateMarketQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<MarketQuoteInput> }) =>
      apiFetch(`/market-quotes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => invalidateQuotes(qc),
  })
}

export function useDeleteMarketQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/market-quotes/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateQuotes(qc),
  })
}
