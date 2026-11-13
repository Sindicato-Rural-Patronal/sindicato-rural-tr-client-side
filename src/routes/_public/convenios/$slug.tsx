import { createFileRoute, Link } from '@tanstack/react-router'
import { HeartHandshake, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConvenioPageView } from '@/components/convenio/ConvenioPageView'
import { usePublicConvenio } from '@/hooks/useConvenios'
import { useOrgInfo } from '@/hooks/useSiteSettings'
import { useSeo } from '@/hooks/useSeo'
import { ApiError } from '@/lib/api'

export const Route = createFileRoute('/_public/convenios/$slug')({
  component: ConvenioPage,
})

function ConvenioPage() {
  const org = useOrgInfo()
  const { slug } = Route.useParams()
  const { data, isLoading, isError, error, isFetching, refetch } = usePublicConvenio(slug)

  useSeo({
    title: data ? `${data.name} · Convênios` : 'Convênios',
    description: data
      ? `${data.title}${data.subtitle ? ` — ${data.subtitle}` : ''}. Valores, documentos para adesão e informações do convênio ${data.name}.`
      : undefined,
    image: data?.logoUrl ?? undefined,
  })

  if (isLoading) {
    return (
      <div>
        <section className="border-b border-border">
          <div className="container mx-auto flex max-w-5xl flex-col gap-3 px-4 pb-8 pt-10 md:pb-10 md:pt-14">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-80 max-w-full" />
            <Skeleton className="h-5 w-64 max-w-full" />
          </div>
        </section>
        <section className="container mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-5">
          <Skeleton className="h-96 rounded-xl lg:col-span-3" />
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        </section>
      </div>
    )
  }

  if (isError || !data) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <HeartHandshake className="size-6" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold">
            {notFound ? 'Convênio não encontrado' : 'Não foi possível carregar o convênio'}
          </h1>
          <p className="max-w-md text-muted-foreground">
            {notFound
              ? 'Este convênio não existe ou não está mais disponível.'
              : 'Tente novamente em alguns instantes.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {!notFound && (
              <Button className="h-11 gap-2" disabled={isFetching} onClick={() => void refetch()}>
                <RefreshCw className={isFetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden /> Tentar de novo
              </Button>
            )}
            <Button asChild variant="outline" className="h-11">
              <Link to="/convenios">Ver todos os convênios</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <ConvenioPageView convenio={data} orgPhone={org.phone} />
}
