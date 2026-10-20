import { toast } from 'sonner'
import { Repeat, Plus, Pencil, Trash2, Pause, Play } from 'lucide-react'
import { apiErrorMessage } from '@/lib/api-error-message'
import { centsToBRL, maskMoney, moneyToCents } from '@/utils/masks'
import { upperNoAccents } from '@/utils/text-format'
import {
  useFinanceRecurrences, useCreateFinanceRecurrence, useUpdateFinanceRecurrence,
  useDeleteFinanceRecurrence, useFinanceCategories, useFinanceAccounts,
  type FinanceRecurrence, type FinanceType,
} from '@/hooks/useFinance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { NativeSelect } from '@/components/ui/native-select'
import { ConfirmCloseDialog } from '@/components/confirm-close-dialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { useCrudDialog } from '@/hooks/useCrudDialog'
import { currentMonth, monthLabel, nextMonthToGenerate } from '@/lib/finance-month'
 import { PaymentMethodSelect } from './PaymentMethodSelect'

type RecForm = {
  type: FinanceType
  description: string
  amount: string
  dayOfMonth: string
  startMonth: string
  endMonth: string
  paymentMethod: string
  categoryId: string
  accountId: string
  notes: string
  active: boolean
}

const emptyRecForm = (): RecForm => ({
  type: 'OUT', description: '', amount: '', dayOfMonth: '10',
  startMonth: currentMonth(), endMonth: '', paymentMethod: '',
  categoryId: '', accountId: '', notes: '', active: true,
})

