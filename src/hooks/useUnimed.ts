import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

// ── Tipos ─────────────────────────────────────────────────────────────────────

/** Linha da listagem de beneficiários (GET /admin/unimed). */
export type UnimedRow = {
  id: string
  userDataId: string
  userData: { id: string; name: string; cpf: string | null }
  plano: string | null
  matricula: string | null
  tipoDependente: string | null
  dataAdesao: string | null
  createdAt: string
}

/** Beneficiário completo (GET /admin/unimed/:id). */
export type UnimedDetail = {
  id: string
  userDataId: string
  userData: { id: string; name: string; cpf: string | null }
  dataAdesao: string | null
  tipoMovimento: string | null
  tipoDependente: string | null
  grauDependencia: string | null
  cns: string | null
  nomeMae: string | null
  profissao: string | null
  plano: string | null
  matricula: string | null
  empresa: string | null
  contratante: string | null
  titularId: string | null
  motivo: string | null
  obs: string | null
  createdAt: string
  updatedAt: string
}

export type UnimedListResponse = {
  data: UnimedRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/** Campos do convênio — todos opcionais. */
export type UnimedFields = {
  dataAdesao?: string | null
  tipoMovimento?: string | null
  tipoDependente?: string | null
  grauDependencia?: string | null
  cns?: string | null
  nomeMae?: string | null
  profissao?: string | null
  plano?: string | null
  matricula?: string | null
  empresa?: string | null
  contratante?: string | null
  titularId?: string | null
  motivo?: string | null
  obs?: string | null
}

/** Corpo do POST — precisa do usuário vinculado. */
export type CreateUnimedInput = UnimedFields & { userDataId: string }

/** Corpo do PATCH — campos parciais, sem userDataId. */
export type UpdateUnimedInput = UnimedFields

// ── Hooks ─────────────────────────────────────────────────────────────────────

function invalidateUnimed(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['admin', 'unimed'] })
}

export function useUnimedList(
  params: { page?: number; limit?: number; search?: string } = {},
) {
  const { page = 1, limit = 20, search } = params
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (search?.trim()) qs.set('search', search.trim())

  return useQuery<UnimedListResponse>({
    queryKey: ['admin', 'unimed', 'list', page, limit, search?.trim() ?? ''],
    queryFn: () => apiFetch(`/admin/unimed?${qs}`).then(r => r.json()),
  })
}

export function useUnimed(id: string | null | undefined) {
  return useQuery<UnimedDetail>({
    queryKey: ['admin', 'unimed', 'detail', id],
    queryFn: () => apiFetch(`/admin/unimed/${id}`).then(r => r.json()),
    enabled: !!id,
  })
}

export function useCreateUnimed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateUnimedInput) =>
      apiFetch('/admin/unimed', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => invalidateUnimed(qc),
  })
}

export function useUpdateUnimed(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateUnimedInput) =>
      apiFetch(`/admin/unimed/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => invalidateUnimed(qc),
  })
}

export function useDeleteUnimed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/unimed/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateUnimed(qc),
  })
}
