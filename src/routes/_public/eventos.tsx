import { createFileRoute } from '@tanstack/react-router'
import { CalendarX } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { EmptyState } from '@/components/EmptyState'
import { ContextFigure, PublicPageHeader } from '@/components/PublicPageHeader'
import { EventDateBlock, EventMeta } from '@/components/home-events-section'
import { usePublicEvents, type PublicEvent } from '@/hooks/usePublicEvents'
import { useSeo } from '@/hooks/useSeo'
import { groupByMonth } from '@/lib/public-events'
import { formatDateBr, wallDate } from '@/lib/agenda'

export const Route = createFileRoute('/_public/eventos')({
  component: EventosPage,
})

function EventCard({ event }: { event: PublicEvent }) {
  return (
    <article className="flex gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
      <EventDateBlock event={event} />
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="text-lg font-semibold leading-snug text-foreground wrap-break-word">{event.title}</h3>
        <EventMeta event={event} />
        {event.description && (
          <p className="whitespace-pre-line text-sm text-muted-foreground wrap-break-word">{event.description}</p>
        )}
      </div>
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
  const next = events[0]

  return (
    <div className="bg-background">
      <PublicPageHeader
        width="max-w-4xl"
        title="Eventos"
        description="Os próximos eventos do Sindicato, com data, horário e local."
        context={isLoading || isError ? null : events.length > 0
          ? <>
              <ContextFigure>{events.length}</ContextFigure> {events.length > 1 ? 'eventos marcados' : 'evento marcado'}
              {next && <> · o próximo em <span className="num font-medium text-foreground">{formatDateBr(wallDate(next.startTime))}</span></>}
            </>
          : ''}
      />

      <div className="container mx-auto max-w-4xl px-4 py-10 md:py-12">
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
            className="rounded-xl border border-border bg-card"
          />
        )}

        {!isLoading && !isError && events.length === 0 && (
          <EmptyState framed icon={CalendarX} title="Nenhum evento marcado no momento" />
        )}

        {!isLoading && !isError && months.length > 0 && (
          <div className="flex flex-col gap-10">
            {months.map(month => (
              <section key={month.key} className="flex flex-col gap-4">
                <h2 className="text-base font-semibold text-foreground first-letter:uppercase">
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
