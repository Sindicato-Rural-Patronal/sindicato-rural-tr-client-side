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
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'

export const Route = createFileRoute('/_admin/admin/cotacoes/')({
  component: RouteComponent,
})

type Trend = 'up' | 'down' | 'neutral'
export function trendOf(variation: string | null | undefined): Trend {
  const v = (variation ?? '').trim()
  if (!v) return 'neutral'
  return v.startsWith('-') ? 'down' : 'up'
}

type Form = { label: string; value: string; variation: string; referenceDate: string; order: string; isActive: boolean }
const emptyForm: Form = { label: '', value: '', variation: '', referenceDate: '', order: '0', isActive: true }

function RouteComponent() {
  const { data: quotes, isLoading, isError } = useAdminMarketQuotes()
  const createQuote = useCreateMarketQuote()
  const updateQuote = useUpdateMarketQuote()
  const deleteQuote = useDeleteMarketQuote()
  const qc = useQueryClient()

  const [busca, setBusca] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MarketQuote | null>(null)

  // Cópia local para reordenar arrastando (sincroniza quando os dados chegam).
  const [items, setItems] = useState<MarketQuote[]>([])
  useEffect(() => { setItems(quotes ?? []) }, [quotes])
  const dragIndex = useRef<number | null>(null)
  const canReorder = !busca

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

  function abrirNovo() {
    setEditId(null)
    setForm({ ...emptyForm, order: String(quotes?.length ?? 0) })
    setError(null)
    setDialogOpen(true)
  }

  function abrirEditar(q: MarketQuote) {
    setEditId(q.id)
    setForm({
      label: q.label,
      value: q.value,
      variation: q.variation ?? '',
      referenceDate: q.referenceDate ? q.referenceDate.slice(0, 10) : '',
      order: String(q.order),
      isActive: q.isActive,
    })
    setError(null)
    setDialogOpen(true)
  }

  async function handleSubmit() {
    setError(null)
    const body = {
      label: form.label.trim(),
      value: form.value.trim(),
      variation: form.variation.trim() || null,
      referenceDate: form.referenceDate || null,
      order: Number(form.order) || 0,
      isActive: form.isActive,
    }
    try {
      if (editId) {
        await updateQuote.mutateAsync({ id: editId, body })
        toast.success('Cotação atualizada!')
      } else {
        await createQuote.mutateAsync(body)
        toast.success('Cotação criada!')
      }
      setDialogOpen(false)
    } catch (e) {
      const msg = apiErrorMessage(e, 'Erro ao salvar a cotação.')
      setError(msg)
      toast.error(msg)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteQuote.mutateAsync(deleteTarget.id)
      toast.success('Cotação removida.')
      setDeleteTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover a cotação.'))
    }
  }

  const saving = createQuote.isPending || updateQuote.isPending

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cotações</h1>
          <p className="text-sm text-muted-foreground">
            Ativos exibidos na home (dólar, soja, milho…) — cadastro manual.
          </p>
        </div>
        <Button onClick={abrirNovo} className="shrink-0">
          <Plus className="size-4" /> Nova Cotação
        </Button>
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

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Erro ao carregar cotações.
        </div>
      )}

      {canReorder && list.length > 1 && (
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <GripVertical className="size-3.5 opacity-50" />
          Arraste as linhas para reordenar a exibição na home.
        </p>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
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
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => abrirEditar(q)} title="Editar">
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(q)}
                        title="Excluir"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Cotação' : 'Nova Cotação'}</DialogTitle>
            <DialogDescription>
              Valor é texto livre — digite como vem (ex: "R$ 128,50 /sc 60kg").
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Rótulo *</Label>
              <Input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="Ex: Soja" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Valor *</Label>
              <Input value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} placeholder="Ex: R$ 128,50 /sc 60kg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Variação</Label>
                <Input value={form.variation} onChange={e => setForm(p => ({ ...p, variation: e.target.value }))} placeholder="+1,2% ou -0,8%" />
                <span className="text-[11px] text-muted-foreground">Com "-" = baixa (vermelho).</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Ordem</Label>
                <Input type="number" value={form.order} onChange={e => setForm(p => ({ ...p, order: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Data de referência</Label>
              <Input type="date" value={form.referenceDate} onChange={e => setForm(p => ({ ...p, referenceDate: e.target.value }))} />
            </div>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
              className="flex items-center gap-2 text-sm text-foreground w-fit"
            >
              {form.isActive
                ? <Eye className="size-4 text-emerald-600" />
                : <EyeOff className="size-4 text-muted-foreground" />}
              {form.isActive ? 'Visível na home' : 'Oculta na home'}
            </button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.label || !form.value || saving}>
              {saving ? 'Salvando...' : editId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cotação</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir <strong>{deleteTarget?.label}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteQuote.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => { e.preventDefault(); handleDelete() }}
              disabled={deleteQuote.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteQuote.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
