import { useMarketQuotes } from '@/hooks/useMarketQuotes'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function trendOf(variation: string | null): 'up' | 'down' | 'neutral' {
  const v = (variation ?? '').trim()
  if (!v) return 'neutral'
  return v.startsWith('-') ? 'down' : 'up'
}

export function CotacoesSection() {
  const { data } = useMarketQuotes()
  const quotes = data ?? []
  // Sem cotações ativas → não renderiza a faixa.
  if (quotes.length === 0) return null

  return (
    <section className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cotações
          </h2>
          <span className="text-[11px] text-muted-foreground">· Fonte: Cvale</span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1">
          {quotes.map(q => {
            const trend = trendOf(q.variation)
            return (
              <div
                key={q.id}
                className="flex min-w-40 shrink-0 flex-col gap-0.5 rounded-lg border border-border bg-card px-4 py-3"
              >
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
          })}
        </div>
      </div>
    </section>
  )
}
