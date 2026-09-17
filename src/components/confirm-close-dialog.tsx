import { useEffect, useSyncExternalStore } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  answerLeaveConfirm,
  isLeaveConfirmOpen,
  registerLeaveConfirmHost,
  subscribeLeaveConfirm,
} from '@/hooks/use-unsaved-guard'

interface ConfirmCloseDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Esc conta como "continuar editando" (chama onCancel). */
  dismissible?: boolean
}

export function ConfirmCloseDialog({
  open,
  onConfirm,
  onCancel,
  title = 'Descartar alterações?',
  description = 'Você tem conteúdo não salvo. Se fechar agora, as alterações serão perdidas.',
  confirmLabel = 'Descartar e fechar',
  cancelLabel = 'Continuar editando',
  dismissible = false,
}: ConfirmCloseDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={dismissible ? o => { if (!o) onCancel() } : undefined}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Diálogo "sair sem salvar?" do useUnsavedGuard. Montado uma vez no layout do
// painel; mostra a pergunta quando uma navegação é bloqueada.
export function LeaveConfirmHost() {
  const open = useSyncExternalStore(subscribeLeaveConfirm, isLeaveConfirmOpen)

  useEffect(() => registerLeaveConfirmHost(), [])

  return (
    <ConfirmCloseDialog
      open={open}
      // A primeira resposta vale; o fechamento que vem depois do clique é ignorado.
      onConfirm={() => answerLeaveConfirm(true)}
      onCancel={() => answerLeaveConfirm(false)}
      title="Sair sem salvar?"
      description="Você tem alterações não salvas nesta tela. Se sair agora, elas serão perdidas."
      confirmLabel="Sair sem salvar"
      cancelLabel="Continuar editando"
      dismissible
    />
  )
}
