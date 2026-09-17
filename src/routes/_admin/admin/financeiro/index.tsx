import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import { apiErrorMessage } from '@/lib/api-error-message'
import {
  useFinanceSummary, useFinanceCategories, useFinanceTransactions,
  useCreateFinanceTransaction, useUpdateFinanceTransaction, useDeleteFinanceTransaction,
  useCreateFinanceCategory, useUpdateFinanceCategory, useDeleteFinanceCategory,
  useFinanceAccounts, useCreateFinanceAccount, useUpdateFinanceAccount, useDeleteFinanceAccount,
  useCreateFinanceTransfer, fetchFinanceTransactionsForRange,
  useUploadFinanceAttachment, useDeleteFinanceAttachment, openFinanceAttachment, exportFinanceTransactions,
  type FinanceType, type FinanceCategory, type FinanceAccount, type FinanceTransaction, type TransactionFilters, type Empenho,
} from '@/hooks/useFinance'
import { centsToBRL, maskMoney, moneyToCents } from '@/utils/masks'
import { upperNoAccents } from '@/utils/text-format'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { todayYmd, toYmd } from '@/utils/dates'
import {
  Wallet, TrendingUp, TrendingDown, Scale, Plus, Pencil, Trash2, Search,
  Tag, ArrowUpCircle, ArrowDownCircle, Paperclip, FileText, X,
  Download, Landmark, ArrowLeftRight, FileDown, Receipt, ChevronDown, User,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAdminUsers, type UserDataDetail } from '@/hooks/useAdmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { ConfirmCloseDialog } from '@/components/confirm-close-dialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { NoPermission } from '@/components/NoPermission'
import { NativeSelect } from '@/components/ui/native-select'
import { Pagination } from '@/components/ui/pagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useCrudDialog } from '@/hooks/useCrudDialog'

type FinanceTab = 'dashboard' | 'lancamentos' | 'categorias' | 'caixas'
type FinanceSearch = {
  tab: FinanceTab
  from?: string
  to?: string
  fType?: FinanceType
  cat?: string
  acc?: string
  q?: string
  page?: number
}
const TABS: FinanceTab[] = ['dashboard', 'lancamentos', 'categorias', 'caixas']
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined
}

export const Route = createFileRoute('/_admin/admin/financeiro/')({
  // Estado da tela (aba + filtros dos lançamentos) vive na URL: sobrevive a
  // voltar/atualizar e pode ser compartilhado por link.
  validateSearch: (s: Record<string, unknown>): FinanceSearch => {
    const page = Number(s.page)
    return {
      tab: TABS.includes(s.tab as FinanceTab) ? (s.tab as FinanceTab) : 'dashboard',
      from: str(s.from),
      to: str(s.to),
      fType: s.fType === 'IN' || s.fType === 'OUT' ? s.fType : undefined,
      cat: str(s.cat),
      acc: str(s.acc),
      q: str(s.q),
      page: Number.isFinite(page) && page > 1 ? page : undefined,
    }
  },
  component: RouteComponent,
})

function EmpInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input className="h-8 text-sm" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

