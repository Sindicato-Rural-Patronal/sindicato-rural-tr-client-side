import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, HeartHandshake } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
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
  const { data, isLoading, isError } = useConvenioMenu()

  return (
    <div>
      <section className="bg-primary py-14 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">Convênios</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-primary-foreground/80">
            Benefícios negociados pelo sindicato para os associados e suas famílias.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}

            {!isLoading && data?.map(c => (
              <Link
                key={c.id}
                to="/convenios/$slug"
                params={{ slug: c.slug }}
                className="group flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-16 items-center">
                  {c.logoUrl
                    ? <img src={c.logoUrl} alt={`Logo ${c.name}`} className="max-h-full max-w-[10rem] object-contain" />
                    : <HeartHandshake className="size-10 text-primary" />}
                </div>
                <h2 className="mt-4 text-xl font-bold text-foreground">{c.name}</h2>
                {c.subtitle && <p className="mt-1 text-sm text-muted-foreground">{c.subtitle}</p>}
                <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-primary">
                  Ver valores e documentos
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>

          {!isLoading && (isError || (data?.length ?? 0) === 0) && (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-10 text-center">
              <HeartHandshake className="size-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                {isError ? 'Não foi possível carregar os convênios agora.' : 'Nenhum convênio disponível no momento.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
