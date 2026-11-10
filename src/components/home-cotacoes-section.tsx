import { Link } from '@tanstack/react-router'
import { usePublicSiteSettings } from '@/hooks/useSiteSettings'
import { useMarketQuotes, type MarketQuote } from '@/hooks/useMarketQuotes'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { QuoteBoard } from '@/components/cotacoes/QuoteBoard'
import { Button } from '@/components/ui/button'
import { ArrowRight, Share2 } from 'lucide-react'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff)) return ''
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `há ${d} ${d > 1 ? 'dias' : 'dia'}`
  const mo = Math.floor(d / 30)
  return `há ${mo} ${mo > 1 ? 'meses' : 'mês'}`
}

const NO_QUOTES: MarketQuote[] = []

/**
 * Cotações da home: o "momento" do site. O quadro fica parado (antes a faixa
 * rolava sozinha) e mostra manhã e tarde de cada produto, com a variação
 * dizendo com o que compara. Sem cotação lançada a seção não existe.
 */
export function CotacoesSection() {
  const { data, isError, isFetching, refetch } = useMarketQuotes()
  const { data: settings } = usePublicSiteSettings()
  const source = settings?.quotesSource?.trim()
  const quotes = data ?? NO_QUOTES

  // A API falhou (e as repetições também): avisa em vez de sumir com a faixa.
  if (isError && quotes.length === 0) {
    return (
      <section className="border-t border-border">
        <div className="container mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-8">
          <h2 className="text-base font-semibold text-foreground">Cotações</h2>
          <LoadErrorRetry variant="inline" onRetry={() => void refetch()} retrying={isFetching} />
        </div>
      </section>
    )
  }

  if (quotes.length === 0) return null

  const lastUpdated = quotes.reduce<string | null>((acc, q) => {
    if (!q.updatedAt) return acc
    return !acc || q.updatedAt > acc ? q.updatedAt : acc
  }, null)

  return (
    <section className="border-t border-border py-12 md:py-16" aria-labelledby="cotacoes-home">
      <div className="container mx-auto grid gap-6 px-4 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-6">
        <div className="lg:col-span-4">
          <h2 id="cotacoes-home" className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Cotações do dia
          </h2>
          <p className="mt-2 text-base text-muted-foreground">
            Preços lançados pelo Sindicato de manhã e à tarde.
          </p>
          {lastUpdated && (
            <p className="mt-3 text-sm text-faint-foreground">Atualizado {timeAgo(lastUpdated)}</p>
          )}
        </div>

        <QuoteBoard quotes={quotes} source={source} className="lg:col-span-8 lg:col-start-5 lg:row-span-2 lg:row-start-1" />

        <div className="flex flex-wrap items-center gap-2 lg:col-span-4 lg:row-start-2 lg:self-start">
          <Button asChild variant="outline" className="h-11 sm:h-9">
            <Link to="/cotacoes">
              Ver histórico <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-11 text-primary hover:text-primary sm:h-9">
            <Link to="/cotacao">
              <Share2 /> Mandar no grupo
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
