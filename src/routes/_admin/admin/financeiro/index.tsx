import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import { apiErrorMessage } from '@/lib/api-error-message'
import {
  useFinanceSummary, useFinanceCategories, useFinanceTransactions,
  useCreateFinanceTransaction, useUpdateFinanceTransaction, useDeleteFinanceTransaction,
  useCreateFinanceCategory, useUpdateFinanceCategory, useDeleteFinanceCategory,
  type FinanceType, type FinanceCategory, type FinanceTransaction, type TransactionFilters,
} from '@/hooks/useFinance'
import { centsToBRL, maskMoney, moneyToCents } from '@/utils/masks'
import { formatDateFromString } from '@/utils/format-data-from-string'
import {
  Wallet, TrendingUp, TrendingDown, Scale, Plus, Pencil, Trash2, Search,
  ChevronLeft, ChevronRight, Tag, ArrowUpCircle, ArrowDownCircle,
} from 'lucide-react'
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
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'

export const Route = createFileRoute('/_admin/admin/financeiro/')({
  component: RouteComponent,
})

const selectClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

// ── Helpers de data ──────────────────────────────────────────────────────────
const MONTHS_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS_ABBR[(m ?? 1) - 1]}/${String(y).slice(2)}`
}
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
type Preset = 'month' | 'year' | 'last12'
function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const to = isoDate(now)
  if (p === 'month') return { from: isoDate(new Date(y, m, 1)), to }
  if (p === 'year') return { from: isoDate(new Date(y, 0, 1)), to }
  return { from: isoDate(new Date(y, m - 11, 1)), to }
}

function RouteComponent() {
  const { can, isLoading: permLoading } = usePermissions()
  const enabled = !permLoading && can('READ_FINANCE')

  if (!permLoading && !can('READ_FINANCE')) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          Você não tem permissão para ver o Financeiro.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          Controle de entradas e saídas de caixa, com dashboard e categorização.
        </p>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <DashboardTab enabled={enabled} />
        </TabsContent>
        <TabsContent value="lancamentos" className="mt-6">
          <TransactionsTab enabled={enabled} canCreate={can('CREATE_FINANCE')} canUpdate={can('UPDATE_FINANCE')} canDelete={can('DELETE_FINANCE')} />
        </TabsContent>
        <TabsContent value="categorias" className="mt-6">
          <CategoriesTab enabled={enabled} canCreate={can('CREATE_FINANCE')} canUpdate={can('UPDATE_FINANCE')} canDelete={can('DELETE_FINANCE')} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardTab({ enabled }: { enabled: boolean }) {
  const [preset, setPreset] = useState<Preset>('year')
  const range = useMemo(() => presetRange(preset), [preset])
  const { data, isLoading, isError } = useFinanceSummary(range, { enabled })

  const kpis = [
    { label: 'Saldo em caixa', value: data?.balanceAllTimeCents ?? 0, icon: Scale, tone: 'neutral' as const, hint: 'Acumulado (todas as datas)' },
    { label: 'Entradas', value: data?.periodInCents ?? 0, icon: TrendingUp, tone: 'in' as const, hint: 'No período' },
    { label: 'Saídas', value: data?.periodOutCents ?? 0, icon: TrendingDown, tone: 'out' as const, hint: 'No período' },
    { label: 'Resultado', value: data?.periodResultCents ?? 0, icon: Wallet, tone: 'result' as const, hint: 'Entradas − Saídas' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Período:</span>
        {([['month', 'Este mês'], ['year', 'Este ano'], ['last12', 'Últimos 12 meses']] as const).map(([p, lbl]) => (
          <Button key={p} size="sm" variant={preset === p ? 'default' : 'outline'} className="h-8" onClick={() => setPreset(p)}>
            {lbl}
          </Button>
        ))}
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Erro ao carregar o resumo financeiro.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
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
            <span className="text-[11px] text-muted-foreground">{k.hint}</span>
          </div>
        ))}
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
type TxForm = {
  type: FinanceType
  amount: string
  date: string
  description: string
  method: string
  categoryId: string
  notes: string
}
const emptyTxForm = (): TxForm => ({
  type: 'OUT', amount: '', date: isoDate(new Date()), description: '', method: '', categoryId: '', notes: '',
})

function TransactionsTab({ enabled, canCreate, canUpdate, canDelete }: {
  enabled: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean
}) {
  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, limit: 20 })
  const { data, isLoading, isError } = useFinanceTransactions(filters, { enabled })
  const { data: categories } = useFinanceCategories({ enabled })
  const createTx = useCreateFinanceTransaction()
  const updateTx = useUpdateFinanceTransaction()
  const deleteTx = useDeleteFinanceTransaction()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<TxForm>(emptyTxForm)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FinanceTransaction | null>(null)

  const rows = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const cats = categories ?? []
  const catsForType = cats.filter(c => c.type === form.type)

  function setF<K extends keyof TxForm>(k: K, v: TxForm[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function abrirNovo() {
    setEditId(null)
    setForm(emptyTxForm())
    setError(null)
    setDialogOpen(true)
  }

  function abrirEditar(t: FinanceTransaction) {
    setEditId(t.id)
    setForm({
      type: t.type,
      amount: maskMoney(String(t.amountCents)),
      date: t.date.slice(0, 10),
      description: t.description,
      method: t.method ?? '',
      categoryId: t.categoryId ?? '',
      notes: t.notes ?? '',
    })
    setError(null)
    setDialogOpen(true)
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
      notes: form.notes.trim() || null,
    }
    try {
      if (editId) {
        await updateTx.mutateAsync({ id: editId, body })
        toast.success('Lançamento atualizado!')
      } else {
        await createTx.mutateAsync(body)
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

  const saving = createTx.isPending || updateTx.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">De</Label>
            <Input type="date" className="h-9 w-[150px]" value={filters.from ?? ''} onChange={e => setFilters(f => ({ ...f, from: e.target.value, page: 1 }))} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Até</Label>
            <Input type="date" className="h-9 w-[150px]" value={filters.to ?? ''} onChange={e => setFilters(f => ({ ...f, to: e.target.value, page: 1 }))} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Tipo</Label>
            <select className={`${selectClass} h-9`} value={filters.type ?? ''} onChange={e => setFilters(f => ({ ...f, type: e.target.value as FinanceType | '', page: 1 }))}>
              <option value="">Todos</option>
              <option value="IN">Entradas</option>
              <option value="OUT">Saídas</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Categoria</Label>
            <select className={`${selectClass} h-9`} value={filters.categoryId ?? ''} onChange={e => setFilters(f => ({ ...f, categoryId: e.target.value, page: 1 }))}>
              <option value="">Todas</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        {canCreate && (
          <Button onClick={abrirNovo} className="shrink-0">
            <Plus className="size-4" /> Novo lançamento
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Buscar na descrição..." className="pl-9" value={filters.search ?? ''} onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} />
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Erro ao carregar os lançamentos.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
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
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
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
                      {t.type === 'IN'
                        ? <ArrowUpCircle className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        : <ArrowDownCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" />}
                      {t.description}
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
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{t.method || '—'}</TableCell>
                  <TableCell className={`text-right tabular-nums font-medium ${
                    t.type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {t.type === 'IN' ? '+' : '−'} {centsToBRL(t.amountCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate && (
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => abrirEditar(t)} title="Editar">
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(t)} title="Excluir">
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

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" className="h-8" disabled={(filters.page ?? 1) <= 1} onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">{filters.page ?? 1} / {totalPages}</span>
          <Button size="sm" variant="outline" className="h-8" disabled={(filters.page ?? 1) >= totalPages} onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar lançamento' : 'Novo lançamento'}</DialogTitle>
            <DialogDescription>Entrada ou saída de caixa. Valor em reais.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
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
            </div>
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
              <Input value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Ex: Compra de material de escritório" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Categoria</Label>
                <select className={selectClass} value={form.categoryId} onChange={e => setF('categoryId', e.target.value)}>
                  <option value="">Sem categoria</option>
                  {catsForType.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Método</Label>
                <Input value={form.method} onChange={e => setF('method', e.target.value)} placeholder="Ex: PIX, Dinheiro" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Observações</Label>
              <Input value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Opcional" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvando...' : editId ? 'Salvar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir <strong>{deleteTarget?.description}</strong> ({deleteTarget ? centsToBRL(deleteTarget.amountCents) : ''})? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTx.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); handleDelete() }} disabled={deleteTx.isPending} className="bg-destructive text-white hover:bg-destructive/90">
              {deleteTx.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<CatForm>(emptyCatForm)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FinanceCategory | null>(null)

  const cats = categories ?? []

  function abrirNovo() {
    setEditId(null)
    setForm(emptyCatForm())
    setError(null)
    setDialogOpen(true)
  }

  function abrirEditar(c: FinanceCategory) {
    setEditId(c.id)
    setForm({ name: c.name, type: c.type, color: c.color, active: c.active })
    setError(null)
    setDialogOpen(true)
  }

  async function handleSubmit() {
    setError(null)
    if (!form.name.trim()) { setError('Informe o nome.'); return }
    const body = { name: form.name.trim(), type: form.type, color: form.color, active: form.active }
    try {
      if (editId) {
        await updateCat.mutateAsync({ id: editId, body })
        toast.success('Categoria atualizada!')
      } else {
        await createCat.mutateAsync(body)
        toast.success('Categoria criada!')
      }
      setDialogOpen(false)
    } catch (e) {
      const msg = apiErrorMessage(e, 'Erro ao salvar a categoria.')
      setError(msg)
      toast.error(msg)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteCat.mutateAsync(deleteTarget.id)
      toast.success('Categoria removida.')
      setDeleteTarget(null)
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
          <Button onClick={abrirNovo} className="shrink-0">
            <Plus className="size-4" /> Nova categoria
          </Button>
        )}
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Erro ao carregar as categorias.
        </div>
      )}

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
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => abrirEditar(c)} title="Editar">
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(c)} title="Excluir">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Aluguel" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tipo *</Label>
              <select className={selectClass} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as FinanceType }))}>
                <option value="IN">Entrada</option>
                <option value="OUT">Saída</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_CHOICES.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, color }))}
                    className={`size-7 rounded-md border-2 ${form.color === color ? 'border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    aria-label={color}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, active: !p.active }))}
              className="flex items-center gap-2 text-sm text-foreground w-fit"
            >
              <span className={`inline-block size-4 rounded-sm border ${form.active ? 'bg-emerald-500 border-emerald-500' : 'border-input'}`} />
              {form.active ? 'Ativa (aparece nos lançamentos)' : 'Inativa'}
            </button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.name || saving}>
              {saving ? 'Salvando...' : editId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir <strong>{deleteTarget?.name}</strong>? Lançamentos já feitos com ela são mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCat.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); handleDelete() }} disabled={deleteCat.isPending} className="bg-destructive text-white hover:bg-destructive/90">
              {deleteCat.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
