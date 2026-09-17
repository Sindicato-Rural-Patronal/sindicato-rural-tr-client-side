import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from '@tanstack/react-router'
import { usePublicSiteSettings } from '@/hooks/useSiteSettings'
import { useMarketQuotes, type MarketQuote } from '@/hooks/useMarketQuotes'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { QUOTE_PERIOD_LABEL, quoteProductLabel, trendOf } from '@/lib/quote-utils'
import { centsToBRL } from '@/utils/masks'
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'

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

// "16/09" a partir de "2026-09-16T00:00:00.000Z" (data pura, sem fuso).
function dayMonth(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}`
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

function QuoteCard({ q }: { q: MarketQuote }) {
  const trend = trendOf(q.variation)
  return (
    <div className="flex min-w-40 shrink-0 snap-start flex-col gap-0.5 rounded-lg border border-border bg-card px-4 py-3">
      <span className="text-xs font-medium text-muted-foreground">{quoteProductLabel(q.label)}</span>
      <span className="text-lg font-bold tabular-nums text-foreground">
        {q.priceCents != null ? centsToBRL(q.priceCents) : q.value}
        {q.priceCents != null && q.unit && (
          <span className="ml-1 text-[11px] font-normal text-muted-foreground">/{q.unit}</span>
        )}
      </span>
      <div className="flex items-center justify-between gap-2">
        {q.variation ? (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold ${
              trend === 'down'
                ? 'text-red-600 dark:text-red-400'
                : trend === 'up'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground'
            }`}
          >
            {trend === 'down' ? (
              <TrendingDown className="size-3" />
            ) : trend === 'up' ? (
              <TrendingUp className="size-3" />
            ) : (
              <Minus className="size-3" />
            )}
            {q.variation}
          </span>
        ) : (
          <span />
        )}
        {q.referenceDate && (
          <span className="text-[10px] text-muted-foreground">
            {dayMonth(q.referenceDate)}
            {q.period && ` · ${QUOTE_PERIOD_LABEL[q.period]}`}
          </span>
        )}
      </div>
    </div>
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
          {source && <span className="text-[11px] text-muted-foreground">· Fonte: {source}</span>}
          <div className="ml-auto flex items-center gap-3">
            {lastUpdated && (
              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                Atualizado {timeAgo(lastUpdated)}
              </span>
            )}
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
              {quotes.map(q => <QuoteCard key={q.id} q={q} />)}
              {quotes.map(q => <QuoteCard key={`dup-${q.id}`} q={q} />)}
            </div>
          </div>
        ) : (
          // Parada e rolável com o dedo; centralizada quando cabe (w-max + mx-auto),
          // começando da esquerda quando não cabe (senão a ponta esquerda some).
          <div ref={wrapperRef} className="relative w-full snap-x overflow-x-auto pb-1">
            <div ref={trackRef} className="mx-auto flex w-max gap-3">
              {quotes.map(q => <QuoteCard key={q.id} q={q} />)}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
