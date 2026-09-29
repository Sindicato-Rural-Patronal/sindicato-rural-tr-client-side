import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from '@tanstack/react-router'
import { usePublicSiteSettings } from '@/hooks/useSiteSettings'
import { useMarketQuotes, type MarketQuote } from '@/hooks/useMarketQuotes'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { QuoteDayCard } from '@/components/cotacoes/QuoteDayCard'
import { ArrowRight, Share2, TrendingUp } from 'lucide-react'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff)) return ''
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `há ${d}d`
  const mo = Math.floor(d / 30)
  return `há ${mo} mês${mo > 1 ? 'es' : ''}`
}

// Rolagem automática só com mouse e tela larga: no toque não dá para pausar
// (hover não existe) e o preço fica passando enquanto a pessoa tenta ler.
const AUTO_SCROLL_QUERY = '(hover: hover) and (pointer: fine) and (min-width: 768px)'

function subscribeAutoScroll(onChange: () => void) {
  const mql = window.matchMedia?.(AUTO_SCROLL_QUERY)
  mql?.addEventListener('change', onChange)
  return () => mql?.removeEventListener('change', onChange)
}

function useCanAutoScroll(): boolean {
  return useSyncExternalStore(
    subscribeAutoScroll,
    () => window.matchMedia?.(AUTO_SCROLL_QUERY).matches ?? false,
    () => false,
  )
}

const NO_QUOTES: MarketQuote[] = []

export function CotacoesSection() {
  const { data, isError, isFetching, refetch } = useMarketQuotes()
  const { data: settings } = usePublicSiteSettings()
  const source = settings?.quotesSource?.trim()
  const quotes = data ?? NO_QUOTES
  const canAutoScroll = useCanAutoScroll()

  const wrapperRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)
  const marquee = canAutoScroll && overflows

  useEffect(() => {
    function measure() {
      if (!trackRef.current || !wrapperRef.current) return
      // Em rolagem o track tem 2 cópias → largura de 1 conjunto é scrollWidth/2;
      // senão é o próprio scrollWidth. A tolerância evita jitter.
      const single = marquee ? trackRef.current.scrollWidth / 2 : trackRef.current.scrollWidth
      setOverflows(single > wrapperRef.current.offsetWidth + 4)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [quotes, marquee])

  // A API falhou (e as repetições também): avisa em vez de sumir com a faixa.
  if (isError && quotes.length === 0) {
    return (
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <TrendingUp className="size-4 text-primary" aria-hidden />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cotações</h2>
          <LoadErrorRetry variant="inline" onRetry={() => void refetch()} retrying={isFetching} />
        </div>
      </section>
    )
  }

  // Sem cotações lançadas → não renderiza a faixa.
  if (quotes.length === 0) return null

  // A página antiga mostra a data uma vez, no topo — não em cada cartão.
  const diaDeReferencia = (() => {
    const dia = quotes.map(q => q.referenceDate).filter(Boolean).sort().at(-1)
    if (!dia) return null
    const [ano, mes, d] = dia.slice(0, 10).split('-')
    return `${d}/${mes}/${ano}`
  })()

  const lastUpdated = quotes.reduce<string | null>((acc, q) => {
    if (!q.updatedAt) return acc
    return !acc || q.updatedAt > acc ? q.updatedAt : acc
  }, null)

  return (
    <section className="border-b border-border bg-muted/30 overflow-hidden">
      <style>{`
        @keyframes cotacoes-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .cotacoes-track-scroll { animation: cotacoes-marquee 32s linear infinite; }
        .cotacoes-track-scroll:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .cotacoes-track-scroll { animation: none; }
        }
      `}</style>

      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cotações
          </h2>
          {diaDeReferencia && (
            <span className="text-[11px] font-medium text-foreground">{diaDeReferencia}</span>
          )}
          {source && <span className="text-[11px] text-muted-foreground">· Fonte: {source}</span>}
          <div className="ml-auto flex items-center gap-3">
            {lastUpdated && (
              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                Atualizado {timeAgo(lastUpdated)}
              </span>
            )}
            <Link
              to="/cotacao"
              className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-primary hover:underline sm:min-h-0"
            >
              <Share2 className="size-3.5" /> Mandar no grupo
            </Link>
            <Link
              to="/cotacoes"
              className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-primary hover:underline sm:min-h-0"
            >
              Ver histórico <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {marquee ? (
          <div ref={wrapperRef} className="relative w-full overflow-hidden">
            <div ref={trackRef} className="flex w-max gap-3 cotacoes-track-scroll">
              {quotes.map(q => <QuoteDayCard key={q.id} quote={q} className="w-60 shrink-0 snap-start" />)}
              {quotes.map(q => <QuoteDayCard key={`dup-${q.id}`} quote={q} className="w-60 shrink-0 snap-start" />)}
            </div>
          </div>
        ) : (
          // Parada e rolável com o dedo; centralizada quando cabe (w-max + mx-auto),
          // começando da esquerda quando não cabe (senão a ponta esquerda some).
          <div ref={wrapperRef} className="relative w-full snap-x overflow-x-auto pb-1">
            <div ref={trackRef} className="mx-auto flex w-max gap-3">
              {quotes.map(q => <QuoteDayCard key={q.id} quote={q} className="w-60 shrink-0 snap-start" />)}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
