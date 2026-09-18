import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiFetch, apiUpload } from '@/lib/api'
import type { UserProperty, CreatePropertyBody, UpdatePropertyBody, PaginatedResponse } from '@/hooks/useAdmin'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type CompanyType = 'PRIVATE' | 'PUBLIC'

export const COMPANY_TYPE_LABEL: Record<CompanyType, string> = {
  PRIVATE: 'Privada',
  PUBLIC: 'Pública',
}

/** Endereço da sede, direto no cadastro da empresa. */
export type CompanyAddress = {
  zipCode: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
}

export type Company = {
  id: string
  /** Razão social. */
  name: string
  /** Nome fantasia. */
  tradeName: string | null
  addressId: string | null
  address: CompanyAddress | null
  cnpj: string | null
  stateRegistration: string | null
  type: CompanyType
  phone: string | null
  phone2: string | null
  phone3: string | null
  email: string | null
  website: string | null
  notes: string | null
  isPartner: boolean
  partnerUrl: string | null
  partnerLogo: string | null
  partnerOrder: number | null
  primaryPropertyId: string | null
  createdAt: string
  updatedAt: string
}

export type CompanyListItem = Company & { membersCount: number }

export type CompanyMember = {
  id: string
  companyId: string
  userDataId: string
  title: string
  createdAt: string
  updatedAt: string
  userData: { id: string; name: string; cpf: string | null; phone: string; email: string | null }
}

export type CompanyDetail = Company & {
  members: CompanyMember[]
  properties: UserProperty[]
}

/**
 * Campos editáveis (o logo vai pelo upload; `partnerLogo: null` remove).
 * `address` com tudo vazio (ou null) remove o endereço.
 */
export type CompanyInput = Partial<Omit<Company, 'id' | 'partnerLogo' | 'address' | 'addressId' | 'createdAt' | 'updatedAt'>> & {
  partnerLogo?: null
  address?: CompanyAddress | null
}

/** Títulos mais comuns no vínculo pessoa ↔ empresa (maiúsculas sem acento, como o cadastro). */
export const COMMON_MEMBER_TITLES = ['SOCIO', 'PROPRIETARIO', 'ADMINISTRADOR', 'DIRETOR', 'GERENTE', 'FUNCIONARIO', 'CONTADOR', 'RESPONSAVEL']

/** Sugestões de título: os já usados + os comuns, sem repetir, em ordem alfabética. */
export function memberTitleSuggestions(used: string[] | undefined): string[] {
  return Array.from(new Set([...(used ?? []), ...COMMON_MEMBER_TITLES])).sort()
}

/** Nome para exibir: o fantasia, quando houver; senão a razão social. */
export function companyDisplayName(c: { name: string; tradeName?: string | null }): string {
  return c.tradeName || c.name
}

export type CompanyFilters = {
  page?: number
  limit?: number
  search?: string
  type?: CompanyType
  isPartner?: boolean
}

// ── Consultas ─────────────────────────────────────────────────────────────────

export function useAdminCompanies(filters: CompanyFilters = {}) {
  const { page = 1, limit = 20, search, type, isPartner } = filters
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (search?.trim()) qs.set('search', search.trim())
  if (type) qs.set('type', type)
  if (isPartner !== undefined) qs.set('isPartner', String(isPartner))
  return useQuery<PaginatedResponse<CompanyListItem>>({
    queryKey: ['admin', 'companies', 'list', page, limit, search?.trim() ?? '', type ?? '', isPartner ?? ''],
    queryFn: () => apiFetch(`/admin/companies?${qs}`).then(r => r.json()),
    placeholderData: keepPreviousData,
  })
}

export function useAdminCompany(id: string | null | undefined) {
  return useQuery<CompanyDetail>({
    queryKey: ['admin', 'companies', 'detail', id],
    queryFn: () => apiFetch(`/admin/companies/${id}`).then(r => r.json()),
    enabled: !!id,
    retry: false,
  })
}

/** Títulos já usados em vínculos — sugestões ao vincular pessoa. */
export function useCompanyMemberTitles() {
  return useQuery<string[]>({
    queryKey: ['admin', 'companies', 'titles'],
    queryFn: () => apiFetch('/admin/companies/titles').then(r => r.json()),
    staleTime: 60_000,
  })
}

