import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { MarketQuote } from '@/hooks/useMarketQuotes'
import { QUOTE_PERIOD_LABEL, quoteProductLabel, trendOf } from '@/lib/quote-utils'
import { cn } from '@/lib/utils'
import { boardDay, boardPrice, variationBasis } from './quote-variation'

// O quadro de cotações do site, no espírito do quadro de preços da cooperativa:
// superfície verde da marca, tudo em mono (produto, unidade, manhã e tarde) e
// parado. É o único lugar do site em que rótulo vai em mono: é o quadro.
//
// Contraste sobre o --brand (#15632f): texto cheio 7,0:1, texto a 80% 5,2:1,
// alta (--brand-positive) 5,2:1 e baixa (--brand-negative) 5,0:1.

function Price({ cents, current }: { cents: number | null; current: boolean }) {
  if (cents == null) return <span className="text-brand-foreground/80">—</span>
  return (
    <span className={cn('whitespace-nowrap', current ? 'font-semibold text-brand-foreground' : 'text-brand-foreground/80')}>
      <span className="text-xs font-normal text-brand-foreground/80">R$</span>{' '}
      {boardPrice(cents)}
    </span>
  )
}

function Variation({ quote, className }: { quote: MarketQuote; className?: string }) {
  if (!quote.variation) return <span className={cn('text-brand-foreground/80', className)}>—</span>
  const trend = trendOf(quote.variation)
  const basis = variationBasis(quote)
  const Icon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus
  const tone = trend === 'up' ? 'text-brand-positive' : trend === 'down' ? 'text-brand-negative' : 'text-brand-foreground/80'
  const word = trend === 'up' ? 'alta de' : trend === 'down' ? 'baixa de' : 'sem variação,'
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap', className)} title={`Variação ${basis.long}`}>
      <Icon className={cn('size-3.5 shrink-0', tone)} aria-hidden />
      <span className="sr-only">{word}</span>
      <span className={tone}>{quote.variation}</span>
      <span className="text-brand-foreground/80">
        <span aria-hidden>{basis.short}</span>
        <span className="sr-only">{basis.long}</span>
      </span>
    </span>
  )
}

export function QuoteBoard({ quotes, source, className }: {
  quotes: readonly MarketQuote[]
  /** Fonte dos preços (Configurações do site); vazia não aparece. */
  source?: string
  className?: string
}) {
  const day = boardDay(quotes)

  return (
    <div className={cn('num overflow-hidden rounded-xl bg-brand text-brand-foreground', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-brand-foreground/15 px-4 py-3 sm:px-5">
        {day && (
          <p className="text-sm">
            <span className="text-brand-foreground/80">{day.weekday}, </span>
            <span className="font-semibold">{day.date}</span>
          </p>
        )}
        {source && <p className="text-xs text-brand-foreground/80">Fonte: {source}</p>}
      </div>

      <table className="w-full text-sm sm:text-base">
        <caption className="sr-only">
          Cotações{day ? ` de ${day.date}` : ''}: preço da manhã e da tarde de cada produto
        </caption>
        <thead>
          <tr className="text-left text-xs text-brand-foreground/80">
            <th scope="col" className="px-4 pb-2 pt-3 font-normal sm:px-5">Produto</th>
            <th scope="col" className="px-2 pb-2 pt-3 text-right font-normal sm:px-4">{QUOTE_PERIOD_LABEL.MORNING}</th>
            <th scope="col" className="pb-2 pl-2 pr-4 pt-3 text-right font-normal sm:px-4">{QUOTE_PERIOD_LABEL.AFTERNOON}</th>
            <th scope="col" className="hidden pb-2 pl-4 pr-5 pt-3 text-right font-normal sm:table-cell">Variação</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map(q => {
            // Lançamento antigo, sem manhã nem tarde: o preço atual vai na coluna do período.
            const semPeriodos = q.morningCents == null && q.afternoonCents == null
            const morning = semPeriodos ? (q.period === 'MORNING' ? q.priceCents : null) : q.morningCents
            const afternoon = semPeriodos ? (q.period === 'MORNING' ? null : q.priceCents) : q.afternoonCents
            return (
              <tr key={q.id} className="border-t border-brand-foreground/15 align-top">
                <th scope="row" className="px-4 py-3 text-left font-normal sm:px-5">
                  <span className="block font-medium text-brand-foreground">{quoteProductLabel(q.label)}</span>
                  {q.unit && <span className="block text-xs text-brand-foreground/80">{q.unit}</span>}
                  {/* Celular: a variação desce para baixo do produto (não cabe a 4ª coluna). */}
                  <Variation quote={q} className="mt-1 text-xs sm:hidden" />
                </th>
                <td className="px-2 py-3 text-right sm:px-4">
                  <Price cents={morning} current={q.period === 'MORNING'} />
                </td>
                <td className="py-3 pl-2 pr-4 text-right sm:px-4">
                  <Price cents={afternoon} current={q.period !== 'MORNING'} />
                </td>
                <td className="hidden py-3 pl-4 pr-5 text-right text-sm sm:table-cell">
                  <Variation quote={q} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