// ── Helpers de data ──────────────────────────────────────────────────────────
const MONTHS_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS_ABBR[(m ?? 1) - 1]}/${String(y).slice(2)}`
}
type Preset = 'month' | 'year' | 'last12'
function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const to = toYmd(now)
  if (p === 'month') return { from: toYmd(new Date(y, m, 1)), to }
  if (p === 'year') return { from: toYmd(new Date(y, 0, 1)), to }
  return { from: toYmd(new Date(y, m - 11, 1)), to }
}

function RouteComponent() {
  const { can, isLoading: permLoading } = usePermissions()
  const enabled = !permLoading && can('READ_FINANCE')
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const setSearch = (patch: Partial<FinanceSearch>) =>
    navigate({ search: prev => ({ ...prev, ...patch }), replace: true })

  if (!permLoading && !can('READ_FINANCE')) {
    return <NoPermission message="Você não tem permissão para ver o Financeiro." />
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          Controle de entradas e saídas de caixa, com dashboard e categorização.
        </p>
      </div>

      <Tabs value={search.tab} onValueChange={v => setSearch({ tab: v as FinanceTab })}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="caixas">Caixas</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <DashboardTab enabled={enabled} onDrill={patch => setSearch({ tab: 'lancamentos', page: undefined, cat: undefined, acc: undefined, q: undefined, ...patch })} />
        </TabsContent>
        <TabsContent value="lancamentos" className="mt-6">
          <TransactionsTab enabled={enabled} search={search} setSearch={setSearch} canCreate={can('CREATE_FINANCE')} canUpdate={can('UPDATE_FINANCE')} canDelete={can('DELETE_FINANCE')} />
        </TabsContent>
        <TabsContent value="categorias" className="mt-6">
          <CategoriesTab enabled={enabled} canCreate={can('CREATE_FINANCE')} canUpdate={can('UPDATE_FINANCE')} canDelete={can('DELETE_FINANCE')} />
        </TabsContent>
        <TabsContent value="caixas" className="mt-6">
          <AccountsTab enabled={enabled} canCreate={can('CREATE_FINANCE')} canUpdate={can('UPDATE_FINANCE')} canDelete={can('DELETE_FINANCE')} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardTab({ enabled, onDrill }: {
  enabled: boolean
  onDrill: (patch: Partial<FinanceSearch>) => void
}) {
  const [preset, setPreset] = useState<Preset | 'custom'>('year')
  const [custom, setCustom] = useState({ from: presetRange('month').from, to: todayYmd() })
  const range = useMemo(
    () => (preset === 'custom' ? custom : presetRange(preset)),
    [preset, custom],
  )
  const { data, isLoading, isError } = useFinanceSummary(range, { enabled })
  const [pdfBusy, setPdfBusy] = useState(false)

  async function handlePdf() {
    if (!data) return
    setPdfBusy(true)
    try {
      // Carrega a lib de PDF (~1,4 MB) só no clique — fora do bundle da rota.
      const [{ downloadFinanceReportPdf }, txns] = await Promise.all([
        import('@/lib/finance-report-pdf'),
        fetchFinanceTransactionsForRange(range),
      ])
      await downloadFinanceReportPdf(data, txns, range)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao gerar o PDF.'))
    } finally {
      setPdfBusy(false)
    }
  }

  const kpis = [
    { label: 'Saldo em caixa', value: data?.balanceAllTimeCents ?? 0, icon: Scale, tone: 'neutral' as const, hint: 'Acumulado (todas as datas)', drill: undefined as Partial<FinanceSearch> | undefined },
    { label: 'Entradas', value: data?.periodInCents ?? 0, icon: TrendingUp, tone: 'in' as const, hint: 'No período', drill: { fType: 'IN' as FinanceType, from: range.from, to: range.to } },
    { label: 'Saídas', value: data?.periodOutCents ?? 0, icon: TrendingDown, tone: 'out' as const, hint: 'No período', drill: { fType: 'OUT' as FinanceType, from: range.from, to: range.to } },
    { label: 'Resultado', value: data?.periodResultCents ?? 0, icon: Wallet, tone: 'result' as const, hint: 'Entradas − Saídas', drill: undefined as Partial<FinanceSearch> | undefined },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Período:</span>
        {([['month', 'Este mês'], ['year', 'Este ano'], ['last12', 'Últimos 12 meses'], ['custom', 'Personalizado']] as const).map(([p, lbl]) => (
          <Button key={p} size="sm" variant={preset === p ? 'default' : 'outline'} className="h-8" onClick={() => setPreset(p)}>
            {lbl}
          </Button>
        ))}
        {preset === 'custom' && (
          <span className="inline-flex items-center gap-2">
            <Input type="date" className="h-8 w-[150px]" value={custom.from} max={custom.to} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} aria-label="Data inicial" />
            <span className="text-muted-foreground text-sm">até</span>
            <Input type="date" className="h-8 w-[150px]" value={custom.to} min={custom.from} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} aria-label="Data final" />
          </span>
        )}
        <Button size="sm" variant="outline" className="h-8 ml-auto" disabled={pdfBusy || isLoading || !data} onClick={handlePdf}>
          <FileDown className="size-4" /> {pdfBusy ? 'Gerando...' : 'Baixar PDF'}
        </Button>
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar o resumo financeiro." />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(k => {
          const cls = `rounded-xl border border-border bg-card p-4 flex flex-col gap-2 text-left ${
            k.drill ? 'transition-colors hover:bg-muted/50 cursor-pointer' : ''
          }`
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</span>
                <k.icon className={`size-4 ${
                  k.tone === 'in' ? 'text-emerald-600 dark:text-emerald-400'
                    : k.tone === 'out' ? 'text-red-600 dark:text-red-400'
                    : 'text-muted-foreground'
                }`} />
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-28" />
              ) : (
                <span className={`text-2xl font-bold tabular-nums ${
                  k.tone === 'result' && k.value < 0 ? 'text-red-600 dark:text-red-400'
                    : k.tone === 'result' ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-foreground'
                }`}>
                  {centsToBRL(k.value)}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">{k.drill ? 'Ver lançamentos →' : k.hint}</span>
            </>
          )
          return k.drill ? (
            <button key={k.label} type="button" title="Ver lançamentos" onClick={() => onDrill(k.drill!)} className={cls}>{inner}</button>
          ) : (
            <div key={k.label} className={cls}>{inner}</div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Entradas × Saídas por mês</h3>
          {isLoading ? <Skeleton className="h-56 w-full" /> : <MonthlyChart data={data?.byMonth ?? []} />}
        </div>
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Saídas por categoria</h3>
          {isLoading ? <Skeleton className="h-56 w-full" /> : (
            <CategoryBreakdown items={(data?.byCategory ?? []).filter(c => c.type === 'OUT')} />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Saldo por caixa</h3>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (data?.byAccount ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum caixa com movimento.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.byAccount ?? []).map(a => (
              <div key={a.accountId ?? 'none'} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-sm text-foreground">
                  <Landmark className="size-4" style={{ color: a.color }} />
                  {a.name}
                </span>
                <span className={`tabular-nums font-semibold ${a.balanceCents < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                  {centsToBRL(a.balanceCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MonthlyChart({ data }: { data: { month: string; inCents: number; outCents: number }[] }) {
  if (data.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Sem lançamentos no período.</p>
  }
  const max = Math.max(1, ...data.flatMap(d => [d.inCents, d.outCents]))
  const chartH = 180
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-4" style={{ minWidth: data.length * 56 }}>
        {data.map(d => (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-2" style={{ minWidth: 40 }}>
            <div className="flex items-end gap-1" style={{ height: chartH }}>
              <div
                className="w-4 rounded-t bg-emerald-500 dark:bg-emerald-400"
                style={{ height: Math.max(2, (d.inCents / max) * chartH) }}
                title={`Entradas: ${centsToBRL(d.inCents)}`}
              />
              <div
                className="w-4 rounded-t bg-red-500 dark:bg-red-400"
                style={{ height: Math.max(2, (d.outCents / max) * chartH) }}
                title={`Saídas: ${centsToBRL(d.outCents)}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{monthLabel(d.month)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-400" /> Entradas</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-red-500 dark:bg-red-400" /> Saídas</span>
      </div>
    </div>
  )
}

function CategoryBreakdown({ items }: { items: { categoryId: string | null; name: string; color: string; totalCents: number }[] }) {
  if (items.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Sem saídas no período.</p>
  }
  const total = items.reduce((s, c) => s + c.totalCents, 0)
  return (
    <div className="flex flex-col gap-3">
      {items.map(c => {
        const pct = total > 0 ? (c.totalCents / total) * 100 : 0
        return (
          <div key={c.categoryId ?? c.name} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
                {c.name}
              </span>
              <span className="tabular-nums text-muted-foreground">{centsToBRL(c.totalCents)} · {pct.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Lançamentos ───────────────────────────────────────────────────────────────
// Campos da Nota de Empenho no formulário (tudo string; desconto é máscara R$).
type EmpForm = {
  numero: string; notaFiscal: string; nomeFantasia: string; razaoSocial: string
  cnpjCpf: string; inscricaoEstadual: string; endereco: string; bairro: string
  cep: string; cidade: string; uf: string; telefone: string; desconto: string
  banco: string; conta: string; agencia: string; cheque: string
  usuarioId?: string; usuarioNome?: string
}
const emptyEmp = (): EmpForm => ({
  numero: '', notaFiscal: '', nomeFantasia: '', razaoSocial: '', cnpjCpf: '', inscricaoEstadual: '',
  endereco: '', bairro: '', cep: '', cidade: '', uf: '', telefone: '', desconto: '',
  banco: '', conta: '', agencia: '', cheque: '',
})
function empFromData(e?: Empenho | null): EmpForm {
  return {
    ...emptyEmp(),
    numero: e?.numero ?? '', notaFiscal: e?.notaFiscal ?? '', nomeFantasia: e?.nomeFantasia ?? '',
    razaoSocial: e?.razaoSocial ?? '', cnpjCpf: e?.cnpjCpf ?? '', inscricaoEstadual: e?.inscricaoEstadual ?? '',
    endereco: e?.endereco ?? '', bairro: e?.bairro ?? '', cep: e?.cep ?? '', cidade: e?.cidade ?? '',
    uf: e?.uf ?? '', telefone: e?.telefone ?? '', desconto: e?.descontoCents ? maskMoney(String(e.descontoCents)) : '',
    banco: e?.banco ?? '', conta: e?.conta ?? '', agencia: e?.agencia ?? '', cheque: e?.cheque ?? '',
    usuarioId: e?.usuarioId,
  }
}
function empToBody(f: EmpForm): Empenho | null {
  const descontoCents = moneyToCents(f.desconto)
  const b: Empenho = {}
  const s = (v: string) => (v.trim() ? v.trim() : undefined)
  b.numero = s(f.numero); b.notaFiscal = s(f.notaFiscal); b.nomeFantasia = s(f.nomeFantasia)
  b.razaoSocial = s(f.razaoSocial); b.cnpjCpf = s(f.cnpjCpf); b.inscricaoEstadual = s(f.inscricaoEstadual)
  b.endereco = s(f.endereco); b.bairro = s(f.bairro); b.cep = s(f.cep); b.cidade = s(f.cidade)
  b.uf = s(f.uf); b.telefone = s(f.telefone); b.banco = s(f.banco); b.conta = s(f.conta)
  b.agencia = s(f.agencia); b.cheque = s(f.cheque)
  if (descontoCents > 0) b.descontoCents = descontoCents
  if (f.usuarioId) b.usuarioId = f.usuarioId
  const hasAny = Object.values(b).some(v => v !== undefined)
  return hasAny ? b : null
}

// Mapeia um Usuário cadastrado para os campos do fornecedor na nota. Só
// preenche o que o cadastro de usuário tem; IE, banco/conta ficam manuais.
function empFromUser(u: UserDataDetail): Partial<EmpForm> {
  const addr = u.properties?.[0]?.address ?? u.address ?? null
  const endereco = [addr?.street, addr?.number].filter(Boolean).join(', ')
  return {
    usuarioId: u.id,
    usuarioNome: u.name,
    razaoSocial: u.name ?? '',
    nomeFantasia: u.nickname ?? u.name ?? '',
    cnpjCpf: u.cpf ?? '',
    telefone: u.phone ?? '',
    endereco,
    bairro: addr?.neighborhood ?? '',
    cep: addr?.zipCode ?? '',
    cidade: addr?.city ?? '',
    uf: addr?.state ?? '',
  }
}

// Busca um Usuário cadastrado e preenche os dados do fornecedor na nota.
// Quando já vinculado, mostra o vínculo com opção de desvincular.
function VincularUsuario({ current, onPick, onClear }: {
  current?: { id?: string; nome?: string }
  onPick: (u: UserDataDetail) => void
  onClear: () => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const dq = useDebouncedValue(q, 300).trim()

  const { data, isFetching } = useAdminUsers({ search: dq, limit: 6 })
  const results = dq.length >= 2 ? (data?.data ?? []) : []

  async function pick(id: string) {
    setLoadingId(id)
    try {
      const detail: UserDataDetail = await apiFetch(`/admin/users/${id}`).then(r => r.json())
      onPick(detail)
      setQ(''); setOpen(false)
    } catch {
      toast.error('Não foi possível carregar o usuário.')
    } finally {
      setLoadingId(null)
    }
  }

  if (current?.id) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <User className="size-4" /> Vinculado a{' '}
          <strong className="text-foreground">{current.nome ?? 'usuário cadastrado'}</strong>
        </span>
        <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={onClear}>
          <X className="size-3.5" /> Desvincular
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Vincular a um usuário (nome, CPF/CNPJ)…"
          className="pl-10 text-sm"
        />
      </div>
      {open && dq.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {isFetching && <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>}
          {!isFetching && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum usuário encontrado.</div>
          )}
          {results.map(u => (
            <button
              key={u.id}
              type="button"
              disabled={loadingId !== null}
              onMouseDown={e => e.preventDefault()}
              onClick={() => pick(u.id)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
            >
              <span className="truncate">{u.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{u.cpf ?? ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type TxForm = {
  type: FinanceType | null
  amount: string
  date: string
  description: string
  method: string
  categoryId: string
  accountId: string
  notes: string
  empenho: EmpForm
}
const emptyTxForm = (): TxForm => ({
  type: 'OUT', amount: '', date: todayYmd(), description: '', method: '', categoryId: '', accountId: '', notes: '',
  empenho: emptyEmp(),
})

function TransactionsTab({ enabled, search, setSearch, canCreate, canUpdate, canDelete }: {
  enabled: boolean
  search: FinanceSearch
  setSearch: (patch: Partial<FinanceSearch>) => void
  canCreate: boolean; canUpdate: boolean; canDelete: boolean
}) {
  const page = search.page ?? 1
  const filters: TransactionFilters = useMemo(() => ({
    page, limit: 20,
    from: search.from, to: search.to,
    type: search.fType ?? '',
    categoryId: search.cat, accountId: search.acc, search: search.q,
  }), [page, search.from, search.to, search.fType, search.cat, search.acc, search.q])
  const { data, isLoading, isError } = useFinanceTransactions(filters, { enabled })
  const { data: categories } = useFinanceCategories({ enabled })
  const { data: accounts } = useFinanceAccounts({ enabled })
  const createTx = useCreateFinanceTransaction()
  const updateTx = useUpdateFinanceTransaction()
  const deleteTx = useDeleteFinanceTransaction()
  const createTransfer = useCreateFinanceTransfer()
  const uploadAtt = useUploadFinanceAttachment()
  const deleteAtt = useDeleteFinanceAttachment()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<TxForm>(emptyTxForm)
  const [formSnapshot, setFormSnapshot] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FinanceTransaction | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingInputRef = useRef<HTMLInputElement>(null)
  // Comprovantes escolhidos antes do lançamento existir (fluxo "Novo") — sobem após o create.
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  // Transferência entre caixas.
  const [transferOpen, setTransferOpen] = useState(false)
  const [transfer, setTransfer] = useState({ fromAccountId: '', toAccountId: '', amount: '', date: todayYmd(), description: '' })
  const [transferError, setTransferError] = useState<string | null>(null)

  const rows = data?.data ?? []
  // Lançamento em edição — reflete os comprovantes atualizados após cada upload.
  const editingTx = editId ? rows.find(r => r.id === editId) ?? null : null
  const totalPages = data?.totalPages ?? 1
  const cats = categories ?? []
  const accs = accounts ?? []
  const catsForType = form.type ? cats.filter(c => c.type === form.type) : []
  const [exporting, setExporting] = useState(false)

  // Busca: campo local com debounce → grava em `q` na URL (evita 1 request/tecla).
  const [searchInput, setSearchInput] = useState(search.q ?? '')
  useEffect(() => { setSearchInput(search.q ?? '') }, [search.q])
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  useEffect(() => {
    const q = debouncedSearch.trim() || undefined
    if (q !== (search.q ?? undefined)) setSearch({ q, page: undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, search.q])

  function setF<K extends keyof TxForm>(k: K, v: TxForm[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }
  function setEmp<K extends keyof EmpForm>(k: K, v: string) {
    setForm(prev => ({ ...prev, empenho: { ...prev.empenho, [k]: v } }))
  }
  const [empenhoOpen, setEmpenhoOpen] = useState(false)
  const [notaBusy, setNotaBusy] = useState<string | null>(null)
  async function gerarNota(t: { id?: string; amountCents: number; date: string; description: string; empenho: Empenho | null }) {
    setNotaBusy(t.id ?? 'preview')
    try {
      const { downloadNotaEmpenho } = await import('@/lib/nota-empenho-pdf')
      await downloadNotaEmpenho(t)
    } catch {
      toast.error('Erro ao gerar a Nota de Empenho.')
    } finally {
      setNotaBusy(null)
    }
  }

  function abrirNovo() {
    setEditId(null)
    const f = emptyTxForm()
    setForm(f)
    setFormSnapshot(JSON.stringify(f))
    setPendingFiles([])
    setError(null)
    setDialogOpen(true)
  }

  function abrirEditar(t: FinanceTransaction) {
    setEditId(t.id)
    const f: TxForm = {
      type: t.type,
      amount: maskMoney(String(t.amountCents)),
      date: t.date.slice(0, 10),
      description: t.description,
      method: t.method ?? '',
      categoryId: t.categoryId ?? '',
      accountId: t.accountId ?? '',
      notes: t.notes ?? '',
      empenho: empFromData(t.empenho),
    }
    setForm(f)
    setFormSnapshot(JSON.stringify(f))
    setPendingFiles([])
    setError(null)
    setDialogOpen(true)
  }

  const formDirty = JSON.stringify(form) !== formSnapshot || pendingFiles.length > 0
  function requestCloseDialog() {
    if (formDirty) setConfirmClose(true)
    else setDialogOpen(false)
  }

  async function handleSubmit() {
    setError(null)
    const amountCents = moneyToCents(form.amount)
    if (amountCents <= 0) { setError('Informe um valor maior que zero.'); return }
    if (!form.description.trim()) { setError('Informe a descrição.'); return }
    const body = {
      type: form.type,
      amountCents,
      date: form.date,
      description: form.description.trim(),
      method: form.method.trim() || null,
      categoryId: form.categoryId || null,
      accountId: form.accountId || null,
      notes: form.notes.trim() || null,
      empenho: empToBody(form.empenho),
    }
    try {
      if (editId) {
        await updateTx.mutateAsync({ id: editId, body })
        toast.success('Lançamento atualizado!')
      } else {
        const resp = await createTx.mutateAsync(body)
        const created = await resp.json()
        // Sobe os comprovantes escolhidos no fluxo "Novo" para o lançamento recém-criado.
        if (created?.id && pendingFiles.length > 0) {
          for (const file of pendingFiles) {
            try { await uploadAtt.mutateAsync({ transactionId: created.id, file }) }
            catch { toast.error(`Falha ao anexar "${file.name}".`) }
          }
        }
        toast.success('Lançamento registrado!')
      }
      setDialogOpen(false)
    } catch (e) {
      const msg = apiErrorMessage(e, 'Erro ao salvar o lançamento.')
      setError(msg)
      toast.error(msg)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteTx.mutateAsync(deleteTarget.id)
      toast.success('Lançamento removido.')
      setDeleteTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover o lançamento.'))
    }
  }

  async function handleUploadAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editId) return
    try {
      await uploadAtt.mutateAsync({ transactionId: editId, file })
      toast.success('Comprovante anexado!')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao anexar o comprovante.'))
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDeleteAttachment(id: string) {
    try {
      await deleteAtt.mutateAsync(id)
      toast.success('Comprovante removido.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao remover o comprovante.'))
    }
  }

  async function handleOpenAttachment(id: string) {
    try { await openFinanceAttachment(id) }
    catch { toast.error('Erro ao abrir o comprovante.') }
  }

  function handlePickPending(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPendingFiles(prev => [...prev, file])
    if (pendingInputRef.current) pendingInputRef.current.value = ''
  }

  async function handleExport() {
    setExporting(true)
    try {
      await exportFinanceTransactions(filters)
    } catch {
      toast.error('Erro ao exportar.')
    } finally {
      setExporting(false)
    }
  }

  function abrirTransferencia() {
    setTransfer({ fromAccountId: '', toAccountId: '', amount: '', date: todayYmd(), description: '' })
    setTransferError(null)
    setTransferOpen(true)
  }

  async function handleTransfer() {
    setTransferError(null)
    const amountCents = moneyToCents(transfer.amount)
    if (!transfer.fromAccountId || !transfer.toAccountId) { setTransferError('Escolha os caixas de origem e destino.'); return }
    if (transfer.fromAccountId === transfer.toAccountId) { setTransferError('Origem e destino devem ser diferentes.'); return }
    if (amountCents <= 0) { setTransferError('Informe um valor maior que zero.'); return }
    try {
      await createTransfer.mutateAsync({
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        amountCents,
        date: transfer.date,
        description: transfer.description.trim() || undefined,
      })
      toast.success('Transferência registrada!')
      setTransferOpen(false)
    } catch (e) {
      const msg = apiErrorMessage(e, 'Erro ao transferir.')
      setTransferError(msg)
      toast.error(msg)
    }
  }

  // Inclui o upload dos comprovantes: o diálogo só fecha depois que todos sobem
  // (fluxo "Novo"), então o botão deve continuar travado até lá — senão o usuário
  // clica de novo e cria um lançamento duplicado.
  const saving = createTx.isPending || updateTx.isPending || uploadAtt.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">De</Label>
            <Input type="date" className="h-9 w-[150px]" value={search.from ?? ''} onChange={e => setSearch({ from: e.target.value || undefined, page: undefined })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Até</Label>
            <Input type="date" className="h-9 w-[150px]" value={search.to ?? ''} onChange={e => setSearch({ to: e.target.value || undefined, page: undefined })} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Tipo</Label>
            <NativeSelect className="h-9" value={search.fType ?? ''} onChange={e => setSearch({ fType: (e.target.value || undefined) as FinanceType | undefined, page: undefined })}>
              <option value="">Todos</option>
              <option value="IN">Entradas</option>
              <option value="OUT">Saídas</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Categoria</Label>
            <NativeSelect className="h-9" value={search.cat ?? ''} onChange={e => setSearch({ cat: e.target.value || undefined, page: undefined })}>
              <option value="">Todas</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Caixa</Label>
            <NativeSelect className="h-9" value={search.acc ?? ''} onChange={e => setSearch({ acc: e.target.value || undefined, page: undefined })}>
              <option value="">Todos</option>
              {accs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </NativeSelect>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="shrink-0" disabled={exporting || rows.length === 0} onClick={handleExport}>
            <Download className="size-4" /> {exporting ? 'Exportando...' : 'Exportar CSV'}
          </Button>
          {canCreate && accs.length >= 2 && (
            <Button variant="outline" onClick={abrirTransferencia} className="shrink-0">
              <ArrowLeftRight className="size-4" /> Transferir
            </Button>
          )}
          {canCreate && (
            <Button onClick={abrirNovo} className="shrink-0">
              <Plus className="size-4" /> Novo lançamento
            </Button>
          )}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Buscar na descrição..." className="pl-9" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar os lançamentos." />}

      {/* Mobile: cada lançamento como cartão (tabela só rola de lado, ruim no celular). */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3"><Skeleton className="h-4 w-40 mb-2" /><Skeleton className="h-4 w-24" /></div>
        ))}
        {!isLoading && rows.length === 0 && (
          <div className="rounded-lg border border-border bg-card py-12 text-center">
            <Wallet className="size-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Nenhum lançamento</p>
            <p className="text-xs text-muted-foreground mt-1">{canCreate ? 'Toque em "Novo lançamento".' : 'Nada com esses filtros.'}</p>
          </div>
        )}
        {rows.map(t => (
          <div key={t.id} className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-start gap-2 font-medium text-foreground min-w-0">
                {t.transferId
                  ? <ArrowLeftRight className="size-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
                  : t.type === 'IN'
                    ? <ArrowUpCircle className="size-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    : t.type === 'OUT'
                      ? <ArrowDownCircle className="size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                      : <Receipt className="size-4 shrink-0 mt-0.5 text-muted-foreground" />}
                <span className="min-w-0 break-words">{t.description}</span>
              </span>
              <span className={`tabular-nums font-semibold whitespace-nowrap ${t.type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : t.type === 'OUT' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                {t.type === 'IN' ? '+ ' : t.type === 'OUT' ? '− ' : ''}{centsToBRL(t.amountCents)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {!t.type && !t.transferId && <Badge variant="outline" className="text-muted-foreground">Nota</Badge>}
              <span className="tabular-nums">{formatDateFromString(t.date.slice(0, 10))}</span>
              {t.category && <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm" style={{ backgroundColor: t.category.color }} />{t.category.name}</span>}
              {t.account && <span className="inline-flex items-center gap-1"><Landmark className="size-3" style={{ color: t.account.color }} />{t.account.name}</span>}
              {t.attachments.length > 0 && (
                <button type="button" onClick={() => handleOpenAttachment(t.attachments[0].id)} className="inline-flex items-center gap-0.5 text-foreground"><Paperclip className="size-3" />{t.attachments.length}</button>
              )}
              <span className="ml-auto flex items-center gap-1">
                {!t.transferId && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" disabled={notaBusy === t.id} onClick={() => gerarNota(t)} aria-label="Gerar Nota de Empenho"><Receipt className="size-4" /></Button>
                )}
                {canUpdate && !t.transferId && (
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => abrirEditar(t)} aria-label="Editar"><Pencil className="size-4" /></Button>
                )}
                {canDelete && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(t)} aria-label="Excluir"><Trash2 className="size-4" /></Button>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="hidden lg:table-cell">Caixa</TableHead>
                <TableHead className="hidden md:table-cell">Método</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <Wallet className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">Nenhum lançamento</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {canCreate ? 'Clique em "Novo lançamento" para registrar.' : 'Nada encontrado com esses filtros.'}
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {rows.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums text-xs">
                    {formatDateFromString(t.date.slice(0, 10))}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    <span className="inline-flex items-center gap-2">
                      {t.transferId
                        ? <ArrowLeftRight className="size-4 shrink-0 text-sky-600 dark:text-sky-400" />
                        : t.type === 'IN'
                          ? <ArrowUpCircle className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          : t.type === 'OUT'
                            ? <ArrowDownCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
                            : <Receipt className="size-4 shrink-0 text-muted-foreground" />}
                      {t.description}
                      {!t.type && !t.transferId && <Badge variant="outline" className="text-muted-foreground">Nota</Badge>}
                      {t.attachments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenAttachment(t.attachments[0].id)}
                          title={`${t.attachments.length} comprovante(s) — abrir`}
                          className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          <Paperclip className="size-3" />{t.attachments.length}
                        </button>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    {t.category ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                        <span className="size-2.5 rounded-sm" style={{ backgroundColor: t.category.color }} />
                        {t.category.name}
                      </span>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                    {t.account ? (
                      <span className="inline-flex items-center gap-1.5 text-foreground">
                        <Landmark className="size-3.5" style={{ color: t.account.color }} />
                        {t.account.name}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{t.method || '—'}</TableCell>
                  <TableCell className={`text-right tabular-nums font-medium ${
                    t.type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : t.type === 'OUT' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                  }`}>
                    {t.type === 'IN' ? '+ ' : t.type === 'OUT' ? '− ' : ''}{centsToBRL(t.amountCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!t.transferId && (
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground" disabled={notaBusy === t.id} onClick={() => gerarNota(t)} aria-label="Gerar Nota de Empenho" title="Gerar Nota de Empenho">
                          <Receipt className="size-4" />
                        </Button>
                      )}
                      {canUpdate && !t.transferId && (
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => abrirEditar(t)} aria-label="Editar" title="Editar">
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(t)} aria-label="Excluir" title="Excluir">
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                      {(!canUpdate || t.transferId) && !canDelete && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {(data?.total ?? 0) > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={data?.total ?? 0}
          limit={20}
          onPageChange={p => setSearch({ page: p <= 1 ? undefined : p })}
          showLimitSelector={false}
        />
      )}

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir entre caixas</DialogTitle>
            <DialogDescription>Move dinheiro de um caixa para outro. Não conta como entrada nem saída.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>De *</Label>
                <NativeSelect value={transfer.fromAccountId} onChange={e => setTransfer(p => ({ ...p, fromAccountId: e.target.value }))}>
                  <option value="">Origem</option>
                  {accs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </NativeSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Para *</Label>
                <NativeSelect value={transfer.toAccountId} onChange={e => setTransfer(p => ({ ...p, toAccountId: e.target.value }))}>
                  <option value="">Destino</option>
                  {accs.filter(a => a.id !== transfer.fromAccountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </NativeSelect>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Valor *</Label>
                <Input inputMode="numeric" placeholder="R$ 0,00" value={transfer.amount} onChange={e => setTransfer(p => ({ ...p, amount: maskMoney(e.target.value) }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Data *</Label>
                <Input type="date" value={transfer.date} onChange={e => setTransfer(p => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Descrição</Label>
              <Input value={transfer.description} onChange={e => setTransfer(p => ({ ...p, description: e.target.value }))} placeholder="Opcional (ex: reforço de caixa)" />
            </div>
            {transferError && <p className="text-sm text-destructive">{transferError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancelar</Button>
            <Button onClick={handleTransfer} disabled={createTransfer.isPending}>
              {createTransfer.isPending ? 'Transferindo...' : 'Transferir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={o => { if (o) setDialogOpen(true); else requestCloseDialog() }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar lançamento' : 'Novo lançamento'}</DialogTitle>
            <DialogDescription>Entrada ou saída de caixa. Valor em reais.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, type: 'IN', categoryId: '' }))}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
                  form.type === 'IN' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-input text-muted-foreground'
                }`}
              >
                <ArrowUpCircle className="size-4" /> Entrada
              </button>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, type: 'OUT', categoryId: '' }))}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
                  form.type === 'OUT' ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400' : 'border-input text-muted-foreground'
                }`}
              >
                <ArrowDownCircle className="size-4" /> Saída
              </button>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, type: null, categoryId: '' }))}
                title="Não lança no caixa — só gera a Nota de Empenho"
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
                  form.type === null ? 'border-slate-500 bg-slate-500/10 text-slate-700 dark:text-slate-300' : 'border-input text-muted-foreground'
                }`}
              >
                <Receipt className="size-4" /> Só nota
              </button>
            </div>
            {form.type === null && (
              <p className="-mt-2 text-xs text-muted-foreground">
                Sem lançamento no caixa: não entra em saldo nem nos totais. Você pode editar depois para Entrada/Saída.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Valor *</Label>
                <Input inputMode="numeric" placeholder="R$ 0,00" value={form.amount} onChange={e => setF('amount', maskMoney(e.target.value))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Data *</Label>
                <Input type="date" value={form.date} onChange={e => setF('date', e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Descrição *</Label>
              <Input value={form.description} onChange={e => setF('description', upperNoAccents(e.target.value))} placeholder="Ex: Compra de material de escritório" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Categoria</Label>
                <NativeSelect
                  value={form.categoryId}
                  disabled={form.type === null}
                  title={form.type === null ? 'Categoria só para Entrada/Saída' : undefined}
                  onChange={e => setF('categoryId', e.target.value)}
                >
                  <option value="">{form.type === null ? '—' : 'Sem categoria'}</option>
                  {catsForType.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  {/* Categoria do lançamento em edição que foi desativada depois: não
                      vem na lista de ativas, então garantimos a opção pra não zerar. */}
                  {form.categoryId && !catsForType.some(c => c.id === form.categoryId) && (
                    <option value={form.categoryId}>
                      {editingTx?.category?.name ?? 'Categoria atual'}
                      {editingTx?.category && !editingTx.category.active ? ' (inativa)' : ''}
                    </option>
                  )}
                </NativeSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Caixa</Label>
                <NativeSelect value={form.accountId} onChange={e => setF('accountId', e.target.value)}>
                  <option value="">Sem caixa</option>
                  {accs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </NativeSelect>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Método</Label>
              <Input value={form.method} onChange={e => setF('method', e.target.value)} placeholder="Ex: PIX, Dinheiro" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Observações</Label>
              <Input value={form.notes} onChange={e => setF('notes', upperNoAccents(e.target.value))} placeholder="Opcional" />
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3">
              <Label className="text-xs">Comprovantes</Label>
              {editId ? (
                <>
                  {(editingTx?.attachments ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum comprovante anexado.</p>
                  )}
                  {(editingTx?.attachments ?? []).map(a => (
                    <div key={a.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <button type="button" onClick={() => handleOpenAttachment(a.id)} className="flex-1 truncate text-left text-xs text-foreground hover:underline" title={a.filename}>
                        {a.filename}
                      </button>
                      <button type="button" onClick={() => handleDeleteAttachment(a.id)} disabled={deleteAtt.isPending} className="text-muted-foreground hover:text-destructive" aria-label="Remover comprovante" title="Remover">
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                  <input ref={fileInputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={handleUploadAttachment} />
                  <Button type="button" variant="outline" size="sm" className="w-fit" disabled={uploadAtt.isPending} onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="size-4" /> {uploadAtt.isPending ? 'Enviando...' : 'Anexar comprovante'}
                  </Button>
                  <span className="text-[11px] text-muted-foreground">PDF, JPG, PNG ou WEBP — até 15MB.</span>
                </>
              ) : (
                <>
                  {pendingFiles.length === 0 && (
                    <p className="text-xs text-muted-foreground">Anexe agora — sobem automaticamente ao registrar.</p>
                  )}
                  {pendingFiles.map((f, i) => (
                    <div key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate text-xs text-foreground" title={f.name}>{f.name}</span>
                      <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive" aria-label="Remover" title="Remover">
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                  <input ref={pendingInputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={handlePickPending} />
                  <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => pendingInputRef.current?.click()}>
                    <Paperclip className="size-4" /> Anexar comprovante
                  </Button>
                  <span className="text-[11px] text-muted-foreground">PDF, JPG, PNG ou WEBP — até 15MB.</span>
                </>
              )}
            </div>

            {/* Nota de Empenho (fornecedor / NF / banco) — colapsável */}
            <div className="rounded-lg border border-border bg-muted/20">
              <button type="button" onClick={() => setEmpenhoOpen(o => !o)} className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-foreground">
                <span className="inline-flex items-center gap-2"><Receipt className="size-4" /> Nota de Empenho</span>
                <ChevronDown className={`size-4 transition-transform ${empenhoOpen ? 'rotate-180' : ''}`} />
              </button>
              {empenhoOpen && (
                <div className="flex flex-col gap-3 border-t border-border p-3">
                  <VincularUsuario
                    current={form.empenho.usuarioId ? { id: form.empenho.usuarioId, nome: form.empenho.usuarioNome } : undefined}
                    onPick={u => setForm(prev => ({ ...prev, empenho: { ...prev.empenho, ...empFromUser(u) } }))}
                    onClear={() => setForm(prev => ({ ...prev, empenho: { ...prev.empenho, usuarioId: undefined, usuarioNome: undefined } }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <EmpInput label="Nº empenho" value={form.empenho.numero} onChange={v => setEmp('numero', v)} />
                    <EmpInput label="Nota fiscal Nº" value={form.empenho.notaFiscal} onChange={v => setEmp('notaFiscal', v)} />
                  </div>
                  <EmpInput label="Nome fantasia" value={form.empenho.nomeFantasia} onChange={v => setEmp('nomeFantasia', upperNoAccents(v))} />
                  <EmpInput label="Razão social" value={form.empenho.razaoSocial} onChange={v => setEmp('razaoSocial', upperNoAccents(v))} />
                  <div className="grid grid-cols-2 gap-2">
                    <EmpInput label="CNPJ / CPF" value={form.empenho.cnpjCpf} onChange={v => setEmp('cnpjCpf', v)} />
                    <EmpInput label="Inscrição estadual" value={form.empenho.inscricaoEstadual} onChange={v => setEmp('inscricaoEstadual', v)} />
                  </div>
                  <EmpInput label="Endereço" value={form.empenho.endereco} onChange={v => setEmp('endereco', upperNoAccents(v))} />
                  <div className="grid grid-cols-4 gap-2">
                    <EmpInput label="Bairro" value={form.empenho.bairro} onChange={v => setEmp('bairro', upperNoAccents(v))} />
                    <EmpInput label="CEP" value={form.empenho.cep} onChange={v => setEmp('cep', v)} />
                    <EmpInput label="Cidade" value={form.empenho.cidade} onChange={v => setEmp('cidade', upperNoAccents(v))} />
                    <EmpInput label="UF" value={form.empenho.uf} onChange={v => setEmp('uf', upperNoAccents(v))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <EmpInput label="Telefone" value={form.empenho.telefone} onChange={v => setEmp('telefone', v)} />
                    <EmpInput label="Desconto (R$)" value={form.empenho.desconto} onChange={v => setEmp('desconto', maskMoney(v))} />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <EmpInput label="Banco" value={form.empenho.banco} onChange={v => setEmp('banco', upperNoAccents(v))} />
                    <EmpInput label="Agência" value={form.empenho.agencia} onChange={v => setEmp('agencia', v)} />
                    <EmpInput label="Conta" value={form.empenho.conta} onChange={v => setEmp('conta', v)} />
                    <EmpInput label="Cheque Nº" value={form.empenho.cheque} onChange={v => setEmp('cheque', v)} />
                  </div>
                  <Button
                    type="button" variant="outline" size="sm" className="w-fit"
                    disabled={notaBusy === 'preview'}
                    onClick={() => gerarNota({ amountCents: moneyToCents(form.amount), date: form.date, description: form.description, empenho: empToBody(form.empenho) })}
                  >
                    <Receipt className="size-4" /> Gerar Nota de Empenho
                  </Button>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={requestCloseDialog}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvando...' : editId ? 'Salvar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmCloseDialog
        open={confirmClose}
        onConfirm={() => { setConfirmClose(false); setDialogOpen(false) }}
        onCancel={() => setConfirmClose(false)}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Excluir lançamento"
        description={
          <>
            Excluir <strong>{deleteTarget?.description}</strong> ({deleteTarget ? centsToBRL(deleteTarget.amountCents) : ''})? Esta ação não pode ser desfeita.
            {deleteTarget?.transferId && ' Os dois lados da transferência (saída e entrada) serão removidos.'}
          </>
        }
        onConfirm={handleDelete}
        pending={deleteTx.isPending}
      />
    </div>
  )
}

// ── Categorias ────────────────────────────────────────────────────────────────
type CatForm = { name: string; type: FinanceType; color: string; active: boolean }
const emptyCatForm = (): CatForm => ({ name: '', type: 'OUT', color: '#64748b', active: true })
const COLOR_CHOICES = ['#16a34a', '#0891b2', '#7c3aed', '#dc2626', '#ea580c', '#d97706', '#b91c1c', '#64748b', '#2563eb', '#db2777']

function CategoriesTab({ enabled, canCreate, canUpdate, canDelete }: {
  enabled: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean
}) {
  const { data: categories, isLoading, isError } = useFinanceCategories({ includeInactive: true, enabled })
  const createCat = useCreateFinanceCategory()
  const updateCat = useUpdateFinanceCategory()
  const deleteCat = useDeleteFinanceCategory()

  const crud = useCrudDialog<CatForm, FinanceCategory>({
    empty: emptyCatForm,
    toForm: c => ({ name: c.name, type: c.type, color: c.color, active: c.active }),
  })

  const cats = categories ?? []

  async function handleSubmit() {
    crud.setError(null)
    if (!crud.form.name.trim()) { crud.setError('Informe o nome.'); return }
    const body = { name: crud.form.name.trim(), type: crud.form.type, color: crud.form.color, active: crud.form.active }
    try {
      if (crud.editing) {
        await updateCat.mutateAsync({ id: crud.editing.id, body })
        toast.success('Categoria atualizada!')
      } else {
        await createCat.mutateAsync(body)
        toast.success('Categoria criada!')
      }
      crud.forceClose()
    } catch (e) {
      const msg = apiErrorMessage(e, 'Erro ao salvar a categoria.')
      crud.setError(msg)
      toast.error(msg)
    }
  }

  async function handleDelete() {
    if (!crud.deleteTarget) return
    try {
      await deleteCat.mutateAsync(crud.deleteTarget.id)
      toast.success('Categoria removida.')
      crud.setDeleteTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover a categoria.'))
    }
  }

  const saving = createCat.isPending || updateCat.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Categorias usadas para classificar os lançamentos.</p>
        {canCreate && (
          <Button onClick={crud.openCreate} className="shrink-0">
            <Plus className="size-4" /> Nova categoria
          </Button>
        )}
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar as categorias." />}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && cats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-16 text-center">
                    <Tag className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">Nenhuma categoria</p>
                  </TableCell>
                </TableRow>
              )}
              {cats.map(c => (
                <TableRow key={c.id} className={c.active ? '' : 'opacity-60'}>
                  <TableCell className="font-medium text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-3 rounded-sm" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={c.type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                      {c.type === 'IN' ? 'Entrada' : 'Saída'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.active ? 'default' : 'secondary'}>{c.active ? 'Ativa' : 'Inativa'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate && (
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => crud.openEdit(c)} aria-label="Editar" title="Editar">
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => crud.setDeleteTarget(c)} aria-label="Excluir" title="Excluir">
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                      {!canUpdate && !canDelete && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={crud.open} onOpenChange={o => { if (!o) crud.requestClose() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{crud.editing ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nome *</Label>
              <Input value={crud.form.name} onChange={e => crud.setForm(p => ({ ...p, name: upperNoAccents(e.target.value) }))} placeholder="Ex: Aluguel" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tipo *</Label>
              <NativeSelect value={crud.form.type} onChange={e => crud.setForm(p => ({ ...p, type: e.target.value as FinanceType }))}>
                <option value="IN">Entrada</option>
                <option value="OUT">Saída</option>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_CHOICES.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => crud.setForm(p => ({ ...p, color }))}
                    className={`size-7 rounded-md border-2 ${crud.form.color === color ? 'border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    aria-label={color}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => crud.setForm(p => ({ ...p, active: !p.active }))}
              className="flex items-center gap-2 text-sm text-foreground w-fit"
            >
              <span className={`inline-block size-4 rounded-sm border ${crud.form.active ? 'bg-emerald-500 border-emerald-500' : 'border-input'}`} />
              {crud.form.active ? 'Ativa (aparece nos lançamentos)' : 'Inativa'}
            </button>
            {crud.error && <p className="text-sm text-destructive">{crud.error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={crud.requestClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!crud.form.name || saving}>
              {saving ? 'Salvando...' : crud.editing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmCloseDialog
        open={crud.confirmCloseOpen}
        onConfirm={crud.forceClose}
        onCancel={() => crud.setConfirmCloseOpen(false)}
      />

      <DeleteConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={open => { if (!open) crud.setDeleteTarget(null) }}
        title="Excluir categoria"
        description={<>Excluir <strong>{crud.deleteTarget?.name}</strong>? Lançamentos já feitos com ela são mantidos.</>}
        onConfirm={handleDelete}
        pending={deleteCat.isPending}
      />
    </div>
  )
}

// ── Caixas ──────────────────────────────────────────────────────────────────
type AccForm = { name: string; color: string; active: boolean }
const emptyAccForm = (): AccForm => ({ name: '', color: '#2563eb', active: true })

function AccountsTab({ enabled, canCreate, canUpdate, canDelete }: {
  enabled: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean
}) {
  const { data: accounts, isLoading, isError } = useFinanceAccounts({ includeInactive: true, enabled })
  const createAcc = useCreateFinanceAccount()
  const updateAcc = useUpdateFinanceAccount()
  const deleteAcc = useDeleteFinanceAccount()

  const crud = useCrudDialog<AccForm, FinanceAccount>({
    empty: emptyAccForm,
    toForm: a => ({ name: a.name, color: a.color, active: a.active }),
  })

  const accs = accounts ?? []

  async function handleSubmit() {
    crud.setError(null)
    if (!crud.form.name.trim()) { crud.setError('Informe o nome.'); return }
    const body = { name: crud.form.name.trim(), color: crud.form.color, active: crud.form.active }
    try {
      if (crud.editing) {
        await updateAcc.mutateAsync({ id: crud.editing.id, body })
        toast.success('Caixa atualizado!')
      } else {
        await createAcc.mutateAsync(body)
        toast.success('Caixa criado!')
      }
      crud.forceClose()
    } catch (e) {
      const msg = apiErrorMessage(e, 'Erro ao salvar o caixa.')
      crud.setError(msg)
      toast.error(msg)
    }
  }

  async function handleDelete() {
    if (!crud.deleteTarget) return
    try {
      await deleteAcc.mutateAsync(crud.deleteTarget.id)
      toast.success('Caixa removido.')
      crud.setDeleteTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover o caixa.'))
    }
  }

  const saving = createAcc.isPending || updateAcc.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Contas/caixas onde o dinheiro fica (Caixa geral, Banco, Poupança…).</p>
        {canCreate && (
          <Button onClick={crud.openCreate} className="shrink-0">
            <Plus className="size-4" /> Novo caixa
          </Button>
        )}
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar os caixas." />}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caixa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && accs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-16 text-center">
                    <Landmark className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">Nenhum caixa</p>
                  </TableCell>
                </TableRow>
              )}
              {accs.map(a => (
                <TableRow key={a.id} className={a.active ? '' : 'opacity-60'}>
                  <TableCell className="font-medium text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Landmark className="size-4" style={{ color: a.color }} />
                      {a.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.active ? 'default' : 'secondary'}>{a.active ? 'Ativo' : 'Inativo'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate && (
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => crud.openEdit(a)} aria-label="Editar" title="Editar">
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => crud.setDeleteTarget(a)} aria-label="Excluir" title="Excluir">
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                      {!canUpdate && !canDelete && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={crud.open} onOpenChange={o => { if (!o) crud.requestClose() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{crud.editing ? 'Editar caixa' : 'Novo caixa'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nome *</Label>
              <Input value={crud.form.name} onChange={e => crud.setForm(p => ({ ...p, name: upperNoAccents(e.target.value) }))} placeholder="Ex: Banco" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_CHOICES.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => crud.setForm(p => ({ ...p, color }))}
                    className={`size-7 rounded-md border-2 ${crud.form.color === color ? 'border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    aria-label={color}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => crud.setForm(p => ({ ...p, active: !p.active }))}
              className="flex items-center gap-2 text-sm text-foreground w-fit"
            >
              <span className={`inline-block size-4 rounded-sm border ${crud.form.active ? 'bg-emerald-500 border-emerald-500' : 'border-input'}`} />
              {crud.form.active ? 'Ativo (aparece nos lançamentos)' : 'Inativo'}
            </button>
            {crud.error && <p className="text-sm text-destructive">{crud.error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={crud.requestClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!crud.form.name || saving}>
              {saving ? 'Salvando...' : crud.editing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmCloseDialog
        open={crud.confirmCloseOpen}
        onConfirm={crud.forceClose}
        onCancel={() => crud.setConfirmCloseOpen(false)}
      />

      <DeleteConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={open => { if (!open) crud.setDeleteTarget(null) }}
        title="Excluir caixa"
        description={<>Excluir <strong>{crud.deleteTarget?.name}</strong>? Lançamentos já feitos nele são mantidos.</>}
        onConfirm={handleDelete}
        pending={deleteAcc.isPending}
      />
    </div>
  )
}
