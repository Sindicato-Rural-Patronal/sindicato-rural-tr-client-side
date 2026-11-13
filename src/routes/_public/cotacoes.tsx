import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { LineChart, Minus, Share2, Table2, TrendingDown, TrendingUp } from 'lucide-react'
import { QuoteHistoryChart } from '@/components/cotacoes/QuoteHistoryChart'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { EmptyState } from '@/components/EmptyState'
import { useMarketQuotes, useQuoteHistory, type QuoteHistorySeries } from '@/hooks/useMarketQuotes'
import { QuoteBoard } from '@/components/cotacoes/QuoteBoard'
import { PublicPageHeader } from '@/components/PublicPageHeader'
import { Button } from '@/components/ui/button'
import { usePublicSiteSettings } from '@/hooks/useSiteSettings'
import { useSeo } from '@/hooks/useSeo'
import { QUOTE_PERIOD_LABEL, pointX, quoteProductLabel, quoteUnitLong } from '@/lib/quote-utils'
import { cn } from '@/lib/utils'
import { centsToBRL } from '@/utils/masks'
import { formatDateFromString } from '@/utils/format-data-from-string'

export const Route = createFileRoute('/_public/cotacoes')({
  component: CotacoesPage,
})

const RANGES = [30, 90, 180, 365] as const
type Range = (typeof RANGES)[number]
type View = 'chart' | 'table'

function Segmented<T extends string | number>({ label, value, options, onChange }: {
  label: string
  value: T
  options: { value: T; label: React.ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border bg-card p-0.5">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-sm transition-colors sm:h-8',
            o.value === value ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function CotacoesPage() {
  useSeo({ title: 'Cotações', description: 'Histórico de preços de soja, milho, trigo, mandioca e dólar lançados pelo Sindicato Rural de Terra Roxa.' })
  const [days, setDays] = useState<Range>(90)
  const [view, setView] = useState<View>('chart')
  const { data: series, isLoading, isError, isFetching, refetch, isPlaceholderData } = useQuoteHistory(days)
  const { data: settings } = usePublicSiteSettings()
  const source = settings?.quotesSource?.trim()
  // Os preços de hoje abrem a página, no formato da página antiga; o histórico
  // vem embaixo. Quem entra aqui quase sempre quer só "quanto está hoje".
  const { data: hoje, isLoading: hojeLoading } = useMarketQuotes()
  const doDia = hoje ?? []
  const diaDeReferencia = (() => {
    const dia = doDia.map(q => q.referenceDate).filter(Boolean).sort().at(-1)
    return dia ? formatDateFromString(dia.slice(0, 10)) : null
  })()

  // Mesmo eixo X para todos os produtos: os gráficos ficam alinhados.
  const domain = useMemo<[number, number]>(() => {
    const xs = (series ?? []).flatMap(s => s.points.map(pointX))
    return xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 1]
  }, [series])

  return (
    <main>
      <PublicPageHeader
        width="max-w-6xl"
        title="Cotações"
        description="Os preços lançados pelo Sindicato: os de hoje e o histórico de cada produto."
        context={hojeLoading ? null : diaDeReferencia
          ? <>Preços de <span className="num font-medium text-foreground">{diaDeReferencia}</span>{source ? ` · Fonte: ${source}` : ''}</>
          : source ? `Fonte: ${source}` : ''}
      />

      {doDia.length > 0 && (
        <section className="border-b border-border py-10">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-foreground">Cotações do dia</h2>
              <Button asChild variant="ghost" className="h-11 text-primary hover:text-primary sm:h-9">
                <Link to="/cotacao">
                  <Share2 /> Mandar no grupo
                </Link>
              </Button>
            </div>
            <QuoteBoard quotes={doDia} source={source} />
          </div>
        </section>
      )}

      <section className="py-10 md:py-14">
        <div className="container mx-auto flex max-w-6xl flex-col gap-6 px-4">
          <h2 className="text-xl font-semibold text-foreground">Histórico</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Período"
              value={days}
              onChange={setDays}
              options={RANGES.map(d => ({ value: d, label: d === 365 ? '1 ano' : `${d} dias` }))}
            />
            <Segmented
              label="Visualização"
              value={view}
              onChange={setView}
              options={[
                { value: 'chart', label: <><LineChart className="size-4" /> Gráfico</> },
                { value: 'table', label: <><Table2 className="size-4" /> Tabela</> },
              ]}
            />
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}
            </div>
          )}

          {/* Falha da API (sem dado nenhum para mostrar) não é "nenhuma cotação". */}
          {isError && !series && (
            <LoadErrorRetry
              hint
              onRetry={() => void refetch()}
              retrying={isFetching}
              className="rounded-xl border bg-card"
            />
          )}

          {!isLoading && !isError && (!series || series.length === 0) && (
            <EmptyState framed icon={LineChart} title="Nenhuma cotação lançada neste período" />
          )}

          {series && series.length > 0 && (
            <div
              className={cn('grid grid-cols-1 gap-4 transition-opacity lg:grid-cols-2', isPlaceholderData && 'opacity-60')}
              aria-busy={isPlaceholderData}
            >
              {series.map(s => (
                <ProductCard key={s.id} series={s} domain={domain} view={view} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function ProductCard({ series, domain, view }: { series: QuoteHistorySeries; domain: [number, number]; view: View }) {
  const name = quoteProductLabel(series.label)
  const first = series.points[0]
  const last = series.points[series.points.length - 1]
  const change = first.priceCents ? ((last.priceCents - first.priceCents) / first.priceCents) * 100 : 0
  const TrendIcon = change > 0.005 ? TrendingUp : change < -0.005 ? TrendingDown : Minus

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{name}</h2>
          <p className="text-xs text-muted-foreground">{series.unit ? `R$ por ${quoteUnitLong(series.unit)}` : 'R$'}</p>
        </div>
        <div className="text-right">
          <p className="num text-xl font-semibold text-foreground">{centsToBRL(last.priceCents)}</p>
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <TrendIcon className="size-3.5" aria-hidden />
            <span className="num">{change.toLocaleString('pt-BR', { signDisplay: 'exceptZero', maximumFractionDigits: 1, minimumFractionDigits: 1 })}%</span> no período
          </p>
        </div>
      </header>

      {view === 'chart'
        ? <QuoteHistoryChart points={series.points} domain={domain} label={name} />
        : <HistoryTable series={series} />}
    </article>
  )
}

// Visão em tabela: um dia por linha, manhã e tarde lado a lado (mais recente primeiro).
function HistoryTable({ series }: { series: QuoteHistorySeries }) {
  const rows = useMemo(() => {
    const byDate = new Map<string, { morning?: number; afternoon?: number }>()
    for (const p of series.points) {
      const row = byDate.get(p.date) ?? {}
      if (p.period === 'AFTERNOON') row.afternoon = p.priceCents
      else row.morning = p.priceCents
      byDate.set(p.date, row)
    }
    return [...byDate.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [series])

  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">Preços de {quoteProductLabel(series.label)} por dia</caption>
        <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">Data</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">{QUOTE_PERIOD_LABEL.MORNING}</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">{QUOTE_PERIOD_LABEL.AFTERNOON}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([date, r]) => (
            <tr key={date} className="border-t">
              <th scope="row" className="num px-3 py-1.5 text-left font-normal">{formatDateFromString(date)}</th>
              <td className="num px-3 py-1.5 text-right">{r.morning != null ? centsToBRL(r.morning) : '—'}</td>
              <td className="num px-3 py-1.5 text-right">{r.afternoon != null ? centsToBRL(r.afternoon) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
