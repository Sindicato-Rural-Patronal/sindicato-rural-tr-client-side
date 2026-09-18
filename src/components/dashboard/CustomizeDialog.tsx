import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Loader2, RotateCcw } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useUpdateDashboardPrefs, type DashboardPrefs } from '@/hooks/useAdmin'
import {
  DASHBOARD_BLOCKS, DEFAULT_ORDER, blockOrder, moveBlock, normalizePrefs, toggleHidden,
  type DashboardBlockId,
} from '@/components/dashboard/dashboard-prefs'

// "Personalizar": cada admin escolhe quais blocos do painel aparecem e em que
// ordem. Salva em PATCH /admin/me/preferences; se der erro, nada muda na tela.

const LABELS = new Map(DASHBOARD_BLOCKS.map(b => [b.id, b] as const))

export function CustomizeDialog({
  open, onOpenChange, prefs,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefs: DashboardPrefs | null | undefined
}) {
  // Estado só enquanto a janela está aberta: `key` no Dialog recomeça do salvo.
  const [order, setOrder] = useState<DashboardBlockId[]>(() => blockOrder(prefs))
  const [hidden, setHidden] = useState<DashboardBlockId[]>(() => (normalizePrefs(prefs).hidden ?? []) as DashboardBlockId[])
  const salvar = useUpdateDashboardPrefs()

  async function guardar(next: { order: DashboardBlockId[]; hidden: DashboardBlockId[] }) {
    try {
      await salvar.mutateAsync({ order: next.order, hidden: next.hidden })
      toast.success('Painel salvo do seu jeito')
      onOpenChange(false)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível salvar. O painel continua como estava.'))
    }
  }

  function restaurar() {
    setOrder([...DEFAULT_ORDER])
    setHidden([])
    void guardar({ order: [...DEFAULT_ORDER], hidden: [] })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Personalizar o painel</DialogTitle>
          <DialogDescription>
            Marque o que você quer ver e use as setas para mudar a ordem dos blocos.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          {order.map((id, i) => {
            const bloco = LABELS.get(id)
            if (!bloco) return null
            const visivel = !hidden.includes(id)
            return (
              <li key={id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <input
                  id={`bloco-${id}`}
                  type="checkbox"
                  checked={visivel}
                  onChange={() => setHidden(prev => toggleHidden(prev, id))}
                  className="size-5 shrink-0 accent-primary"
                />
                <label htmlFor={`bloco-${id}`} className="min-w-0 flex-1 cursor-pointer">
                  <span className="block text-sm font-medium text-foreground">{bloco.label}</span>
                  <span className="block text-xs text-muted-foreground">{bloco.hint}</span>
                </label>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    disabled={i === 0}
                    aria-label={`Subir ${bloco.label}`}
                    onClick={() => setOrder(prev => moveBlock(prev, id, -1))}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    disabled={i === order.length - 1}
                    aria-label={`Descer ${bloco.label}`}
                    onClick={() => setOrder(prev => moveBlock(prev, id, 1))}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={restaurar} disabled={salvar.isPending}>
            <RotateCcw className="size-4" aria-hidden /> Restaurar padrão
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={salvar.isPending}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => guardar({ order, hidden })} disabled={salvar.isPending}>
              {salvar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
