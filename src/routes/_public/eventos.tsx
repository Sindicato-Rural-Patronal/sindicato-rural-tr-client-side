import { createFileRoute } from '@tanstack/react-router'
import { CalendarDays, CalendarX, Clock, DoorOpen } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { usePublicEvents, type PublicEvent } from '@/hooks/usePublicEvents'
import { useSeo } from '@/hooks/useSeo'
import { eventDateLabel, groupByMonth } from '@/lib/public-events'
import { timeRangeLabel } from '@/lib/agenda'

export const Route = createFileRoute('/_public/eventos')({
  component: EventosPage,
})

function EventCard({ event }: { event: PublicEvent }) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-sm font-medium text-primary">{eventDateLabel(event)}</p>
      <h3 className="text-lg font-semibold leading-snug text-foreground">{event.title}</h3>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="size-4 shrink-0" aria-hidden />
          <span className="tabular-nums">{timeRangeLabel(event)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <DoorOpen className="size-4 shrink-0" aria-hidden />
          {event.roomName}
        </span>
      </div>
      {event.description && (
        <p className="whitespace-pre-line text-sm text-muted-foreground">{event.description}</p>
      )}
    </article>
  )
}

function EventosPage() {
  useSeo({
    title: 'Eventos',
    description: 'Próximos eventos do Sindicato Rural de Terra Roxa, com data, horário e local.',
  })

  const { data: events = [], isLoading, isError, isFetching, refetch } = usePublicEvents()
  const months = groupByMonth(events)

  return (
    <div className="bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-10 md:py-14">
        <header className="mb-8 flex items-center gap-3">
          <CalendarDays className="size-7 text-primary" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Eventos</h1>
        </header>

        {isLoading && (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Falha da API não é "nenhum evento": avisa e deixa tentar de novo. */}
        {isError && (
          <LoadErrorRetry
            onRetry={() => void refetch()}
            retrying={isFetching}
            message="Não foi possível carregar os eventos."
            className="rounded-xl border bg-card"
          />
        )}

        {!isLoading && !isError && events.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center">
            <CalendarX className="size-12 text-muted-foreground/40" aria-hidden />
            <p className="mt-3 text-sm text-muted-foreground">Nenhum evento marcado no momento.</p>
          </div>
        )}

        {!isLoading && !isError && months.length > 0 && (
          <div className="flex flex-col gap-10">
            {months.map(month => (
              <section key={month.key} className="flex flex-col gap-4">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  {month.label}
                </h2>
                <div className="flex flex-col gap-4">
                  {month.events.map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
