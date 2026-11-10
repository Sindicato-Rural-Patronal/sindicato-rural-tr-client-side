import { Link } from '@tanstack/react-router'
import { ArrowRight, Clock, DoorOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { usePublicEvents, type PublicEvent } from '@/hooks/usePublicEvents'
import { eventDateLabel } from '@/lib/public-events'
import { timeRangeLabel, wallDate, weekdayLong } from '@/lib/agenda'
import { cn } from '@/lib/utils'

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/**
 * Folhinha do dia do evento (mês, dia e dia da semana), como a do calendário de
 * parede. O dia é número de quadro: vai em mono. Usada na home e em /eventos.
 */
export function EventDateBlock({ event, className }: { event: PublicEvent; className?: string }) {
  const ymd = wallDate(event.startTime)
  const month = MONTHS_SHORT[Number(ymd.slice(5, 7)) - 1] ?? ''
  const day = ymd.slice(8, 10)
  const weekday = weekdayLong(ymd).slice(0, 3).toLowerCase()
  return (
    <div
      aria-hidden
      className={cn('flex w-14 shrink-0 flex-col items-center rounded-lg border border-border bg-muted py-1.5 text-center', className)}
    >
      <span className="text-xs text-muted-foreground">{month}</span>
      <span className="num text-2xl font-semibold leading-tight text-foreground">{day}</span>
      <span className="text-xs text-muted-foreground">{weekday}</span>
    </div>
  )
}

/** Data, horário e sala do evento numa linha que quebra no celular. */
export function EventMeta({ event }: { event: PublicEvent }) {
  // "Sábado, 21/11/2026": o dia da semana em texto, a data em mono.
  const label = eventDateLabel(event)
  const comma = label.indexOf(', ')
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {comma > 0
        ? <span>{label.slice(0, comma + 2)}<span className="num">{label.slice(comma + 2)}</span></span>
        : <span className="num">{label}</span>}
      <span className="flex items-center gap-1.5">
        <Clock className="size-4 shrink-0 text-faint-foreground" aria-hidden />
        <span className="num">{timeRangeLabel(event)}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <DoorOpen className="size-4 shrink-0 text-faint-foreground" aria-hidden />
        {event.roomName}
      </span>
    </span>
  )
}

/**
 * Faixa "Próximos eventos" da home. Só aparece quando há pelo menos um evento
 * publicado — sem eventos, a home não ganha um bloco vazio.
 */
export function HomeEventsSection() {
  const { t } = useTranslation()
  const { data: events = [], isLoading, isError, isFetching, refetch } = usePublicEvents()

  if (isError && events.length === 0) {
    return (
      <LoadErrorRetry variant="inline" className="container mx-auto justify-center border-t px-4 py-8" onRetry={() => void refetch()} retrying={isFetching} />
    )
  }

  if (isLoading || events.length === 0) return null

  return (
    <section className="border-t border-border py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Próximos eventos</h2>
          <Button asChild variant="link" className="h-11 px-0 text-primary sm:px-2">
            <Link to="/eventos">
              {t('home.seeMore')} <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.slice(0, 3).map(event => (
            <Link
              key={event.id}
              to="/eventos"
              className="flex gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
            >
              <EventDateBlock event={event} />
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className="line-clamp-2 font-semibold leading-snug text-foreground">{event.title}</span>
                <EventMeta event={event} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
