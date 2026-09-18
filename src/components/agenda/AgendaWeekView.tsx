import { DoorOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { KindBadge } from '@/components/agenda/KindBadge'
import type { RoomScheduleItem } from '@/hooks/useRoomBookings'
import {
  KIND_ACCENT_CLASS, formatDayMonth, itemsForDay, timeRangeLabel, weekdayLong, weekdayShort,
} from '@/lib/agenda'
import { cn } from '@/lib/utils'

/**
 * Semana da agenda: 7 colunas (seg → dom) em tela larga; em telas menores cada
 * dia vira um cartão, um embaixo do outro. Itens de vários dias aparecem em
 * todos os dias que ocupam.
 */
export function AgendaWeekView({ days, today, items, loading, onOpenItem, onCreateAt }: {
  days: string[]
  today: string
  items: RoomScheduleItem[]
  loading: boolean
  onOpenItem: (item: RoomScheduleItem) => void
  /** Sem permissão de criar: não mostra o "+" dos dias. */
  onCreateAt?: (date: string) => void
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7 xl:gap-2">
      {days.map(day => {
        const dayItems = itemsForDay(items, day)
        const isToday = day === today
        return (
          <section
            key={day}
            aria-label={`${weekdayLong(day)}, ${formatDayMonth(day)}`}
            className={cn(
              'flex min-w-0 flex-col rounded-xl border bg-card',
              isToday && 'border-primary ring-1 ring-primary',
            )}
          >
            <header className="flex items-center justify-between gap-1 border-b px-3 py-2">
              <div className="min-w-0">
                <p className={cn('text-sm font-semibold', isToday && 'text-primary')}>
                  <span className="xl:hidden">{weekdayLong(day)}</span>
                  <span className="hidden xl:inline">{weekdayShort(day)}</span>
                  {' '}
                  <span className="tabular-nums">{formatDayMonth(day)}</span>
                </p>
                {isToday && <p className="text-xs font-medium text-primary">Hoje</p>}
              </div>
              {onCreateAt && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0"
                  onClick={() => onCreateAt(day)}
                  aria-label={`Nova reserva em ${formatDayMonth(day)}`}
                  title="Nova reserva neste dia"
                >
                  <Plus className="size-4" />
                </Button>
              )}
            </header>

            <div className="flex flex-1 flex-col gap-2 p-2 xl:min-h-40">
              {loading && <Skeleton className="h-20 w-full rounded-lg" />}
              {!loading && dayItems.length === 0 && (
                <p className="px-1 py-2 text-sm text-muted-foreground">Nada marcado.</p>
              )}
              {!loading && dayItems.map(item => (
                <button
                  key={`${item.kind}-${item.id}`}
                  type="button"
                  onClick={() => onOpenItem(item)}
                  className={cn(
                    'flex w-full flex-col items-start gap-1 rounded-lg border border-l-4 bg-background p-2 text-left transition-colors',
                    'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    KIND_ACCENT_CLASS[item.kind],
                  )}
                >
                  <span className="text-sm font-semibold tabular-nums">{timeRangeLabel(item)}</span>
                  <KindBadge kind={item.kind} />
                  <span className="max-w-full wrap-break-word text-sm font-medium leading-snug">{item.title}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <DoorOpen className="size-3.5 shrink-0" aria-hidden />
                    {item.roomName}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
