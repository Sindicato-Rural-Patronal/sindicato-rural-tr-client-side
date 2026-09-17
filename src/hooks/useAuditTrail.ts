import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { PaginatedResponse } from '@/hooks/useAdmin'
import type { AuditChange } from '@/lib/audit-fields'

// Trilha de auditoria (GET /admin/audit-logs) com o contexto de cada ação:
// de onde veio (IP, local, aparelho) e o que mudou.

export type AuditAction = 'create' | 'edit' | 'delete' | 'export' | 'login' | 'login_failed'

export type AuditTrailItem = {
  id: string
  actorId: string | null
  actorName: string
  method: string
  path: string
  entity: string
  targetLabel: string | null
  /** Frase pronta ("Iniciou o curso "HORTA""). */
  summary?: string
  statusCode: number
  createdAt: string
  ip?: string | null
  /** "Terra Roxa, PR, Brasil" (aproximado, pelo IP). */
  location?: string | null
  /** "Chrome no Windows". */
  device?: string | null
  userAgent?: string | null
  changes?: AuditChange[] | null
}

export type AuditTrailFilters = {
  page?: number
  limit?: number
  action?: AuditAction
  entity?: string
  actorId?: string
  ip?: string
  from?: string
  to?: string
  q?: string
}

export function useAuditTrail(params: AuditTrailFilters = {}, opts: { enabled?: boolean } = {}) {
  const { page = 1, limit = 30, action, entity, actorId, ip, from, to, q } = params
  const search = new URLSearchParams()
  search.set('page', String(page))
  search.set('limit', String(limit))
  const optional = { action, entity, actorId, ip, from, to, q }
  for (const [key, value] of Object.entries(optional)) {
    if (value) search.set(key, value)
  }
  return useQuery<PaginatedResponse<AuditTrailItem>>({
    queryKey: ['admin', 'audit-logs', page, limit, action, entity, actorId, ip, from, to, q],
    queryFn: () => apiFetch(`/admin/audit-logs?${search}`).then(r => r.json()),
    enabled: opts.enabled ?? true,
  })
}
