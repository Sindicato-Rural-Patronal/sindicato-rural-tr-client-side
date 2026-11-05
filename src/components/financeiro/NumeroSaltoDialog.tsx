import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { textoDoSalto, type Salto } from '@/lib/finance-number'

/**
 * Pergunta antes de gravar um Nº digitado à frente do próximo automático (decisão 005, item 2):
 * "Esse número pula do 128 para o 5000. Os próximos automáticos continuam do 5001.".
 * `salto` nulo = fechado. "Corrigir o número" volta ao formulário sem gravar nada.
 */
export function NumeroSaltoDialog({ salto, onConfirm, onCancel, pending = false }: {
  salto: Salto | null
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
}) {
  return (
    <AlertDialog open={!!salto} onOpenChange={o => { if (!o) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Número fora da sequência</AlertDialogTitle>
          <AlertDialogDescription>{salto ? textoDoSalto(salto) : ''}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Corrigir o número</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={e => { e.preventDefault(); onConfirm() }}
          >
            Usar o Nº {salto?.para}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
