import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { AgendaWeekView } from '@/components/agenda/AgendaWeekView'
import { AgendaListView } from '@/components/agenda/AgendaListView'
import { BookingDialog } from '@/components/agenda/BookingDialog'
import { usePermissions } from '@/hooks/usePermissions'
import { useRooms } from '@/hooks/useRooms'
import {
  useRoomBookings, useRoomSchedule, type RoomBooking, type RoomScheduleItem,
} from '@/hooks/useRoomBookings'
import {
  KIND_DOT_CLASS, KIND_LABEL, addDays, weekDays, weekLabel, weekStart,
  type AgendaSearch, type AgendaTypeFilter, type ScheduleKind,
} from '@/lib/agenda'
import { cn } from '@/lib/utils'
import { todayYmd } from '@/utils/dates'

const routeApi = getRouteApi('/_admin/admin/agenda')

type DialogState = {
  open: boolean
  /** Reserva a editar (id); null = nova. Continua preenchido ao fechar, para a animação. */
  bookingId: string | null
  /** Reserva já em mãos (vinda da lista). */
  booking: RoomBooking | null
  defaults: { date?: string; roomId?: string }
}

const CLOSED: DialogState = { open: false, bookingId: null, booking: null, defaults: {} }

function Chip({ active, onClick, children, kind }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  kind?: ScheduleKind
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
      )}
    >
      {kind && <span className={cn('size-2.5 rounded-full ring-2 ring-background', KIND_DOT_CLASS[kind])} aria-hidden />}
      {children}
    </button>
  )
}

/** Agenda das salas: cursos, eventos e reuniões por semana (ou lista das reservas). */
export function AgendaPage() {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const { can } = usePermissions()
  const { data: rooms } = useRooms()

  const today = todayYmd()
  const monday = search.week ?? weekStart(today)
  const sunday = addDays(monday, 6)
  const view = search.view ?? 'semana'
  const typeFilter: AgendaTypeFilter = search.type ?? 'all'
  const roomId = search.roomId

  const canCreate = can('CREATE_COURSE')
  const canUpdate = can('UPDATE_COURSE')
  const canDelete = can('DELETE_COURSE')

  const schedule = useRoomSchedule({ from: monday, to: sunday, roomId })
  // Dados completos das reservas da semana: o diálogo de edição precisa deles.
  const weekBookings = useRoomBookings({ from: monday, to: sunday, roomId }, { enabled: view === 'semana' })
  const [dialog, setDialog] = useState<DialogState>(CLOSED)

  function setSearch(patch: Partial<AgendaSearch>) {
    navigate({ search: prev => ({ ...prev, ...patch }), replace: true })
  }

  const scheduleItems = (schedule.data ?? []).filter(item => typeFilter === 'all' || item.kind === typeFilter)

  function openItem(item: RoomScheduleItem) {
    if (item.kind === 'COURSE') {
      navigate({ to: '/admin/cursos', search: { curso: item.id } })
      return
    }
    setDialog({ open: true, bookingId: item.id, booking: null, defaults: {} })
  }

  function openCreate(date?: string) {
    const inWeek = today >= monday && today <= sunday
    setDialog({ open: true, bookingId: null, booking: null, defaults: { date: date ?? (inWeek ? today : monday), roomId } })
  }

  const foundBooking = dialog.bookingId ? weekBookings.data?.find(b => b.id === dialog.bookingId) ?? null : null
  // Guarda a reserva achada: depois de excluir ela some da lista, e o diálogo
  // ainda está fechando (não pode virar "nova reserva" na animação).
  if (dialog.open && !dialog.booking && foundBooking) setDialog(prev => ({ ...prev, booking: foundBooking }))
  const dialogBooking = dialog.booking ?? foundBooking
  const waitingBooking = !!dialog.bookingId && !dialogBooking

  // Na lista não há cursos: o filtro "Curso" vale como "Todos".
  const listType = typeFilter === 'EVENT' || typeFilter === 'MEETING' ? typeFilter : undefined
  const chipKinds: ScheduleKind[] = view === 'lista' ? ['EVENT', 'MEETING'] : ['COURSE', 'EVENT', 'MEETING']

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agenda das salas</h1>
          <p className="text-sm text-muted-foreground">Cursos, eventos e reuniões marcados em cada sala.</p>
        </div>
        {canCreate && (
          <Button className="h-11 shrink-0 px-5 text-base" onClick={() => openCreate()}>
            <Plus className="size-5" /> Nova reserva
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-10 px-4" onClick={() => setSearch({ week: undefined })}>
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-10"
            onClick={() => setSearch({ week: addDays(monday, -7) })}
            aria-label="Semana anterior"
            title="Semana anterior"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-10"
            onClick={() => setSearch({ week: addDays(monday, 7) })}
            aria-label="Próxima semana"
            title="Próxima semana"
          >
            <ChevronRight className="size-5" />
          </Button>
          <h2 className="ml-1 text-lg font-semibold text-foreground" aria-live="polite">{weekLabel(monday)}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="agenda-room" className="sr-only">Sala</label>
          <NativeSelect
            id="agenda-room"
            className="h-10 min-w-48"
            value={roomId ?? ''}
            onChange={e => setSearch({ roomId: e.target.value || undefined })}
          >
            <option value="">Todas as salas</option>
            {rooms?.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
          </NativeSelect>
          <div role="group" aria-label="Forma de ver" className="inline-flex rounded-lg border bg-muted/40 p-1">
            {([
              { value: 'semana', label: 'Semana', icon: CalendarDays },
              { value: 'lista', label: 'Lista', icon: List },
            ] as const).map(option => (
              <button
                key={option.value}
                type="button"
                aria-pressed={view === option.value}
                onClick={() => setSearch({ view: option.value === 'semana' ? undefined : option.value })}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  view === option.value ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <option.icon className="size-4" aria-hidden />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-2">
        <Chip active={view === 'lista' ? !listType : typeFilter === 'all'} onClick={() => setSearch({ type: undefined })}>
          Todos
        </Chip>
        {chipKinds.map(kind => (
          <Chip key={kind} kind={kind} active={typeFilter === kind} onClick={() => setSearch({ type: kind })}>
            {KIND_LABEL[kind]}
          </Chip>
        ))}
      </div>

      {view === 'semana' ? (
        <>
          {schedule.isError && <LoadErrorBanner message="Erro ao carregar a agenda." />}
          <AgendaWeekView
            days={weekDays(monday)}
            today={today}
            items={scheduleItems}
            loading={schedule.isLoading}
            onOpenItem={openItem}
            onCreateAt={canCreate ? date => openCreate(date) : undefined}
          />
        </>
      ) : (
        <AgendaListView
          from={monday}
          to={sunday}
          roomId={roomId}
          type={listType}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onOpen={booking => setDialog({ open: true, bookingId: booking.id, booking, defaults: {} })}
        />
      )}

      <BookingDialog
        open={dialog.open}
        booking={dialogBooking}
        loading={dialog.open && waitingBooking && weekBookings.isFetching}
        notFound={dialog.open && waitingBooking && !weekBookings.isFetching}
        defaults={dialog.defaults}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onClose={() => setDialog(prev => ({ ...prev, open: false }))}
      />
    </div>
  )
}
