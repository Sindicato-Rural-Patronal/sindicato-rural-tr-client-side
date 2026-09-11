import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiUpload, API_BASE } from '@/lib/api'

export type FinanceType = 'IN' | 'OUT'

export type FinanceAttachment = {
  id: string
  filename: string
  mimeType: string
  size: number
  createdAt: string
}

// Dados da Nota de Empenho (fornecedor, NF, banco/cheque, desconto).
export type Empenho = {
  numero?: string
  notaFiscal?: string
  nomeFantasia?: string
  razaoSocial?: string
  cnpjCpf?: string
  inscricaoEstadual?: string
  endereco?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
  telefone?: string
  descontoCents?: number
  banco?: string
  conta?: string
  agencia?: string
  cheque?: string
}

export type FinanceCategory = {
  id: string
  name: string
  type: FinanceType
  color: string
  active: boolean
  order: number
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export type FinanceAccount = {
  id: string
  name: string
  color: string
  active: boolean
  order: number
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export type FinanceTransaction = {
  id: string
  type: FinanceType
  amountCents: number
  date: string
  description: string
  method: string | null
  notes: string | null
  categoryId: string | null
  category: FinanceCategory | null
  accountId: string | null
  account: FinanceAccount | null
  transferId: string | null
  empenho: Empenho | null
  attachments: FinanceAttachment[]
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export type FinanceTransactionsPage = {
  data: FinanceTransaction[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type FinanceSummary = {
  balanceAllTimeCents: number
  periodInCents: number
  periodOutCents: number
  periodResultCents: number
  byCategory: { categoryId: string | null; name: string; color: string; type: FinanceType; totalCents: number }[]
  byMonth: { month: string; inCents: number; outCents: number }[]
  byAccount: { accountId: string | null; name: string; color: string; balanceCents: number }[]
}

export type CategoryInput = {
  name: string
  type: FinanceType
  color?: string
  active?: boolean
  order?: number
}

export type AccountInput = {
  name: string
  color?: string
  active?: boolean
  order?: number
}

export type TransactionInput = {
  type: FinanceType
  amountCents: number
  date: string
  description: string
  method?: string | null
  notes?: string | null
  categoryId?: string | null
  accountId?: string | null
  empenho?: Empenho | null
}

export type TransferInput = {
  fromAccountId: string
  toAccountId: string
  amountCents: number
  date: string
  description?: string
  method?: string | null
}

export type TransactionFilters = {
  page?: number
  limit?: number
  from?: string
  to?: string
  type?: FinanceType | ''
  categoryId?: string
  accountId?: string
  search?: string
}

// ── Categorias ──────────────────────────────────────────────────────────────
export function useFinanceCategories(
  opts: { includeInactive?: boolean; enabled?: boolean } = {},
) {
  return useQuery<FinanceCategory[]>({
    queryKey: ['finance', 'categories', opts.includeInactive ?? false],
    queryFn: () =>
      apiFetch(`/admin/finance/categories${opts.includeInactive ? '?all=true' : ''}`).then(r => r.json()),
    enabled: opts.enabled ?? true,
  })
}

function invalidateFinance(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['finance'] })
}

export function useCreateFinanceCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CategoryInput) =>
      apiFetch('/admin/finance/categories', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => invalidateFinance(qc),
  })
}

export function useUpdateFinanceCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CategoryInput> }) =>
      apiFetch(`/admin/finance/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => invalidateFinance(qc),
  })
}

export function useDeleteFinanceCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/finance/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateFinance(qc),
  })
}

// ── Contas / caixas ───────────────────────────────────────────────────────────
export function useFinanceAccounts(
  opts: { includeInactive?: boolean; enabled?: boolean } = {},
) {
  return useQuery<FinanceAccount[]>({
    queryKey: ['finance', 'accounts', opts.includeInactive ?? false],
    queryFn: () =>
      apiFetch(`/admin/finance/accounts${opts.includeInactive ? '?all=true' : ''}`).then(r => r.json()),
    enabled: opts.enabled ?? true,
  })
}

export function useCreateFinanceAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AccountInput) =>
      apiFetch('/admin/finance/accounts', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => invalidateFinance(qc),
  })
}

export function useUpdateFinanceAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AccountInput> }) =>
      apiFetch(`/admin/finance/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => invalidateFinance(qc),
  })
}

export function useDeleteFinanceAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/finance/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateFinance(qc),
  })
}

