import {
  KIND_DOT_CLASS, KIND_LABEL, OCCUPANCY_START_MIN, hourAtFraction, occupancyRows, occupancyTicks,
  type AgendaEntry, type ScheduleKind,
} from '@/lib/agenda'
import { cn } from '@/lib/utils'

// Faixa de ocupação das salas no dia: uma linha por sala, das 07:00 às 22:00.
// Serve para achar o horário livre de bate-pronto. Clicar num pedaço vazio já
// abre a nova reserva naquela sala e naquele horário.

const BAR_CLASS: Record<ScheduleKind, string> = KIND_DOT_CLASS

/** Onde o clique caiu dentro da faixa, de 0 (07:00) a 1 (22:00). */
function fractionOf(event: React.MouseEvent<HTMLElement>): number {
  const rect = event.currentTarget.getBoundingClientRect()
  if (rect.width <= 0) return 0
  return (event.clientX - rect.left) / rect.width
}

export function RoomOccupancy({ date, items, rooms, canCreate, onOpenItem, onNewBooking }: {
  date: string
  items: AgendaEntry[]
  rooms: { id: string; name: string }[]
  canCreate: boolean
  onOpenItem: (item: AgendaEntry) => void
  onNewBooking: (roomId: string, startHour: string) => void
}) {
  const rows = occupancyRows(items, rooms, date)
  const ticks = occupancyTicks()
  const byKey = new Map(items.map(item => [item.key, item]))

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma sala cadastrada.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Régua das horas: de 3 em 3 horas, senão os números se embolam. As linhas
          da grade continuam de hora em hora. A primeira e a última ficam
          encostadas nas pontas para não sair da faixa nem cair uma sobre a outra. */}
      <div className="flex items-end gap-2 sm:pl-38">
        <div className="relative h-4 flex-1 overflow-hidden">
          {ticks.filter(tick => (tick.minutes - OCCUPANCY_START_MIN) % 180 === 0).map(tick => {
            const first = tick.left <= 0
            const last = tick.left >= 100
            return (
              <span
                key={tick.minutes}
                className={cn(
                  'absolute text-[10px] tabular-nums text-muted-foreground',
                  first && 'left-0',
                  last && 'right-0',
                  !first && !last && '-translate-x-1/2',
                )}
                style={first || last ? undefined : { left: `${tick.left}%` }}
              >
                {tick.label}
              </span>
            )
          })}
        </div>
      </div>

      {rows.map(row => (
        <div key={row.roomId} className="flex flex-col gap-1 sm:flex-row sm:items-stretch sm:gap-2">
          <p className="truncate text-sm font-medium text-foreground sm:w-36 sm:shrink-0 sm:self-center">
            {row.roomName}
          </p>
          <div
            // `flex-1` só na linha (sm+): empilhado no celular ele vira
            // flex-basis de ALTURA e a faixa da sala colapsa para zero.
            className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/40 sm:w-auto sm:flex-1"
            style={{ height: `${Math.max(1, row.lanes) * 32 + 8}px` }}
          >
            {/* Linhas das horas */}
            {ticks.map(tick => (
              <span
                key={tick.minutes}
                className="pointer-events-none absolute inset-y-0 w-px bg-border/70"
                style={{ left: `${tick.left}%` }}
                aria-hidden
              />
            ))}

            {/* Fundo clicável: abre a nova reserva na sala e no horário do clique. */}
            {canCreate ? (
              <button
                type="button"
                className="absolute inset-0 h-full w-full cursor-copy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                aria-label={`Marcar na sala ${row.roomName} neste dia`}
                title="Clique num espaço livre para marcar uma reserva"
                onClick={e => onNewBooking(row.roomId, hourAtFraction(fractionOf(e)))}
              />
            ) : null}

            {row.blocks.map(block => {
              const item = byKey.get(block.key)
              return (
                <button
                  key={block.key}
                  type="button"
                  title={block.label}
                  onClick={() => { if (item) onOpenItem(item) }}
                  className={cn(
                    'absolute flex items-center overflow-hidden rounded-md px-1.5 text-left text-[11px] font-semibold text-white',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    BAR_CLASS[block.kind],
                    block.cutBefore && 'rounded-l-none',
                    block.cutAfter && 'rounded-r-none',
                  )}
                  style={{
                    left: `${block.left}%`,
                    width: `${block.width}%`,
                    top: `${4 + block.lane * 32}px`,
                    height: '28px',
                  }}
                >
                  <span className="truncate">{block.title}</span>
                </button>
              )
            })}
          </div>
          {row.outside.length > 0 && (
            <p className="text-xs text-muted-foreground sm:self-center">
              +{row.outside.length} fora das 07:00–22:00
            </p>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
        {(['COURSE', 'EVENT', 'MEETING'] as ScheduleKind[]).map(kind => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-full', BAR_CLASS[kind])} aria-hidden />
            {KIND_LABEL[kind]}
          </span>
        ))}
        {canCreate && <span>Clique num espaço livre para marcar.</span>}
      </div>
    </div>
  )
}
