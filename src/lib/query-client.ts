import { QueryClient } from '@tanstack/react-query'
import { shouldRetryQuery } from '@/lib/query-retry'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // 1 min — evita re-fetch em remounts (StrictMode)
      gcTime: 5 * 60 * 1000,      // 5 min de cache após sem subscribers
      retry: shouldRetryQuery,    // até 2x em falha de rede/5xx; nunca em 4xx (hook pode sobrescrever)
      refetchOnWindowFocus: false, // não re-fetcha ao trocar de aba
    },
  },
})
