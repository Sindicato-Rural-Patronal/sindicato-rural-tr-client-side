import { Link } from '@tanstack/react-router'
import { ArrowRight, Clock, DoorOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { usePublicEvents } from '@/hooks/usePublicEvents'
import { eventDateLabel } from '@/lib/public-events'
import { timeRangeLabel } from '@/lib/agenda'

/**
 * Faixa "Próximos eventos" da home. Só aparece quando há pelo menos um evento
 * publicado — sem eventos, a home não ganha um bloco vazio.
 */
export function HomeEventsSection() {
  const { t } = useTranslation()
  const { data: events = [], isLoading, isError } = usePublicEvents()

  if (isLoading || isError || events.length === 0) return null

  return (
    <section className="border-t bg-background py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">Próximos eventos</h2>
          <Button asChild variant="link" className="h-11 px-0 font-semibold text-primary sm:px-2">
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
              className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md"
            >
              <span className="text-sm font-medium text-primary">{eventDateLabel(event)}</span>
              <span className="line-clamp-2 font-semibold leading-snug text-foreground">{event.title}</span>
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 shrink-0" aria-hidden />
                  <span className="tabular-nums">{timeRangeLabel(event)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <DoorOpen className="size-4 shrink-0" aria-hidden />
                  {event.roomName}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
