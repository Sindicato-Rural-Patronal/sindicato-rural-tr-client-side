import { useState } from 'react'
import { CalendarCheck, GraduationCap, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { ExportMenu } from '@/components/export/ExportMenu'
import { KindBadge } from '@/components/agenda/KindBadge'
import { OnSiteBadge } from '@/components/agenda/OnSiteBadge'
import { BookingDialog } from '@/components/agenda/BookingDialog'
import { usePermissions } from '@/hooks/usePermissions'
import { useRoomBookings, type RoomBooking } from '@/hooks/useRoomBookings'
import { formatDateBr, timeRangeLabel, weekdayLong, type BookingType } from '@/lib/agenda'
import { dayAgenda, dayCountLabel, type ScheduleEntryLike } from '@/lib/dashboard-agenda'

/** Curso do dia, como vem da lista de cursos do painel. */
export type DayAgendaCourse = {
  id: string
  title: string
  startTime: string | null
  endTime: string | null
  location: string | null
  instructorName: string | null
}

/** Evento ou reunião do dia, como vem de GET /admin/room-schedule. */
export type DayAgendaBooking = ScheduleEntryLike & {
  id: string
  title: string
  roomName: string
  publicOnSite?: boolean
}

type DialogState = {
  open: boolean
  /** Reserva a editar (id); null = nova. Continua preenchido ao fechar, para a animação. */
  bookingId: string | null
  /** Reserva já carregada (não pode virar "nova reserva" na animação de fechar). */
  booking: RoomBooking | null
  defaults: { date?: string; roomId?: string }
}

const CLOSED: DialogState = { open: false, bookingId: null, booking: null, defaults: {} }

/**
 * Agenda do dia selecionado no calendário do Painel Geral: cursos, eventos e
 * reuniões. É por aqui que se marca, edita e exclui reserva de sala.
 */
export function DayAgendaPanel({
  date, courses, bookings, roomId, bookingType, loadError = false, onOpenCourse,
}: {
  date: string
  courses: DayAgendaCourse[]
  /** Itens de reserva do período visível (o painel recorta o dia). */
  bookings: DayAgendaBooking[]
  /** Sala do filtro: entra na nova reserva e na exportação. */
  roomId?: string
  /** Tipo do filtro, quando é só evento ou só reunião: entra na exportação. */
  bookingType?: BookingType
  loadError?: boolean
  /** Curso continua abrindo a tela de cursos. */
  onOpenCourse: (courseId: string) => void
}) {
  const { can } = usePermissions()
  const canRead = can('READ_COURSE')
  const canCreate = can('CREATE_COURSE')
  const canUpdate = can('UPDATE_COURSE')
  const canDelete = can('DELETE_COURSE')

  const [dialog, setDialog] = useState<DialogState>(CLOSED)

  // Só busca a reserva inteira quando alguém abre o diálogo de edição.
  const dayBookings = useRoomBookings(
    { from: date, to: date, roomId },
    { enabled: !!dialog.bookingId },
  )

  const entries = dayAgenda(courses, bookings, date)
  const reservasDoDia = entries.length - courses.length
  const contagem = dayCountLabel(courses.length, reservasDoDia)

  const foundBooking = dialog.bookingId
    ? dayBookings.data?.find(b => b.id === dialog.bookingId) ?? null
    : null
  if (dialog.open && !dialog.booking && foundBooking) setDialog(prev => ({ ...prev, booking: foundBooking }))
  const dialogBooking = dialog.booking ?? foundBooking
  const waitingBooking = !!dialog.bookingId && !dialogBooking

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex min-w-0 items-center gap-2 text-base">
            <CalendarCheck className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="capitalize">{weekdayLong(date)}, {formatDateBr(date)}</span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {contagem && <Badge variant="secondary">{contagem}</Badge>}
            {canRead && (
              <ExportMenu
                dataset="room-bookings"
                filters={{ from: date, to: date, roomId, type: bookingType }}
                total={reservasDoDia}
                filtered={!!roomId || !!bookingType}
                className="h-9"
              />
            )}
            {canCreate && (
              <Button
                className="h-9"
                onClick={() => setDialog({ open: true, bookingId: null, booking: null, defaults: { date, roomId } })}
              >
                <Plus className="size-4" /> Nova reserva
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loadError && <LoadErrorBanner message="Erro ao carregar as reservas de sala." className="mb-3" />}

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 rounded-full bg-muted p-4">
              <CalendarCheck className="size-6 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-sm font-medium text-foreground">Nada marcado neste dia.</p>
            <p className="text-xs text-muted-foreground">Selecione outro dia no calendário</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {entries.map(entry => {
              const item = entry.item
              const isCourse = entry.kind === 'COURSE'
              const booking = isCourse ? null : (item as DayAgendaBooking)
              const course = isCourse ? (item as DayAgendaCourse) : null
              const quando = booking
                ? timeRangeLabel(booking)
                : course?.startTime
                  ? `${course.startTime}${course.endTime ? ` – ${course.endTime}` : ''}`
                  : 'Sem horário'
              const onde = booking ? booking.roomName : course?.location
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    onClick={() => {
                      if (course) onOpenCourse(course.id)
                      else if (booking) setDialog({ open: true, bookingId: booking.id, booking: null, defaults: {} })
                    }}
                    className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                        isCourse
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}
                    >
                      {isCourse ? <GraduationCap className="size-5" aria-hidden /> : <CalendarCheck className="size-5" aria-hidden />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                      <div className="mt-1.5 flex flex-col gap-1 text-xs text-muted-foreground">
                        <span className="tabular-nums">{quando}</span>
                        {onde && <span className="truncate">{onde}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <KindBadge kind={entry.kind} />
                        {booking?.publicOnSite && <OnSiteBadge />}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <BookingDialog
        open={dialog.open}
        booking={dialogBooking}
        loading={dialog.open && waitingBooking && dayBookings.isFetching}
        notFound={dialog.open && waitingBooking && !dayBookings.isFetching}
        defaults={dialog.defaults}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onClose={() => setDialog(prev => ({ ...prev, open: false }))}
      />
    </Card>
  )
}