// ── Escritas ──────────────────────────────────────────────────────────────────

// Empresa aparece no detalhe da pessoa (vínculos) e na home (parceiros):
// qualquer escrita invalida as três visões. Devolve a promise do refetch.
function invalidateCompanyViews(qc: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['admin', 'companies'] }),
    qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    qc.invalidateQueries({ queryKey: ['partners'] }),
  ])
}

export function useCreateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CompanyInput) =>
      apiFetch('/admin/companies', { method: 'POST', body: JSON.stringify(body) }).then(r => r.json() as Promise<Company>),
    onSuccess: () => { invalidateCompanyViews(qc) },
  })
}

export function useUpdateCompany(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CompanyInput) =>
      apiFetch(`/admin/companies/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).then(r => r.json() as Promise<Company>),
    onSuccess: () => { invalidateCompanyViews(qc) },
  })
}

export function useDeleteCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/companies/${id}`, { method: 'DELETE' }),
    onSuccess: () => { invalidateCompanyViews(qc) },
  })
}

export function useAddCompanyMember(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { userDataId: string; title: string }) =>
      apiFetch(`/admin/companies/${companyId}/members`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { invalidateCompanyViews(qc) },
  })
}

export function useUpdateCompanyMember(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, title }: { memberId: string; title: string }) =>
      apiFetch(`/admin/companies/${companyId}/members/${memberId}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
    onSuccess: () => { invalidateCompanyViews(qc) },
  })
}

export function useRemoveCompanyMember(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) =>
      apiFetch(`/admin/companies/${companyId}/members/${memberId}`, { method: 'DELETE' }),
    onSuccess: () => { invalidateCompanyViews(qc) },
  })
}

// Pelo cadastro da pessoa a empresa é escolhida na hora: o id vai na chamada.
// A invalidação cobre ['admin','users'], então a aba Empresas da pessoa atualiza.
export function useLinkPersonToCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ companyId, ...body }: { companyId: string; userDataId: string; title: string }) =>
      apiFetch(`/admin/companies/${companyId}/members`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { invalidateCompanyViews(qc) },
  })
}

export function useUnlinkPersonFromCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ companyId, memberId }: { companyId: string; memberId: string }) =>
      apiFetch(`/admin/companies/${companyId}/members/${memberId}`, { method: 'DELETE' }),
    onSuccess: () => { invalidateCompanyViews(qc) },
  })
}

export function useAddCompanyProperty(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePropertyBody) =>
      apiFetch(`/admin/companies/${companyId}/properties`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { invalidateCompanyViews(qc) },
  })
}

export function useUpdateCompanyProperty(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ propertyId, ...body }: UpdatePropertyBody & { propertyId: string }) =>
      apiFetch(`/admin/companies/${companyId}/properties/${propertyId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => { invalidateCompanyViews(qc) },
  })
}

export function useRemoveCompanyProperty(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (propertyId: string) =>
      apiFetch(`/admin/companies/${companyId}/properties/${propertyId}`, { method: 'DELETE' }),
    onSuccess: () => { invalidateCompanyViews(qc) },
  })
}

/** Liga/desliga a parceria de qualquer empresa (o id vai na chamada, não no hook). */
export function useSetCompanyPartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; isPartner: boolean; partnerOrder?: number | null }) =>
      apiFetch(`/admin/companies/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => { invalidateCompanyViews(qc) },
  })
}

/** Nova ordem dos parceiros na home: todos os ids de empresas parceiras. */
export function useReorderPartners() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (order: string[]) =>
      apiFetch('/admin/partners/reorder', { method: 'PATCH', body: JSON.stringify({ order }) }),
    // Espera o refetch: isPending segue true e os botões de mover ficam travados até a ordem nova chegar
    onSettled: () => invalidateCompanyViews(qc),
  })
}

export function useUploadCompanyPartnerLogo(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) =>
      apiUpload(`/admin/companies/${companyId}/partner-logo`, file).then(r => r.json() as Promise<{ partnerLogoUrl: string }>),
    onSuccess: () => { invalidateCompanyViews(qc) },
  })
}
