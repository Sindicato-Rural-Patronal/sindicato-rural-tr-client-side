import { useState } from 'react'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/lib/api-error-message'
import { NativeSelect } from '@/components/ui/native-select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { useFinancePaymentMethods, useCreateFinancePaymentMethod } from '@/hooks/useFinance'

// Opção especial do select: abre o diálogo de cadastro em vez de escolher.
const NEW = '__nova__'

type Props = {
  value: string
  onChange: (value: string) => void
  /** Quem não tem CREATE_FINANCE só escolhe o que já está cadastrado. */
  canCreate?: boolean
  enabled?: boolean
  className?: string
  /** Texto da opção vazia (ex.: "Todas" no filtro, "Sem forma" no formulário). */
  emptyLabel?: string
  id?: string
}

/**
 * Select das formas de pagamento cadastradas, com "+ Nova forma de pagamento".
 * O lançamento continua guardando o texto, então uma forma escolhida antes e
 * depois desativada ainda aparece como opção (não some do que já foi lançado).
 */
export function PaymentMethodSelect({
  value, onChange, canCreate = false, enabled = true, className = '', emptyLabel = 'Sem forma', id,
}: Props) {
  const { data: methods } = useFinancePaymentMethods({ enabled })
  const createMethod = useCreateFinancePaymentMethod()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const list = methods ?? []
  const known = list.some(m => m.name.toUpperCase() === value.toUpperCase())

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) { setError('Informe o nome.'); return }
    setError(null)
    try {
      const created = await createMethod.mutateAsync(trimmed)
      onChange(created.name)
      toast.success('Forma de pagamento criada!')
      setDialogOpen(false)
      setName('')
    } catch (e) {
      const msg = apiErrorMessage(e, 'Erro ao criar a forma de pagamento.')
      setError(msg)
    }
  }

  return (
    <>
      <NativeSelect
        id={id}
        className={className}
        value={value}
        onChange={e => {
          if (e.target.value === NEW) {
            setName('')
            setError(null)
            setDialogOpen(true)
            return
          }
          onChange(e.target.value)
        }}
      >
        <option value="">{emptyLabel}</option>
        {list.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
        {/* Forma antiga (texto livre) ou desativada: mantém o valor do lançamento. */}
        {value && !known && <option value={value}>{value}</option>}
        {canCreate && <option value={NEW}>+ Nova forma de pagamento</option>}
      </NativeSelect>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova forma de pagamento</DialogTitle>
            <DialogDescription>
              Entra na lista e passa a valer para todos os lançamentos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nova-forma">Nome *</Label>
            <Input
              id="nova-forma"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              placeholder="Ex: DEPÓSITO"
              autoFocus
            />
            <span className="text-[11px] text-muted-foreground">
              Gravada em letras maiúsculas.
            </span>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createMethod.isPending}>
              {createMethod.isPending ? 'Salvando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
