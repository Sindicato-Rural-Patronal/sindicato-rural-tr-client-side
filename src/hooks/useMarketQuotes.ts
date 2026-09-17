import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiFetch, API_BASE } from '@/lib/api'
import type { QuotePeriod } from '@/lib/quote-utils'

// Produtos fixos (SOJA, MILHO, TRIGO, MANDIOCA, DOLAR). No painel só se lança
// o preço e o período; a data é a do dia, definida pelo backend.
export type MarketQuote = {
  id: string
  label: string
  /** Texto pronto ("R$ 120,00 /sc 60kg"); vazio antes do primeiro lançamento. */
  value: string
  priceCents: number | null
  /** Unidade fixa do produto ("sc 60kg", "t"); null no dólar. */
  unit: string | null
  period: QuotePeriod | null
  variation: string | null
  referenceDate: string | null
  isActive: boolean
  order: number
  createdAt: string
  updatedAt: string
}

export type DailyQuotesInput = {
  period: QuotePeriod
  prices: { id: string; priceCents: number }[]
}

// Público (home): produtos com preço lançado, ordenados. Usa fetch cru (sem
// token / sem handleUnauthorized) pra não deslogar um visitante com token velho.
export function useMarketQuotes() {
  return useQuery<MarketQuote[]>({
    queryKey: ['market-quotes'],
    // Erro (429/500) vira lista vazia: a home faz reduce/map na lista
    queryFn: () => fetch(`${API_BASE}/market-quotes`).then(r => (r.ok ? r.json() : [])),
  })
}

// Admin: todos os produtos, com ou sem preço.
export function useAdminMarketQuotes(opts: { enabled?: boolean } = {}) {
  return useQuery<MarketQuote[]>({
    queryKey: ['admin', 'market-quotes'],
    queryFn: () => apiFetch('/admin/market-quotes').then(r => r.json()),
    enabled: opts.enabled ?? true,
  })
}

export function useSaveDailyQuotes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: DailyQuotesInput) =>
      apiFetch('/admin/market-quotes/daily', { method: 'PUT', body: JSON.stringify(body) })
        .then(r => r.json() as Promise<MarketQuote[]>),
    onSuccess: data => {
      qc.setQueryData(['admin', 'market-quotes'], data)
      qc.invalidateQueries({ queryKey: ['market-quotes'] })
    },
  })
}

// Troca a unidade do produto (null = sem unidade). Atualiza a lista do painel e a faixa da home.
export function useUpdateQuoteUnit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, unit }: { id: string; unit: string | null }) =>
      apiFetch(`/admin/market-quotes/${id}`, { method: 'PATCH', body: JSON.stringify({ unit }) })
        .then(r => r.json() as Promise<MarketQuote>),
    onSuccess: quote => {
      qc.setQueryData<MarketQuote[]>(['admin', 'market-quotes'], list => list?.map(q => (q.id === quote.id ? quote : q)))
      qc.invalidateQueries({ queryKey: ['market-quotes'] })
    },
  })
}

export type QuoteHistoryPoint = {
  /** "YYYY-MM-DD" (data do lançamento, sem fuso). */
  date: string
  period: QuotePeriod | null
  priceCents: number
}

export type QuoteHistorySeries = {
  id: string
  label: string
  unit: string | null
  points: QuoteHistoryPoint[]
}

// Público (/cotacoes): um ponto por lançamento (dia + período) nos últimos N dias.
// Trocar o período mantém o gráfico anterior na tela até o novo chegar.
export function useQuoteHistory(days: number) {
  return useQuery<QuoteHistorySeries[]>({
    queryKey: ['market-quotes', 'history', days],
    queryFn: () => fetch(`${API_BASE}/market-quotes/history?days=${days}`).then(r => (r.ok ? r.json() : [])),
    placeholderData: keepPreviousData,
  })
}
