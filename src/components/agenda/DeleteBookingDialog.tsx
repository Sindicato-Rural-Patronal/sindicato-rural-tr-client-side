import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { useDeleteRoomBooking, type DeleteScope, type RoomBooking } from '@/hooks/useRoomBookings'
import { apiErrorMessage } from '@/lib/api-error-message'
import { formatDateBr, wallDate, wallTime } from '@/lib/agenda'

type Target = Pick<RoomBooking, 'id' | 'title' | 'startTime' | 'seriesId'>

/**
 * Excluir reserva. Se faz parte de uma repetição, pergunta se é só esta data
 * ou esta e as próximas; senão, confirmação simples.
 */
export function DeleteBookingDialog({ booking, onClose, onDeleted }: {
  booking: Target | null
  onClose: () => void
  /** Depois de excluir (ex.: fechar o diálogo de edição). */
  onDeleted?: (ids: string[]) => void
}) {
  const remove = useDeleteRoomBooking()

  async function run(scope: DeleteScope) {
    if (!booking) return
    try {
      const res = await remove.mutateAsync({ id: booking.id, scope })
      const n = res?.deleted ?? 1
      toast.success(n > 1 ? `${n} reservas excluídas.` : 'Reserva excluída.')
      onDeleted?.([booking.id])
      onClose()
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível excluir a reserva.'))
    }
  }

  const when = booking ? `${formatDateBr(wallDate(booking.startTime))} às ${wallTime(booking.startTime)}` : ''

  if (!booking?.seriesId) {
    return (
      <DeleteConfirmDialog
        open={!!booking}
        onOpenChange={open => { if (!open && !remove.isPending) onClose() }}
        title="Excluir reserva"
        description={<>Excluir <strong>{booking?.title}</strong> de {when}? A sala fica livre nesse horário.</>}
        onConfirm={() => run('one')}
        pending={remove.isPending}
      />
    )
  }

  return (
    <AlertDialog open onOpenChange={open => { if (!open && !remove.isPending) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir reserva que se repete</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{booking.title}</strong> ({when}) faz parte de uma repetição. O que você quer excluir?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-wrap">
          <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
          <Button variant="outline" className="h-10" disabled={remove.isPending} onClick={() => run('one')}>
            Só esta data
          </Button>
          <Button
            className="h-10 bg-destructive text-white hover:bg-destructive/90"
            disabled={remove.isPending}
            onClick={() => run('future')}
          >
            {remove.isPending ? 'Excluindo...' : 'Esta e as próximas'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
