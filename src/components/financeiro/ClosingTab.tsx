import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Scale, Lock, Unlock, Landmark } from 'lucide-react'
import { apiErrorMessage, loadErrorMessage } from '@/lib/api-error-message'
import { centsToBRL, maskMoney, moneyToCents } from '@/utils/masks'
import { upperNoAccents } from '@/utils/text-format'
import {
  useFinanceAccounts, useFinanceClosings, useFinanceClosingPreview,
  useCreateFinanceClosing, useDeleteFinanceClosing,
  type FinanceClosing,
} from '@/hooks/useFinance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { NativeSelect } from '@/components/ui/native-select'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import { currentMonth, monthLabel, monthNumeric } from '@/lib/finance-month'

/** Classe de cor da diferença: vermelho quando não bate. */
function diffClass(cents: number): string {
  return cents === 0 ? 'text-foreground' : 'text-destructive'
}

function diffLabel(cents: number): string {
  if (cents === 0) return 'Confere'
  return `${cents > 0 ? 'Sobrou ' : 'Faltou '}${centsToBRL(Math.abs(cents))}`
}

export function ClosingTab({ enabled, canCreate, canDelete }: {
  enabled: boolean; canCreate: boolean; canDelete: boolean
}) {
  const { data: accounts, isError: accountsError, isFetching: accountsFetching, refetch: refetchAccounts } = useFinanceAccounts({ enabled })
  const accs = useMemo(() => accounts ?? [], [accounts])

  const [accountId, setAccountId] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const [counted, setCounted] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [reopenTarget, setReopenTarget] = useState<FinanceClosing | null>(null)

  // Primeiro caixa da lista como padrão, assim que ela chega.
  const effectiveAccountId = accountId || accs[0]?.id || ''
  const year = month.slice(0, 4)

  const { data: preview, isLoading: previewLoading, isError: previewError, isFetching: previewFetching, refetch: refetchPreview, error: previewFailure } = useFinanceClosingPreview(
    { accountId: effectiveAccountId, month },
    { enabled },
  )
  const { data: closings, isLoading, isError, isFetching, refetch } = useFinanceClosings(
    { accountId: effectiveAccountId || undefined, year },
    { enabled },
  )
  const createClosing = useCreateFinanceClosing()
  const deleteClosing = useDeleteFinanceClosing()

  const alreadyClosed = preview?.closing ?? null
  const expected = preview?.expectedBalanceCents ?? 0
  // Enquanto não digitam nada, a diferença mostrada é a do saldo esperado (zero).
  const countedCents = counted ? moneyToCents(counted) : expected
  const difference = countedCents - expected

  async function handleClose() {
    setError(null)
    if (!effectiveAccountId) { setError('Escolha o caixa.'); return }
    if (!counted) { setError('Informe o saldo contado.'); return }
    try {
      await createClosing.mutateAsync({
        accountId: effectiveAccountId,
        month,
        countedBalanceCents: moneyToCents(counted),
        notes: notes.trim() || null,
      })
      toast.success('Mês fechado.')
      setCounted('')
      setNotes('')
    } catch (e) {
      const msg = apiErrorMessage(e, 'Erro ao fechar o mês.')
      setError(msg)
      toast.error(msg)
    }
  }

  async function handleReopen() {
    if (!reopenTarget) return
    try {
      await deleteClosing.mutateAsync(reopenTarget.id)
      toast.success('Mês reaberto.')
      setReopenTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao reabrir o mês.'))
    }
  }

  const accountName = (id: string) => accs.find(a => a.id === id)?.name ?? 'Caixa'
  const rows = closings ?? []
  // Sem a prévia, os cartões mostravam R$ 0,00 e uma diferença calculada sobre
  // zero. O servidor recalcula o esperado ao gravar, mas fechar o mês sem ver o
  // esperado não faz sentido: o botão fica desligado até a prévia carregar.
  const previewFailed = previewError && !preview

  // Sem a lista de caixas não há o que fechar (antes: "Nenhum caixa cadastrado").
  if (accountsError && !accounts) {
    return (
      <LoadErrorRetry
        className="rounded-lg border border-border bg-card"
        message="Não foi possível carregar os caixas."
        onRetry={() => void refetchAccounts()}
        retrying={accountsFetching}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-2xl flex-col gap-1.5 text-sm text-muted-foreground">
        <p>
          Conferência do caixa no fim do mês: o sistema calcula o saldo esperado (o que
          havia antes do mês, mais as entradas, menos as saídas) e você digita o que foi
          contado de verdade. A diferença fica registrada.
        </p>
        {/* A trava do mês fechado (SR-054/SR-060): por caixa e mês, como o fechamento. */}
        <p>
          Com o mês fechado, os lançamentos desse caixa com data no mês não podem ser
          criados, editados nem excluídos (os comprovantes continuam livres). Para mudar
          algum, use "Reabrir mês".
        </p>
      </div>

      {/* ── Fechar um mês ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground" htmlFor="fech-caixa">Caixa</Label>
            <NativeSelect
              id="fech-caixa"
              className="w-[200px]"
              value={effectiveAccountId}
              onChange={e => { setAccountId(e.target.value); setCounted(''); setError(null) }}
            >
              {accs.length === 0 && <option value="">Nenhum caixa cadastrado</option>}
              {accs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground" htmlFor="fech-mes">Mês</Label>
            <Input
              id="fech-mes"
              type="month"
              className="w-[160px]"
              value={month}
              onChange={e => { setMonth(e.target.value || currentMonth()); setCounted(''); setError(null) }}
            />
          </div>
        </div>

        {/* Comparação do mês: entradas, saídas, saldo esperado e diferença. */}
        {previewFailed ? (
          <LoadErrorRetry
            variant="inline"
            message={loadErrorMessage(previewFailure, 'Não foi possível calcular o saldo esperado deste mês.')}
            onRetry={() => void refetchPreview()}
            retrying={previewFetching}
          />
        ) : (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          {[
            { label: 'Saldo anterior', value: preview?.openingCents ?? 0, cls: 'text-foreground' },
            { label: 'Entradas', value: preview?.inCents ?? 0, cls: 'text-success' },
            { label: 'Saídas', value: preview?.outCents ?? 0, cls: 'text-destructive' },
            { label: 'Saldo esperado', value: expected, cls: 'text-foreground' },
          ].map(i => (
            <div key={i.label} className="flex min-w-0 flex-col rounded-lg bg-muted px-3 py-2">
              <span className="text-xs text-muted-foreground">{i.label}</span>
              {previewLoading ? (
                <Skeleton className="mt-1 h-6 w-24 max-w-full" />
              ) : (
                <span className={cn('num truncate text-sm font-semibold sm:text-base', i.cls)}>
                  {centsToBRL(i.value)}
                </span>
              )}
            </div>
          ))}
          <div className="flex min-w-0 flex-col rounded-lg bg-muted px-3 py-2">
            <span className="text-xs text-muted-foreground">Diferença</span>
            {previewLoading ? (
              <Skeleton className="mt-1 h-6 w-24 max-w-full" />
            ) : (
              <span className={cn('num truncate text-sm font-semibold sm:text-base', diffClass(difference))}>
                {diffLabel(difference)}
              </span>
            )}
          </div>
        </div>
        )}

        {alreadyClosed ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2">
            <Lock className="size-4 text-warning" aria-hidden />
            <span className="text-sm text-foreground">
              {monthLabel(month)} já está fechado em {accountName(effectiveAccountId)}:
              contado <span className="num">{centsToBRL(alreadyClosed.countedBalanceCents)}</span>,
              diferença <span className={cn('num', diffClass(alreadyClosed.differenceCents))}>
                {diffLabel(alreadyClosed.differenceCents)}
              </span>.
            </span>
            {canDelete && (
              <Button variant="outline" size="sm" onClick={() => setReopenTarget(alreadyClosed)}>
                <Unlock className="size-4" /> Reabrir mês
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fech-contado">Saldo contado *</Label>
              <Input
                id="fech-contado"
                inputMode="numeric"
                className="sm:w-[180px]"
                placeholder="R$ 0,00"
                value={counted}
                onChange={e => setCounted(maskMoney(e.target.value))}
                disabled={!canCreate}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="fech-obs">Observações</Label>
              <Input
                id="fech-obs"
                value={notes}
                onChange={e => setNotes(upperNoAccents(e.target.value))}
                placeholder="Opcional — ex.: motivo da diferença"
                disabled={!canCreate}
              />
            </div>
            {canCreate && (
              <Button onClick={handleClose} disabled={!counted || !effectiveAccountId || previewFailed || createClosing.isPending} className="shrink-0">
                <Lock className="size-4" /> {createClosing.isPending ? 'Fechando...' : 'Fechar mês'}
              </Button>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* ── Histórico ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          Fechamentos de {year} — {accountName(effectiveAccountId)}
        </h2>
        {isError && !closings && (
          <LoadErrorRetry
            className="rounded-lg border border-border bg-card"
            message="Não foi possível carregar os fechamentos."
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        )}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Sem rolagem lateral: tabela fixa. No celular, esperado, contado e diferença
              saem das colunas e viram linhas miúdas embaixo do mês (em 360 px a tabela
              rolava de lado). */}
          <div>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="hidden sm:table-cell sm:w-[128px] text-right">Esperado</TableHead>
                  <TableHead className="hidden sm:table-cell sm:w-[128px] text-right">Contado</TableHead>
                  <TableHead className="hidden sm:table-cell sm:w-[150px]">Diferença</TableHead>
                  <TableHead className="hidden md:table-cell">Observações</TableHead>
                  <TableHead className="w-[56px] lg:w-[150px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton className="h-4 w-full" /></TableCell>
                  </TableRow>
                ))}
                {!isLoading && !isError && rows.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="p-0 whitespace-normal">
                      {accs.length === 0
                        ? <EmptyState icon={Landmark} title="Cadastre um caixa primeiro" />
                        : <EmptyState icon={Scale} title={`Nenhum mês fechado em ${year}`} />}
                    </TableCell>
                  </TableRow>
                )}
                {rows.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground whitespace-normal align-top">
                      {monthLabel(c.month)}
                      <div className="mt-1 flex flex-col items-start gap-0.5 text-xs font-normal text-muted-foreground sm:hidden">
                        <span>Esperado <span className="num">{centsToBRL(c.expectedBalanceCents)}</span></span>
                        <span>Contado <span className="num">{centsToBRL(c.countedBalanceCents)}</span></span>
                        <Badge variant={c.differenceCents === 0 ? 'neutral' : 'danger'} className="num">
                          {diffLabel(c.differenceCents)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="num hidden sm:table-cell text-right align-top">{centsToBRL(c.expectedBalanceCents)}</TableCell>
                    <TableCell className="num hidden sm:table-cell text-right align-top">{centsToBRL(c.countedBalanceCents)}</TableCell>
                    <TableCell className="hidden sm:table-cell align-top">
                      <Badge variant={c.differenceCents === 0 ? 'neutral' : 'danger'} className="num">
                        {diffLabel(c.differenceCents)}
                      </Badge>
                    </TableCell>
                    {/* Observação comprida quebra linha (o TableCell do shadcn é nowrap) em vez de alargar a tabela. */}
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground whitespace-normal align-top">
                      <span className="line-clamp-2 break-words" title={c.notes || undefined}>{c.notes || '—'}</span>
                    </TableCell>
                    <TableCell className="text-right align-top">
                      {canDelete ? (
                        <Button
                          size="sm" variant="ghost" className="h-8 px-2"
                          onClick={() => setReopenTarget(c)}
                          aria-label={`Reabrir mês ${monthNumeric(c.month)}`} title="Reabrir mês"
                        >
                          <Unlock className="size-4" />
                          <span className="hidden lg:inline">Reabrir mês</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-faint-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        open={!!reopenTarget}
        onOpenChange={o => { if (!o) setReopenTarget(null) }}
        title="Reabrir mês"
        description={
          reopenTarget
            ? `Reabrir ${monthNumeric(reopenTarget.month)} no caixa ${accountName(reopenTarget.accountId)} libera criar, editar e excluir os lançamentos desse mês. A reabertura fica registrada na auditoria.`
            : ''
        }
        onConfirm={handleReopen}
        pending={deleteClosing.isPending}
        confirmLabel="Reabrir mês"
        pendingLabel="Reabrindo..."
      />
    </div>
  )
}
