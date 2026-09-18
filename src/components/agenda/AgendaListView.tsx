import { useState } from 'react'
import { CalendarX, Pencil, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { ExportMenu, SelectCheckbox, SelectionInfo } from '@/components/export/ExportMenu'
import { KindBadge } from '@/components/agenda/KindBadge'
import { DeleteBookingDialog } from '@/components/agenda/DeleteBookingDialog'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useRowSelection } from '@/hooks/useRowSelection'
import { useRoomBookings, type RoomBooking } from '@/hooks/useRoomBookings'
import {
  formatDayMonth, responsibleLabel, timeRangeLabel, wallDate, weekdayShort, type BookingType,
} from '@/lib/agenda'
import { STICKY_ACTIONS_CELL, STICKY_ACTIONS_ROW } from '@/lib/table-sticky-actions'

/** Lista das reservas (eventos e reuniões) da semana, com busca e exportação. */
export function AgendaListView({ from, to, roomId, type, canUpdate, canDelete, onOpen }: {
  from: string
  to: string
  roomId?: string
  type?: BookingType
  canUpdate: boolean
  canDelete: boolean
  /** Abre o diálogo da reserva (editar ou só ver). */
  onOpen: (booking: RoomBooking) => void
}) {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 350).trim()
  const filters = { from, to, roomId, type, search: debounced || undefined }
  const { data, isLoading, isError } = useRoomBookings(filters)
  const selection = useRowSelection()
  const [deleteTarget, setDeleteTarget] = useState<RoomBooking | null>(null)

  const rows = data ?? []
  const pageIds = rows.map(b => b.id)
  const pageState = selection.pageState(pageIds)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título ou responsável…"
            aria-label="Buscar reservas"
            className="h-10 pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <SelectionInfo count={selection.count} onClear={selection.clear} />
          <ExportMenu
            dataset="room-bookings"
            filters={filters}
            selectedIds={selection.ids}
            total={data ? rows.length : undefined}
            filtered={!!(roomId || type || debounced)}
            className="h-10"
          />
        </div>
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar as reservas." />}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <SelectCheckbox
                    checked={pageState === 'all'}
                    indeterminate={pageState === 'some'}
                    onChange={() => selection.togglePage(pageIds)}
                    label="Selecionar todas as reservas da lista"
                  />
                </TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Reserva</TableHead>
                <TableHead>Sala</TableHead>
                <TableHead className="hidden md:table-cell">Responsável</TableHead>
                <TableHead className={`text-right ${STICKY_ACTIONS_CELL}`}>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && !isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-14 text-center">
                    <CalendarX className="mx-auto mb-3 size-10 text-muted-foreground/30" aria-hidden />
                    <p className="text-sm font-medium">
                      {debounced ? 'Nenhuma reserva encontrada.' : 'Nenhum evento ou reunião nesta semana.'}
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {rows.map(booking => (
                <TableRow key={booking.id} className={STICKY_ACTIONS_ROW}>
                  <TableCell>
                    <SelectCheckbox
                      checked={selection.isSelected(booking.id)}
                      onChange={() => selection.toggle(booking.id)}
                      label={`Selecionar ${booking.title}`}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm font-medium">
                      {weekdayShort(wallDate(booking.startTime))} {formatDayMonth(wallDate(booking.startTime))}
                    </div>
                    <div className="text-sm tabular-nums text-muted-foreground">{timeRangeLabel(booking)}</div>
                  </TableCell>
                  <TableCell className="min-w-48">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium">{booking.title}</span>
                      <KindBadge kind={booking.type} />
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{booking.roomName}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{responsibleLabel(booking) || '—'}</TableCell>
                  <TableCell className={`text-right ${STICKY_ACTIONS_CELL}`}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" className="h-9 px-2" onClick={() => onOpen(booking)} title={canUpdate ? 'Editar reserva' : 'Ver reserva'}>
                        <Pencil className="size-4" />
                        <span className="hidden sm:inline">{canUpdate ? 'Editar' : 'Ver'}</span>
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          className="h-9 px-2 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(booking)}
                          title="Excluir reserva"
                        >
                          <Trash2 className="size-4" />
                          <span className="hidden sm:inline">Excluir</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {deleteTarget && (
        <DeleteBookingDialog
          booking={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={ids => selection.remove(...ids)}
        />
      )}
    </div>
  )
}
