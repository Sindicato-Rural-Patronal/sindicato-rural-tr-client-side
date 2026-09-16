import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiUpload, API_BASE, ApiError } from '@/lib/api'

// ── Tipos ─────────────────────────────────────────────────────────────────────

/** Linha da tabela de preços. Valor sempre em centavos. */
export type ConvenioPriceRow = { label: string; priceCents: number }

export type Convenio = {
  id: string
  slug: string
  name: string
  title: string
  subtitle: string | null
  intro: string | null
  logoUrl: string | null
  priceLabelHeader: string
  priceValueHeader: string
  priceRows: ConvenioPriceRow[]
  priceNote: string | null
  documentsTitle: string
  documents: string[]
  highlightsTitle: string | null
  highlights: string[]
  aboutTitle: string | null
  aboutText: string | null
  isActive: boolean
  order: number
  createdAt: string
  updatedAt: string
}

/** Item do menu público "Convênios". */
export type ConvenioMenuItem = {
  id: string
  slug: string
  name: string
  subtitle: string | null
  logoUrl: string | null
  order: number
}

/** Corpo de criação/edição — tudo menos id, logo e datas. */
export type ConvenioInput = Omit<Convenio, 'id' | 'logoUrl' | 'createdAt' | 'updatedAt'>

// ── Público ───────────────────────────────────────────────────────────────────
// fetch cru (sem token / sem redirecionar no 401) pra não deslogar um visitante
// com token velho — mesmo padrão das cotações da home.

export function useConvenioMenu() {
  return useQuery<ConvenioMenuItem[]>({
    queryKey: ['convenios', 'menu'],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/convenios`)
      if (!r.ok) throw new ApiError(r.status, 'Erro ao carregar convênios')
      return r.json()
    },
    staleTime: 5 * 60_000,
  })
}

export function usePublicConvenio(slug: string) {
  return useQuery<Convenio>({
    queryKey: ['convenios', 'public', slug],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/convenios/${encodeURIComponent(slug)}`)
      if (!r.ok) throw new ApiError(r.status, r.status === 404 ? 'Convênio não encontrado' : 'Erro ao carregar convênio')
      return r.json()
    },
    enabled: !!slug,
  })
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export function useAdminConvenios(opts: { enabled?: boolean } = {}) {
  return useQuery<Convenio[]>({
    queryKey: ['admin', 'convenios'],
    queryFn: () => apiFetch('/admin/convenios').then(r => r.json()),
    enabled: opts.enabled ?? true,
  })
}

export function useAdminConvenio(id: string | null | undefined) {
  return useQuery<Convenio>({
    queryKey: ['admin', 'convenios', id],
    queryFn: () => apiFetch(`/admin/convenios/${id}`).then(r => r.json()),
    enabled: !!id,
  })
}

// Qualquer escrita invalida o menu e as páginas públicas também.
function invalidateConvenios(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['convenios'] })
  qc.invalidateQueries({ queryKey: ['admin', 'convenios'] })
}

export function useCreateConvenio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ConvenioInput) =>
      apiFetch('/admin/convenios', { method: 'POST', body: JSON.stringify(body) })
        .then(r => r.json() as Promise<Convenio>),
    onSuccess: () => invalidateConvenios(qc),
  })
}

export function useUpdateConvenio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ConvenioInput> & { logoUrl?: null } }) =>
      apiFetch(`/admin/convenios/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
        .then(r => r.json() as Promise<Convenio>),
    onSuccess: () => invalidateConvenios(qc),
  })
}

export function useDeleteConvenio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/convenios/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateConvenios(qc),
  })
}

export function useUploadConvenioLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      apiUpload(`/admin/convenios/${id}/logo`, file).then(r => r.json() as Promise<{ logoUrl: string }>),
    onSuccess: () => invalidateConvenios(qc),
  })
}
