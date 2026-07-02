import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // 1 min — evita re-fetch em remounts (StrictMode)
      gcTime: 5 * 60 * 1000,      // 5 min de cache após sem subscribers
      retry: false,               // sem retry automático; cada hook decide
      refetchOnWindowFocus: false, // não re-fetcha ao trocar de aba
    },
  },
})