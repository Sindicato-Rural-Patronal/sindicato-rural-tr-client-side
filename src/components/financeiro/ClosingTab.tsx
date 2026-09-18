import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Scale, Lock, Unlock, Landmark } from 'lucide-react'
import { apiErrorMessage } from '@/lib/api-error-message'
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
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { currentMonth, monthLabel } from '@/lib/finance-month'

/** Classe de cor da diferença: vermelho quando não bate. */
function diffClass(cents: number): string {
  return cents === 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'
}

function diffLabel(cents: number): string {
  if (cents === 0) return 'Confere'
  return `${cents > 0 ? 'Sobrou ' : 'Faltou '}${centsToBRL(Math.abs(cents))}`
}

export function ClosingTab({ enabled, canCreate, canDelete }: {
  enabled: boolean; canCreate: boolean; canDelete: boolean
}) {
  const { data: accounts } = useFinanceAccounts({ enabled })
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

  const { data: preview, isLoading: previewLoading } = useFinanceClosingPreview(
    { accountId: effectiveAccountId, month },
    { enabled },
  )
  const { data: closings, isLoading, isError } = useFinanceClosings(
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
      toast.success('Mês fechado!')
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

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Conferência do caixa no fim do mês: o sistema calcula o saldo esperado (o que
        havia antes do mês, mais as entradas, menos as saídas) e você digita o que foi
        contado de verdade. A diferença fica registrada.
      </p>

      {/* ── Fechar um mês ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground" htmlFor="fech-caixa">Caixa</Label>
            <NativeSelect
              id="fech-caixa"
              className="h-9 w-[200px]"
              value={effectiveAccountId}
              onChange={e => { setAccountId(e.target.value); setCounted(''); setError(null) }}
            >
              {accs.length === 0 && <option value="">Nenhum caixa cadastrado</option>}
              {accs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground" htmlFor="fech-mes">Mês</Label>
            <Input
              id="fech-mes"
              type="month"
              className="h-9 w-[160px]"
              value={month}
              onChange={e => { setMonth(e.target.value || currentMonth()); setCounted(''); setError(null) }}
            />
          </div>
        </div>

        {/* Comparação do mês: entradas, saídas, saldo esperado e diferença. */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          {[
            { label: 'Saldo anterior', value: preview?.openingCents ?? 0, cls: 'text-foreground' },
            { label: 'Entradas', value: preview?.inCents ?? 0, cls: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Saídas', value: preview?.outCents ?? 0, cls: 'text-red-600 dark:text-red-400' },
            { label: 'Saldo esperado', value: expected, cls: 'text-foreground' },
          ].map(i => (
            <div key={i.label} className="flex min-w-0 flex-col rounded-lg border border-border bg-background px-3 py-2">
              <span className="text-xs text-muted-foreground">{i.label}</span>
              {previewLoading ? (
                <Skeleton className="mt-1 h-6 w-24 max-w-full" />
              ) : (
                <span className={`truncate text-sm font-semibold tabular-nums sm:text-base ${i.cls}`}>
                  {centsToBRL(i.value)}
                </span>
              )}
            </div>
          ))}
          <div className="flex min-w-0 flex-col rounded-lg border border-border bg-background px-3 py-2">
            <span className="text-xs text-muted-foreground">Diferença</span>
            {previewLoading ? (
              <Skeleton className="mt-1 h-6 w-24 max-w-full" />
            ) : (
              <span className={`truncate text-sm font-semibold tabular-nums sm:text-base ${diffClass(difference)}`}>
                {diffLabel(difference)}
              </span>
            )}
          </div>
        </div>

        {alreadyClosed ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <Lock className="size-4 text-muted-foreground" />
            <span className="text-sm text-foreground">
              {monthLabel(month)} já está fechado em {accountName(effectiveAccountId)}:
              contado {centsToBRL(alreadyClosed.countedBalanceCents)},
              diferença <span className={diffClass(alreadyClosed.differenceCents)}>
                {diffLabel(alreadyClosed.differenceCents)}
              </span>.
            </span>
            {canDelete && (
              <Button variant="outline" size="sm" onClick={() => setReopenTarget(alreadyClosed)}>
                <Unlock className="size-4" /> Reabrir
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
                className="w-[180px]"
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
              <Button onClick={handleClose} disabled={!counted || !effectiveAccountId || createClosing.isPending} className="shrink-0">
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
        {isError && <LoadErrorBanner message="Erro ao carregar os fechamentos." />}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Contado</TableHead>
                  <TableHead>Diferença</TableHead>
                  <TableHead className="hidden md:table-cell">Observações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton className="h-4 w-full" /></TableCell>
                  </TableRow>
                ))}
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center">
                      {accs.length === 0 ? (
                        <>
                          <Landmark className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm font-medium text-foreground">Cadastre um caixa primeiro</p>
                        </>
                      ) : (
                        <>
                          <Scale className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm font-medium text-foreground">Nenhum mês fechado em {year}</p>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                )}
                {rows.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground">{monthLabel(c.month)}</TableCell>
                    <TableCell className="text-right tabular-nums">{centsToBRL(c.expectedBalanceCents)}</TableCell>
                    <TableCell className="text-right tabular-nums">{centsToBRL(c.countedBalanceCents)}</TableCell>
                    <TableCell>
                      <Badge variant={c.differenceCents === 0 ? 'secondary' : 'destructive'}>
                        {diffLabel(c.differenceCents)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {c.notes || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {canDelete ? (
                        <Button
                          size="sm" variant="ghost" className="h-8 px-2"
                          onClick={() => setReopenTarget(c)}
                          aria-label="Reabrir" title="Reabrir o mês"
                        >
                          <Unlock className="size-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
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
        title="Reabrir o mês"
        description={
          <>
            O fechamento de {reopenTarget ? monthLabel(reopenTarget.month) : ''} será apagado
            e o mês poderá ser fechado de novo. Os lançamentos não são alterados.
          </>
        }
        onConfirm={handleReopen}
        pending={deleteClosing.isPending}
        confirmLabel="Reabrir"
        pendingLabel="Reabrindo..."
      />
    </div>
  )
}