// ── Lançamentos ──────────────────────────────────────────────────────────────
function buildQuery(filters: TransactionFilters): string {
  const p = new URLSearchParams()
  if (filters.page) p.set('page', String(filters.page))
  if (filters.limit) p.set('limit', String(filters.limit))
  if (filters.from) p.set('from', filters.from)
  if (filters.to) p.set('to', filters.to)
  if (filters.type) p.set('type', filters.type)
  if (filters.categoryId) p.set('categoryId', filters.categoryId)
  if (filters.accountId) p.set('accountId', filters.accountId)
  if (filters.search) p.set('search', filters.search)
  const s = p.toString()
  return s ? `?${s}` : ''
}

// Exporta os lançamentos filtrados como CSV (endpoint exige Bearer → download via blob).
export async function exportFinanceTransactions(filters: TransactionFilters = {}) {
  const p = new URLSearchParams()
  if (filters.from) p.set('from', filters.from)
  if (filters.to) p.set('to', filters.to)
  if (filters.type) p.set('type', filters.type)
  if (filters.categoryId) p.set('categoryId', filters.categoryId)
  if (filters.accountId) p.set('accountId', filters.accountId)
  if (filters.search) p.set('search', filters.search)
  const qs = p.toString()
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE}/admin/finance/transactions/export${qs ? `?${qs}` : ''}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Falha ao exportar')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lancamentos-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function useFinanceTransactions(
  filters: TransactionFilters = {},
  opts: { enabled?: boolean } = {},
) {
  return useQuery<FinanceTransactionsPage>({
    queryKey: ['finance', 'transactions', filters],
    queryFn: () => apiFetch(`/admin/finance/transactions${buildQuery(filters)}`).then(r => r.json()),
    enabled: opts.enabled ?? true,
  })
}

export function useCreateFinanceTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: TransactionInput) =>
      apiFetch('/admin/finance/transactions', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => invalidateFinance(qc),
  })
}

export function useUpdateFinanceTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<TransactionInput> }) =>
      apiFetch(`/admin/finance/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => invalidateFinance(qc),
  })
}

export function useDeleteFinanceTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/finance/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateFinance(qc),
  })
}

export function useCreateFinanceTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: TransferInput) =>
      apiFetch('/admin/finance/transfers', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => invalidateFinance(qc),
  })
}

// Todos os lançamentos do período — usado no relatório PDF. Pagina em blocos de
// 200 (dentro de qualquer limite do backend) até acabar. Máx 50 páginas.
export async function fetchFinanceTransactionsForRange(
  range: { from?: string; to?: string },
): Promise<FinanceTransaction[]> {
  const all: FinanceTransaction[] = []
  for (let page = 1; page <= 50; page++) {
    const p = new URLSearchParams()
    if (range.from) p.set('from', range.from)
    if (range.to) p.set('to', range.to)
    p.set('limit', '200')
    p.set('page', String(page))
    const res = await apiFetch(`/admin/finance/transactions?${p}`)
    const json = (await res.json()) as FinanceTransactionsPage
    all.push(...json.data)
    if (page >= (json.totalPages ?? 1)) break
  }
  return all
}

// ── Comprovantes (anexos) ─────────────────────────────────────────────────────
export function useUploadFinanceAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ transactionId, file }: { transactionId: string; file: File }) =>
      apiUpload(`/admin/finance/transactions/${transactionId}/attachments`, file),
    onSuccess: () => invalidateFinance(qc),
  })
}

export function useDeleteFinanceAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) =>
      apiFetch(`/admin/finance/attachments/${attachmentId}`, { method: 'DELETE' }),
    onSuccess: () => invalidateFinance(qc),
  })
}

// Abre o comprovante (endpoint exige Bearer, então não dá pra usar <a href>).
export async function openFinanceAttachment(attachmentId: string) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE}/admin/finance/attachments/${attachmentId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Falha ao abrir o comprovante')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export function useFinanceSummary(
  range: { from?: string; to?: string } = {},
  opts: { enabled?: boolean } = {},
) {
  const p = new URLSearchParams()
  if (range.from) p.set('from', range.from)
  if (range.to) p.set('to', range.to)
  const qs = p.toString()
  return useQuery<FinanceSummary>({
    queryKey: ['finance', 'summary', range],
    queryFn: () => apiFetch(`/admin/finance/summary${qs ? `?${qs}` : ''}`).then(r => r.json()),
    enabled: opts.enabled ?? true,
  })
}
