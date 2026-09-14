import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  useAdminMarketQuotes, useCreateMarketQuote, useUpdateMarketQuote, useDeleteMarketQuote,
  type MarketQuote,
} from '@/hooks/useMarketQuotes'
import { apiFetch } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error-message'
import { usePermissions } from '@/hooks/usePermissions'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { Plus, Search, TrendingUp, TrendingDown, Minus, Pencil, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { NoPermission } from '@/components/NoPermission'
import { useCrudDialog } from '@/hooks/useCrudDialog'

export const Route = createFileRoute('/_admin/admin/cotacoes/')({
  // Busca na URL (sobrevive a voltar/atualizar/compartilhar).
  validateSearch: (s: Record<string, unknown>): { q?: string } => ({
    q: typeof s.q === 'string' && s.q.trim() ? s.q : undefined,
  }),
  component: RouteComponent,
})

type Trend = 'up' | 'down' | 'neutral'
export function trendOf(variation: string | null | undefined): Trend {
  const v = (variation ?? '').trim()
  if (!v) return 'neutral'
  // Variação numericamente zero ("0", "0,00", "0.00", "+0") é neutra, não alta.
  const n = parseFloat(v.replace('+', '').replace(',', '.'))
  if (n === 0) return 'neutral'
  return v.startsWith('-') ? 'down' : 'up'
}

type Form = { label: string; value: string; referenceDate: string; order: string; isActive: boolean }
const emptyForm: Form = { label: '', value: '', referenceDate: '', order: '0', isActive: true }

function RouteComponent() {
  const { can, isLoading: permLoading } = usePermissions()
  const { data: quotes, isLoading, isError } = useAdminMarketQuotes({
    enabled: !permLoading && can('READ_MARKET_QUOTE'),
  })
  const createQuote = useCreateMarketQuote()
  const updateQuote = useUpdateMarketQuote()
  const deleteQuote = useDeleteMarketQuote()
  const qc = useQueryClient()

  const navigate = Route.useNavigate()
  const [busca, setBusca] = useState(Route.useSearch().q ?? '')
  useEffect(() => {
    navigate({ search: { q: busca.trim() || undefined }, replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca])
  const crud = useCrudDialog<Form, MarketQuote>({
    empty: () => ({ ...emptyForm, order: String(quotes?.length ?? 0) }),
    toForm: q => ({
      label: q.label,
      value: q.value,
      referenceDate: q.referenceDate ? q.referenceDate.slice(0, 10) : '',
      order: String(q.order),
      isActive: q.isActive,
    }),
  })

  // Cópia local para reordenar arrastando (sincroniza quando os dados chegam).
  const [items, setItems] = useState<MarketQuote[]>([])
  useEffect(() => { setItems(quotes ?? []) }, [quotes])
  const dragIndex = useRef<number | null>(null)
  const canReorder = !busca && can('UPDATE_MARKET_QUOTE')

  const list = items.filter(q =>
    q.label.toLowerCase().includes(busca.toLowerCase()) ||
    q.value.toLowerCase().includes(busca.toLowerCase())
  )

  // `list` ainda carrega o `order` do servidor em cada item; a NOVA posição é o
  // índice. Comparar os dois revela o que mudou (antes o diff era calculado
  // depois de reatribuir order=i, então dava sempre vazio e nada salvava).
  async function persistOrder(list: MarketQuote[]) {
    const changed = list.map((q, i) => ({ q, i })).filter(({ q, i }) => q.order !== i)
    if (changed.length === 0) return
    try {
      await Promise.all(
        changed.map(({ q, i }) =>
          apiFetch(`/market-quotes/${q.id}`, { method: 'PATCH', body: JSON.stringify({ order: i }) }),
        ),
      )
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao reordenar.'))
    } finally {
      qc.invalidateQueries({ queryKey: ['admin', 'market-quotes'] })
      qc.invalidateQueries({ queryKey: ['market-quotes'] })
    }
  }

  function onDragEnter(i: number) {
    const from = dragIndex.current
    if (from === null || from === i) return
    setItems(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(i, 0, moved)
      return next
    })
    dragIndex.current = i
  }

  function onDragEnd() {
    dragIndex.current = null
    // `items` já reflete a nova posição (atualizado no onDragEnter) e ainda tem
    // o `order` original de cada item → persistOrder detecta o que mudou.
    persistOrder(items)
    setItems(prev => prev.map((q, i) => ({ ...q, order: i })))
  }

  async function handleSubmit() {
    crud.setError(null)
    const body = {
      label: crud.form.label.trim(),
      value: crud.form.value.trim(),
      referenceDate: crud.form.referenceDate || null,
      order: Number(crud.form.order) || 0,
      isActive: crud.form.isActive,
    }
    try {
      if (crud.editing) {
        await updateQuote.mutateAsync({ id: crud.editing.id, body })
        toast.success('Cotação atualizada!')
      } else {
        await createQuote.mutateAsync(body)
        toast.success('Cotação criada!')
      }
      crud.forceClose()
    } catch (e) {
      const msg = apiErrorMessage(e, 'Erro ao salvar a cotação.')
      crud.setError(msg)
      toast.error(msg)
    }
  }

  async function handleDelete() {
    if (!crud.deleteTarget) return
    try {
      await deleteQuote.mutateAsync(crud.deleteTarget.id)
      toast.success('Cotação removida.')
      crud.setDeleteTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover a cotação.'))
    }
  }

  const saving = createQuote.isPending || updateQuote.isPending

  if (!permLoading && !can('READ_MARKET_QUOTE')) {
    return <NoPermission message="Você não tem permissão para ver as cotações." />
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cotações</h1>
          <p className="text-sm text-muted-foreground">
            Ativos exibidos na home (dólar, soja, milho…) — cadastro manual.
          </p>
        </div>
        {can('CREATE_MARKET_QUOTE') && (
          <Button onClick={crud.openCreate} className="shrink-0">
            <Plus className="size-4" /> Nova Cotação
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por rótulo ou valor..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar cotações." />}

      {canReorder && list.length > 1 && (
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <GripVertical className="size-3.5 opacity-50" />
          Arraste as linhas para reordenar a exibição na home.
        </p>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Rótulo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Variação</TableHead>
              <TableHead className="hidden md:table-cell">Referência</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
              </TableRow>
            ))}
            {!isLoading && list.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <TrendingUp className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    {busca ? 'Nenhuma cotação encontrada' : 'Nenhuma cotação cadastrada'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {busca ? 'Tente outro termo.' : 'Clique em "Nova Cotação" para começar.'}
                  </p>
                </TableCell>
              </TableRow>
            )}
            {list.map((q, i) => {
              const trend = trendOf(q.variation)
              return (
                <TableRow
                  key={q.id}
                  className={`${q.isActive ? '' : 'opacity-60'} ${canReorder ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  draggable={canReorder}
                  onDragStart={canReorder ? () => { dragIndex.current = i } : undefined}
                  onDragEnter={canReorder ? () => onDragEnter(i) : undefined}
                  onDragEnd={canReorder ? onDragEnd : undefined}
                  onDragOver={canReorder ? e => e.preventDefault() : undefined}
                >
                  <TableCell className="text-muted-foreground">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      {canReorder && <GripVertical className="size-3.5 opacity-40" />}
                      {q.order}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{q.label}</TableCell>
                  <TableCell className="tabular-nums">{q.value}</TableCell>
                  <TableCell>
                    {q.variation ? (
                      <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                        trend === 'down' ? 'text-red-600 dark:text-red-400'
                          : trend === 'up' ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground'
                      }`}>
                        {trend === 'down' ? <TrendingDown className="size-3.5" />
                          : trend === 'up' ? <TrendingUp className="size-3.5" />
                          : <Minus className="size-3.5" />}
                        {q.variation}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {q.referenceDate ? formatDateFromString(q.referenceDate) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={q.isActive ? 'default' : 'secondary'}>
                      {q.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {can('UPDATE_MARKET_QUOTE') && (
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => crud.openEdit(q)} aria-label="Editar" title="Editar">
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {can('DELETE_MARKET_QUOTE') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-muted-foreground hover:text-destructive"
                          onClick={() => crud.setDeleteTarget(q)}
                          aria-label="Excluir"
                          title="Excluir"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                      {!can('UPDATE_MARKET_QUOTE') && !can('DELETE_MARKET_QUOTE') && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
      </div>

      <Dialog open={crud.open} onOpenChange={open => { if (!open) crud.forceClose() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{crud.editing ? 'Editar Cotação' : 'Nova Cotação'}</DialogTitle>
            <DialogDescription>
              Valor é texto livre — digite como vem (ex: "R$ 128,50 /sc 60kg").
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Rótulo *</Label>
              <Input value={crud.form.label} onChange={e => crud.setForm(p => ({ ...p, label: e.target.value }))} placeholder="Ex: Soja" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Valor *</Label>
              <Input value={crud.form.value} onChange={e => crud.setForm(p => ({ ...p, value: e.target.value }))} placeholder="Ex: R$ 128,50 /sc 60kg" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Ordem</Label>
              <Input type="number" value={crud.form.order} onChange={e => crud.setForm(p => ({ ...p, order: e.target.value }))} />
              <span className="text-[11px] text-muted-foreground">
                A variação (alta/baixa) é calculada automaticamente a cada novo valor, pelo histórico.
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Data de referência</Label>
              <Input type="date" value={crud.form.referenceDate} onChange={e => crud.setForm(p => ({ ...p, referenceDate: e.target.value }))} />
            </div>
            <button
              type="button"
              onClick={() => crud.setForm(p => ({ ...p, isActive: !p.isActive }))}
              className="flex items-center gap-2 text-sm text-foreground w-fit"
            >
              {crud.form.isActive
                ? <Eye className="size-4 text-emerald-600" />
                : <EyeOff className="size-4 text-muted-foreground" />}
              {crud.form.isActive ? 'Visível na home' : 'Oculta na home'}
            </button>
            {crud.error && <p className="text-sm text-destructive">{crud.error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={crud.forceClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!crud.form.label || !crud.form.value || saving}>
              {saving ? 'Salvando...' : crud.editing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={open => { if (!open) crud.setDeleteTarget(null) }}
        title="Excluir cotação"
        description={<>Excluir <strong>{crud.deleteTarget?.label}</strong>? Esta ação não pode ser desfeita.</>}
        onConfirm={handleDelete}
        pending={deleteQuote.isPending}
      />
    </div>
  )
}
