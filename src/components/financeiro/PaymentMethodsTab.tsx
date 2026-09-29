import { toast } from 'sonner'
import { CreditCard, Pencil, Plus, Trash2 } from 'lucide-react'
import { apiErrorMessage } from '@/lib/api-error-message'
import {
  useFinancePaymentMethods, useCreateFinancePaymentMethod,
  useUpdateFinancePaymentMethod, useDeleteFinancePaymentMethod,
  type FinancePaymentMethod,
} from '@/hooks/useFinance'
import { useCrudDialog } from '@/hooks/useCrudDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { ConfirmCloseDialog } from '@/components/confirm-close-dialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'

// Formas de pagamento (PIX, DINHEIRO, BOLETO...). Antes elas só nasciam pelo
// "+ Nova forma de pagamento" de dentro do select do lançamento, e não havia
// lugar nenhum para arrumá-las: quem digitasse "PIIX" convivia com o erro para
// sempre, ele aparecendo na lista de todo lançamento novo.
//
// O lançamento guarda o TEXTO da forma, não uma referência — por isso excluir
// uma forma daqui não mexe em lançamento nenhum que já foi feito.

type Form = { name: string; active: boolean }
const vazio = (): Form => ({ name: '', active: true })

export function PaymentMethodsTab({ enabled, canCreate, canUpdate, canDelete }: {
  enabled: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}) {
  const { data, isLoading, isError } = useFinancePaymentMethods({ includeInactive: true, enabled })
  const criar = useCreateFinancePaymentMethod()
  const atualizar = useUpdateFinancePaymentMethod()
  const excluir = useDeleteFinancePaymentMethod()

  const crud = useCrudDialog<Form, FinancePaymentMethod>({
    empty: vazio,
    toForm: m => ({ name: m.name, active: m.active }),
  })

  const formas = data ?? []
  const salvando = criar.isPending || atualizar.isPending

  async function salvar() {
    crud.setError(null)
    const name = crud.form.name.trim()
    if (!name) { crud.setError('Informe o nome.'); return }
    try {
      if (crud.editing) {
        await atualizar.mutateAsync({ id: crud.editing.id, body: { name, active: crud.form.active } })
        toast.success('Forma de pagamento atualizada!')
      } else {
        await criar.mutateAsync(name)
        toast.success('Forma de pagamento criada!')
      }
      crud.forceClose()
    } catch (e) {
      const msg = apiErrorMessage(e, 'Erro ao salvar a forma de pagamento.')
      crud.setError(msg)
      toast.error(msg)
    }
  }

  async function remover() {
    if (!crud.deleteTarget) return
    try {
      await excluir.mutateAsync(crud.deleteTarget.id)
      toast.success('Forma de pagamento removida.')
      crud.setDeleteTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover a forma de pagamento.'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          As opções que aparecem em <strong>Forma</strong> ao registrar um lançamento. O lançamento
          já feito guarda o nome que foi escolhido, então mexer aqui não altera o que passou.
        </p>
        {canCreate && (
          <Button onClick={crud.openCreate} className="shrink-0">
            <Plus className="size-4" /> Nova forma
          </Button>
        )}
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar as formas de pagamento." />}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Forma de pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && formas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-16 text-center">
                    <CreditCard className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">Nenhuma forma de pagamento</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Cadastre as que o sindicato usa: PIX, dinheiro, boleto…
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {formas.map(m => (
                <TableRow key={m.id} className={m.active ? '' : 'opacity-60'}>
                  <TableCell className="font-medium text-foreground">{m.name}</TableCell>
                  <TableCell>
                    <Badge variant={m.active ? 'default' : 'secondary'}>
                      {m.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => crud.openEdit(m)}
                          aria-label={'Editar ' + m.name}
                          title="Editar"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-muted-foreground hover:text-destructive"
                          onClick={() => crud.setDeleteTarget(m)}
                          aria-label={'Excluir ' + m.name}
                          title="Excluir"
                        >
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
            <DialogTitle>
              {crud.editing ? 'Editar forma de pagamento' : 'Nova forma de pagamento'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="forma-nome">Nome *</Label>
              {/* Sem upperNoAccents: o backend já normaliza para caixa alta
                  (normalizePaymentMethodName), e "pix", "Pix" e "PIX " viram
                  a mesma forma — cadastrar repetido reaproveita a existente. */}
              <Input
                id="forma-nome"
                value={crud.form.name}
                onChange={e => crud.setField('name', e.target.value)}
                placeholder="Ex: PIX"
                autoFocus
              />
            </div>
            {crud.editing && (
              <button
                type="button"
                onClick={() => crud.setField('active', !crud.form.active)}
                className="flex w-fit items-center gap-2 text-sm text-foreground"
              >
                <span className={`inline-block size-4 rounded-sm border ${crud.form.active ? 'border-emerald-500 bg-emerald-500' : 'border-input'}`} />
                {crud.form.active ? 'Ativa (aparece nos lançamentos)' : 'Inativa'}
              </button>
            )}
            {crud.error && <p className="text-sm text-destructive" role="alert">{crud.error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={crud.requestClose}>Cancelar</Button>
            <Button onClick={salvar} disabled={!crud.form.name.trim() || salvando}>
              {salvando ? 'Salvando...' : crud.editing ? 'Salvar' : 'Cadastrar'}
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
        title="Excluir forma de pagamento"
        description={
          <>
            Excluir <strong>{crud.deleteTarget?.name}</strong>? Ela sai da lista dos próximos
            lançamentos. Os lançamentos já feitos guardam o nome e <strong>não mudam</strong>.
          </>
        }
        onConfirm={remover}
        pending={excluir.isPending}
      />
    </div>
  )
}
