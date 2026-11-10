import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, HeartHandshake } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { EmptyState } from '@/components/EmptyState'
import { ContextFigure, PublicPageHeader } from '@/components/PublicPageHeader'
import { useConvenioMenu } from '@/hooks/useConvenios'
import { useSeo } from '@/hooks/useSeo'

export const Route = createFileRoute('/_public/convenios/')({
  component: ConveniosPage,
})

function ConveniosPage() {
  useSeo({
    title: 'Convênios',
    description: 'Convênios do Sindicato Rural de Terra Roxa para associados e suas famílias: valores e documentos para adesão.',
  })
  const { data, isLoading, isError, isFetching, refetch } = useConvenioMenu()
  const count = data?.length ?? 0

  return (
    <div>
      <PublicPageHeader
        width="max-w-5xl"
        title="Convênios"
        description="Benefícios negociados pelo sindicato para os associados e suas famílias."
        context={isLoading || isError ? null : count > 0
          ? <><ContextFigure>{count}</ContextFigure> {count > 1 ? 'convênios' : 'convênio'}: {(data ?? []).map(c => c.name).join(', ')}</>
          : ''}
      />

      <section className="py-10 md:py-12">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}

            {!isLoading && data?.map(c => (
              <Link
                key={c.id}
                to="/convenios/$slug"
                params={{ slug: c.slug }}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20"
              >
                <div className="flex h-14 items-center">
                  {c.logoUrl
                    ? <img src={c.logoUrl} alt={`Logo ${c.name}`} className="max-h-full max-w-40 object-contain" />
                    : (
                      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <HeartHandshake className="size-6" aria-hidden />
                      </span>
                    )}
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground wrap-break-word">{c.name}</h2>
                {c.subtitle && <p className="mt-1 text-sm text-muted-foreground">{c.subtitle}</p>}
                <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-medium text-primary group-hover:underline">
                  Ver valores e documentos
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </Link>
            ))}
          </div>

          {isError && !data && (
            <LoadErrorRetry
              message="Não foi possível carregar os convênios agora."
              onRetry={() => void refetch()}
              retrying={isFetching}
            />
          )}

          {!isLoading && !isError && count === 0 && (
            <EmptyState framed icon={HeartHandshake} title="Nenhum convênio disponível no momento" />
          )}
        </div>
      </section>
    </div>
  )
}