export function RecurringTab({ enabled, canCreate, canUpdate, canDelete }: {
  enabled: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean
}) {
  const { data: recurrences, isLoading, isError, isFetching, refetch } = useFinanceRecurrences({ includeInactive: true, enabled })
  const catsQuery = useFinanceCategories({ enabled })
  const accsQuery = useFinanceAccounts({ enabled })
  const categories = catsQuery.data
  const accounts = accsQuery.data
  // Categorias e caixas alimentam os selects do formulário: sem eles o select
  // fica vazio sem explicação.
  const listasFalharam = (catsQuery.isError && !categories) || (accsQuery.isError && !accounts)
  const createRec = useCreateFinanceRecurrence()
  const updateRec = useUpdateFinanceRecurrence()
  const deleteRec = useDeleteFinanceRecurrence()

  const crud = useCrudDialog<RecForm, FinanceRecurrence>({
    empty: emptyRecForm,
    toForm: r => ({
      type: r.type,
      description: r.description,
      amount: maskMoney(String(r.amountCents)),
      dayOfMonth: String(r.dayOfMonth),
      startMonth: r.startMonth,
      endMonth: r.endMonth ?? '',
      paymentMethod: r.paymentMethod ?? '',
      categoryId: r.categoryId ?? '',
      accountId: r.accountId ?? '',
      notes: r.notes ?? '',
      active: r.active,
    }),
  })

  const rows = recurrences ?? []
  const cats = (categories ?? []).filter(c => c.type === crud.form.type)
  const accs = accounts ?? []

  async function handleSubmit() {
    crud.setError(null)
    const amountCents = moneyToCents(crud.form.amount)
    if (amountCents <= 0) { crud.setError('Informe um valor maior que zero.'); return }
    if (!crud.form.description.trim()) { crud.setError('Informe a descrição.'); return }
    const day = Number(crud.form.dayOfMonth)
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      crud.setError('O dia deve ser entre 1 e 31.')
      return
    }
    const body = {
      type: crud.form.type,
      description: crud.form.description.trim(),
      amountCents,
      dayOfMonth: day,
      startMonth: crud.form.startMonth,
      endMonth: crud.form.endMonth || null,
      paymentMethod: crud.form.paymentMethod || null,
      categoryId: crud.form.categoryId || null,
      accountId: crud.form.accountId || null,
      notes: crud.form.notes.trim() || null,
      active: crud.form.active,
    }
    try {
      if (crud.editing) {
        await updateRec.mutateAsync({ id: crud.editing.id, body })
        toast.success('Recorrência atualizada!')
      } else {
        await createRec.mutateAsync(body)
        toast.success('Recorrência criada! Os lançamentos aparecem ao abrir o Financeiro.')
      }
      crud.forceClose()
    } catch (e) {
      const msg = apiErrorMessage(e, 'Erro ao salvar a recorrência.')
      crud.setError(msg)
      toast.error(msg)
    }
  }

  async function toggleActive(r: FinanceRecurrence) {
    try {
      await updateRec.mutateAsync({ id: r.id, body: { active: !r.active } })
      toast.success(r.active ? 'Recorrência pausada.' : 'Recorrência ativada.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao alterar a recorrência.'))
    }
  }

  async function handleDelete() {
    if (!crud.deleteTarget) return
    try {
      await deleteRec.mutateAsync(crud.deleteTarget.id)
      toast.success('Recorrência removida. Os lançamentos já gerados continuam no caixa.')
      crud.setDeleteTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover a recorrência.'))
    }
  }

  const saving = createRec.isPending || updateRec.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Lançamentos que se repetem todo mês (aluguel, salários, mensalidades). Ao abrir
          o Financeiro, os lançamentos que faltam são criados automaticamente até o mês
          atual — cada mês entra uma vez só. Mês mais curto que o dia escolhido usa o
          último dia dele.
        </p>
        {canCreate && (
          <Button onClick={crud.openCreate} className="shrink-0">
            <Plus className="size-4" /> Nova recorrência
          </Button>
        )}
      </div>

      {listasFalharam && (
        <LoadErrorRetry
          variant="inline"
          message="Não foi possível carregar as categorias e os caixas; os campos de escolha podem aparecer vazios."
          onRetry={() => { void catsQuery.refetch(); void accsQuery.refetch() }}
          retrying={catsQuery.isFetching || accsQuery.isFetching}
        />
      )}

      {isError && !recurrences && (
        <LoadErrorRetry
          className="rounded-lg border border-border bg-card"
          message="Não foi possível carregar as recorrências."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Sem rolagem lateral: tabela fixa, texto quebra linha (o TableCell do shadcn é
            nowrap, por isso o whitespace-normal). Valor e Ações têm largura própria; o
            resto entra como coluna conforme a tela e, abaixo disso, vira linha miúda
            embaixo da descrição. */}
        <div>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[144px] text-right">Valor</TableHead>
                <TableHead className="hidden lg:table-cell lg:w-[64px] text-center">Dia</TableHead>
                <TableHead className="hidden xl:table-cell xl:w-[150px]">Categoria</TableHead>
                <TableHead className="hidden xl:table-cell xl:w-[130px]">Caixa</TableHead>
                <TableHead className="hidden lg:table-cell lg:w-[96px]">Situação</TableHead>
                <TableHead className="hidden 2xl:table-cell 2xl:w-[120px]">Próximo mês</TableHead>
                <TableHead className="w-[88px] lg:w-[128px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}><Skeleton className="h-4 w-full" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && !isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center whitespace-normal">
                    <Repeat className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">Nenhuma recorrência</p>
                    <p className="text-xs text-muted-foreground">
                      Cadastre o que se repete todo mês e o sistema lança sozinho.
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {rows.map(r => {
                const next = nextMonthToGenerate(r)
                return (
                  <TableRow key={r.id} className={r.active ? '' : 'opacity-60'}>
                    <TableCell className="font-medium text-foreground whitespace-normal align-top pt-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <Repeat className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 break-words" title={r.description}>{r.description}</p>
                          {/* O que ainda não virou coluna aparece aqui, miúdo. */}
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-normal text-muted-foreground">
                            <span className="lg:hidden">Dia {r.dayOfMonth}</span>
                            <Badge variant={r.active ? 'default' : 'secondary'} className="lg:hidden">
                              {r.active ? 'Ativa' : 'Pausada'}
                            </Badge>
                            {r.category && <span className="max-w-full truncate xl:hidden" title={r.category.name}>{r.category.name}</span>}
                            {r.account && <span className="max-w-full truncate xl:hidden" title={r.account.name}>{r.account.name}</span>}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right tabular-nums font-medium whitespace-nowrap align-top pt-3 ${r.type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {r.type === 'IN' ? '+' : '−'} {centsToBRL(r.amountCents)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-center tabular-nums align-top pt-3">{r.dayOfMonth}</TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground whitespace-normal align-top pt-3">
                      <span className="line-clamp-2 break-words" title={r.category?.name}>{r.category?.name ?? '—'}</span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground whitespace-normal align-top pt-3">
                      <span className="line-clamp-2 break-words" title={r.account?.name}>{r.account?.name ?? '—'}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell align-top pt-3">
                      <Badge variant={r.active ? 'default' : 'secondary'}>
                        {r.active ? 'Ativa' : 'Pausada'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell text-sm text-muted-foreground whitespace-normal align-top pt-3">
                      {next ? monthLabel(next) : (r.active ? 'Encerrada' : '—')}
                    </TableCell>
                    <TableCell className="text-right align-top">
                      {/* Abaixo de lg os botões ficam em 2×2 para a coluna caber. */}
                      <div className="ml-auto grid w-fit grid-cols-2 justify-items-center gap-0.5 lg:flex lg:items-center lg:justify-end lg:gap-1">
                        {canUpdate && (
                          <Button
                            size="sm" variant="ghost" className="h-8 px-2"
                            onClick={() => toggleActive(r)}
                            disabled={updateRec.isPending}
                            aria-label={r.active ? 'Pausar' : 'Ativar'}
                            title={r.active ? 'Pausar' : 'Ativar'}
                          >
                            {r.active ? <Pause className="size-4" /> : <Play className="size-4" />}
                          </Button>
                        )}
                        {canUpdate && (
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => crud.openEdit(r)} aria-label="Editar" title="Editar">
                            <Pencil className="size-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => crud.setDeleteTarget(r)} aria-label="Excluir" title="Excluir">
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                        {!canUpdate && !canDelete && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={crud.open} onOpenChange={o => { if (!o) crud.requestClose() }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{crud.editing ? 'Editar recorrência' : 'Nova recorrência'}</DialogTitle>
            <DialogDescription>
              O lançamento é criado todo mês, no dia escolhido, até você pausar ou definir um mês final.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              {(['OUT', 'IN'] as FinanceType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => crud.setForm(p => ({ ...p, type: t, categoryId: '' }))}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-medium ${
                    crud.form.type === t
                      ? t === 'IN'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {t === 'IN' ? 'Entrada' : 'Saída'}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Descrição *</Label>
              <Input
                value={crud.form.description}
                onChange={e => crud.setForm(p => ({ ...p, description: upperNoAccents(e.target.value) }))}
                placeholder="Ex: ALUGUEL DA SEDE"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Valor *</Label>
                <Input
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={crud.form.amount}
                  onChange={e => crud.setForm(p => ({ ...p, amount: maskMoney(e.target.value) }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Dia do mês *</Label>
                <Input
                  type="number" min={1} max={31}
                  value={crud.form.dayOfMonth}
                  onChange={e => crud.setForm(p => ({ ...p, dayOfMonth: e.target.value }))}
                />
                <span className="text-[11px] text-muted-foreground">
                  Mês mais curto usa o último dia (ex.: 31 em fevereiro → 28).
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Primeiro mês *</Label>
                <Input
                  type="month"
                  value={crud.form.startMonth}
                  onChange={e => crud.setForm(p => ({ ...p, startMonth: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Último mês</Label>
                <Input
                  type="month"
                  value={crud.form.endMonth}
                  onChange={e => crud.setForm(p => ({ ...p, endMonth: e.target.value }))}
                />
                <span className="text-[11px] text-muted-foreground">Em branco = sem fim.</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Categoria</Label>
                <NativeSelect
                  value={crud.form.categoryId}
                  onChange={e => crud.setForm(p => ({ ...p, categoryId: e.target.value }))}
                >
                  <option value="">Sem categoria</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  {/* Categoria desativada depois: não some do que já estava escolhido. */}
                  {crud.form.categoryId && !cats.some(c => c.id === crud.form.categoryId) && (
                    <option value={crud.form.categoryId}>
                      {crud.editing?.category?.name ?? 'Categoria atual'}
                    </option>
                  )}
                </NativeSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Caixa</Label>
                <NativeSelect
                  value={crud.form.accountId}
                  onChange={e => crud.setForm(p => ({ ...p, accountId: e.target.value }))}
                >
                  <option value="">Sem caixa</option>
                  {accs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </NativeSelect>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Forma de pagamento</Label>
              <PaymentMethodSelect
                value={crud.form.paymentMethod}
                onChange={v => crud.setForm(p => ({ ...p, paymentMethod: v }))}
                canCreate={canCreate}
                enabled={enabled}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Observações</Label>
              <Input
                value={crud.form.notes}
                onChange={e => crud.setForm(p => ({ ...p, notes: upperNoAccents(e.target.value) }))}
                placeholder="Opcional"
              />
            </div>

            <button
              type="button"
              onClick={() => crud.setForm(p => ({ ...p, active: !p.active }))}
              className="flex items-center gap-2 text-sm text-foreground w-fit"
            >
              <span className={`inline-block size-4 rounded-sm border ${crud.form.active ? 'bg-emerald-500 border-emerald-500' : 'border-input'}`} />
              {crud.form.active ? 'Ativa (gera todo mês)' : 'Pausada (não gera)'}
            </button>

            {crud.error && <p className="text-sm text-destructive">{crud.error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={crud.requestClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvando...' : crud.editing ? 'Salvar' : 'Criar'}
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
        onOpenChange={o => { if (!o) crud.setDeleteTarget(null) }}
        title="Excluir recorrência"
        description={
          <>
            "{crud.deleteTarget?.description}" deixa de gerar novos lançamentos.
            Os lançamentos já criados continuam no caixa.
          </>
        }
        onConfirm={handleDelete}
        pending={deleteRec.isPending}
      />
    </div>
  )
}
