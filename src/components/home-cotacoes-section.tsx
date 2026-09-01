import { useEffect, useRef, useState } from 'react'
import { useMarketQuotes, type MarketQuote } from '@/hooks/useMarketQuotes'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function trendOf(variation: string | null): 'up' | 'down' | 'neutral' {
  const v = (variation ?? '').trim()
  if (!v) return 'neutral'
  return v.startsWith('-') ? 'down' : 'up'
}

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

function QuoteCard({ q }: { q: MarketQuote }) {
  const trend = trendOf(q.variation)
  return (
    <div className="flex min-w-40 shrink-0 flex-col gap-0.5 rounded-lg border border-border bg-card px-4 py-3">
      <span className="text-xs font-medium text-muted-foreground">{q.label}</span>
      <span className="text-lg font-bold tabular-nums text-foreground">{q.value}</span>
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
            {formatDateFromString(q.referenceDate)}
          </span>
        )}
      </div>
    </div>
  )
}

export function CotacoesSection() {
  const { data } = useMarketQuotes()
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

  // Sem cotações ativas → não renderiza a faixa.
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
          <span className="text-[11px] text-muted-foreground">· Fonte: Cvale</span>
          {lastUpdated && (
            <span className="ml-auto text-[11px] text-muted-foreground">
              Atualizado {timeAgo(lastUpdated)}
            </span>
          )}
        </div>

        <div ref={wrapperRef} className="relative w-full overflow-hidden">
          {shouldScroll ? (
            <div ref={trackRef} className="flex w-max gap-3 cotacoes-track-scroll">
              {quotes.map(q => <QuoteCard key={q.id} q={q} />)}
              {quotes.map(q => <QuoteCard key={`dup-${q.id}`} q={q} />)}
            </div>
          ) : (
            <div ref={trackRef} className="flex gap-3 overflow-x-auto pb-1">
              {quotes.map(q => <QuoteCard key={q.id} q={q} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
