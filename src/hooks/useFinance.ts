import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiUpload } from '@/lib/api'
import { openBlob, saveBlob } from '@/utils/download'
import { todayYmd } from '@/utils/dates'

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
  // Vínculo opcional com o cadastro de onde vieram os dados do fornecedor: uma
  // pessoa (`usuarioId`) OU uma empresa (`empresaId`). Os demais campos ficam
  // como snapshot da emissão da nota.
  usuarioId?: string
  empresaId?: string
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

export type FinancePaymentMethod = {
  id: string
  name: string
  active: boolean
  order: number
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

// Molde do lançamento que se repete todo mês. Meses são texto "AAAA-MM".
export type FinanceRecurrence = {
  id: string
  type: FinanceType
  description: string
  amountCents: number
  /** Dia do lançamento (1–31); mês mais curto usa o último dia dele. */
  dayOfMonth: number
  startMonth: string
  endMonth: string | null
  lastGeneratedMonth: string | null
  paymentMethod: string | null
  notes: string | null
  active: boolean
  categoryId: string | null
  category: FinanceCategory | null
  accountId: string | null
  account: FinanceAccount | null
  createdAt: string
  updatedAt: string
}

export type RecurrenceInput = {
  type: FinanceType
  description: string
  amountCents: number
  dayOfMonth: number
  startMonth: string
  endMonth?: string | null
  paymentMethod?: string | null
  notes?: string | null
  categoryId?: string | null
  accountId?: string | null
  active?: boolean
}

// Fechamento/conferência de um mês em um caixa.
export type FinanceClosing = {
  id: string
  accountId: string
  month: string
  expectedBalanceCents: number
  countedBalanceCents: number
  /** contado − esperado (negativo = faltou dinheiro no caixa). */
  differenceCents: number
  notes: string | null
  closedAt: string
  closedByAdminId: string | null
}

// O que o sistema calculou para o mês/caixa, antes de fechar.
export type FinanceClosingPreview = {
  openingCents: number
  inCents: number
  outCents: number
  expectedBalanceCents: number
  differenceCents: number
  closing: FinanceClosing | null
}

export type FinanceTransaction = {
  id: string
  // null = "só nota" (sem lançamento no caixa; fora de saldo/KPIs).
  type: FinanceType | null
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
  /** Preenchido quando o lançamento nasceu de uma recorrência (+ o mês gerado). */
  recurringId: string | null
  recurringMonth: string | null
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
  /** Entradas e saídas de todos os lançamentos filtrados (não só da página);
   *  transferências entre caixas e "só nota" não contam. */
  totals?: { incomeCents: number; expenseCents: number }
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
  type: FinanceType | null
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
  /** Forma de pagamento (texto do lançamento; o backend ignora maiúsculas). */
  method?: string
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
  if (filters.method) p.set('method', filters.method)
  if (filters.search) p.set('search', filters.search)
  const s = p.toString()
  return s ? `?${s}` : ''
}

// Exporta os lançamentos filtrados como CSV (endpoint exige Bearer → download via blob).
// Sem page/limit: o CSV traz todos os lançamentos que batem com os filtros.
export async function exportFinanceTransactions(filters: TransactionFilters = {}) {
  const qs = buildQuery({ ...filters, page: undefined, limit: undefined })
  const res = await apiFetch(`/admin/finance/transactions/export${qs}`)
  saveBlob(await res.blob(), `lancamentos-${todayYmd()}.csv`)
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
  const res = await apiFetch(`/admin/finance/attachments/${attachmentId}`)
  openBlob(await res.blob())
}

// ── Recorrentes ──────────────────────────────────────────────────────────────
export function useFinanceRecurrences(
  opts: { includeInactive?: boolean; enabled?: boolean } = {},
) {
  return useQuery<FinanceRecurrence[]>({
    queryKey: ['finance', 'recurrences', opts.includeInactive ?? false],
    queryFn: () =>
      apiFetch(`/admin/finance/recurrences${opts.includeInactive ? '?all=true' : ''}`).then(r => r.json()),
    enabled: opts.enabled ?? true,
  })
}

export function useCreateFinanceRecurrence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RecurrenceInput) =>
      apiFetch('/admin/finance/recurrences', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => invalidateFinance(qc),
  })
}

export function useUpdateFinanceRecurrence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<RecurrenceInput> }) =>
      apiFetch(`/admin/finance/recurrences/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => invalidateFinance(qc),
  })
}

export function useDeleteFinanceRecurrence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/finance/recurrences/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateFinance(qc),
  })
}

/** Cria os lançamentos que faltam das recorrências ativas. Idempotente. */
export function useGenerateFinanceRecurrences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/admin/finance/recurrences/generate', { method: 'POST' })
      return (await res.json()) as { created: number }
    },
    onSuccess: r => { if (r.created > 0) invalidateFinance(qc) },
  })
}

// ── Formas de pagamento ──────────────────────────────────────────────────────
export function useFinancePaymentMethods(
  opts: { includeInactive?: boolean; enabled?: boolean } = {},
) {
  return useQuery<FinancePaymentMethod[]>({
    queryKey: ['finance', 'payment-methods', opts.includeInactive ?? false],
    queryFn: () =>
      apiFetch(`/admin/finance/payment-methods${opts.includeInactive ? '?all=true' : ''}`).then(r => r.json()),
    enabled: opts.enabled ?? true,
  })
}

export function useCreateFinancePaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await apiFetch('/admin/finance/payment-methods', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      return (await res.json()) as FinancePaymentMethod
    },
    onSuccess: () => invalidateFinance(qc),
  })
}

export function useDeleteFinancePaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/finance/payment-methods/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateFinance(qc),
  })
}

// ── Fechamento mensal ────────────────────────────────────────────────────────
export function useFinanceClosings(
  filters: { accountId?: string; year?: string } = {},
  opts: { enabled?: boolean } = {},
) {
  const p = new URLSearchParams()
  if (filters.accountId) p.set('accountId', filters.accountId)
  if (filters.year) p.set('year', filters.year)
  const qs = p.toString()
  return useQuery<FinanceClosing[]>({
    queryKey: ['finance', 'closings', filters],
    queryFn: () => apiFetch(`/admin/finance/closings${qs ? `?${qs}` : ''}`).then(r => r.json()),
    enabled: opts.enabled ?? true,
  })
}

/** Saldo esperado do caixa no mês (abertura + entradas − saídas). Não grava nada. */
export function useFinanceClosingPreview(
  params: { accountId?: string; month?: string },
  opts: { enabled?: boolean } = {},
) {
  const ready = !!params.accountId && !!params.month
  return useQuery<FinanceClosingPreview>({
    queryKey: ['finance', 'closing-preview', params],
    queryFn: () =>
      apiFetch(
        `/admin/finance/closings/preview?accountId=${params.accountId}&month=${params.month}`,
      ).then(r => r.json()),
    enabled: (opts.enabled ?? true) && ready,
  })
}

export function useCreateFinanceClosing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { accountId: string; month: string; countedBalanceCents: number; notes?: string | null }) =>
      apiFetch('/admin/finance/closings', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => invalidateFinance(qc),
  })
}

/** Reabre o mês: apaga o fechamento (os lançamentos ficam). */
export function useDeleteFinanceClosing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/finance/closings/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateFinance(qc),
  })
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
