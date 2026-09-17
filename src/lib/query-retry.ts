import { ApiError } from '@/lib/api'

/** Quantas vezes uma consulta é repetida depois da primeira falha. */
export const MAX_QUERY_RETRIES = 2

/**
 * Status HTTP de um erro de consulta: `ApiError` (apiFetch) ou `Error("HTTP 500")`
 * (hooks públicos com fetch cru). `null` = sem resposta do servidor (sem
 * internet, queda no meio do caminho).
 */
export function errorStatus(error: unknown): number | null {
  if (error instanceof ApiError) return error.status
  if (error instanceof Error) {
    const m = /^HTTP (\d{3})\b/.exec(error.message)
    if (m) return Number(m[1])
  }
  return null
}

/**
 * Regra de repetição das consultas: conexão fraca (3G) costuma falhar uma vez e
 * funcionar na seguinte. Repete até 2 vezes quando não houve resposta ou o
 * servidor falhou (5xx); erro do pedido (4xx: não encontrado, sem permissão,
 * sessão vencida) não muda repetindo.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false
  const status = errorStatus(error)
  return status == null || status >= 500
}
