import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { usePublicSiteSettings } from '@/hooks/useSiteSettings'
import { useMarketQuotes, type MarketQuote } from '@/hooks/useMarketQuotes'
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

function QuoteCard({ q }: { q: MarketQuote }) {
  const trend = trendOf(q.variation)
  return (
    <div className="flex min-w-40 shrink-0 flex-col gap-0.5 rounded-lg border border-border bg-card px-4 py-3">
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

export function CotacoesSection() {
  const { data } = useMarketQuotes()
  const { data: settings } = usePublicSiteSettings()
  const source = settings?.quotesSource?.trim()
  const quotes = data ?? []

  const wrapperRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [shouldScroll, setShouldScroll] = useState(false)

  useEffect(() => {
    function measure() {
      if (!trackRef.current || !wrapperRef.current) return
      // Quando já está em scroll, o track tem 2 cópias → largura de 1 conjunto
      // é scrollWidth/2; senão é o próprio scrollWidth. A tolerância evita jitter.
      const single = shouldScroll ? trackRef.current.scrollWidth / 2 : trackRef.current.scrollWidth
      setShouldScroll(single > wrapperRef.current.offsetWidth + 4)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [quotes, shouldScroll])

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
            <Link to="/cotacoes" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Ver histórico <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        <div ref={wrapperRef} className="relative w-full overflow-hidden">
          {shouldScroll ? (
            <div ref={trackRef} className="flex w-max gap-3 cotacoes-track-scroll">
              {quotes.map(q => <QuoteCard key={q.id} q={q} />)}
              {quotes.map(q => <QuoteCard key={`dup-${q.id}`} q={q} />)}
            </div>
          ) : (
            <div ref={trackRef} className="flex justify-center gap-3 overflow-x-auto pb-1">
              {quotes.map(q => <QuoteCard key={q.id} q={q} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
