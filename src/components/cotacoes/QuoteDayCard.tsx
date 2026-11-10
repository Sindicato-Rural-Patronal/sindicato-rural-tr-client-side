import { ArrowDown, ArrowUp, Bean, Carrot, CircleDollarSign, Minus, Sprout, Wheat } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MarketQuote } from '@/hooks/useMarketQuotes'
import { QUOTE_PERIOD_LABEL, quoteProductLabel, trendOf } from '@/lib/quote-utils'
import { centsToBRL } from '@/utils/masks'
import { cn } from '@/lib/utils'
import { variationBasis } from './quote-variation'

// Cartão de cotação no formato da página antiga do sindicato
// (ruraltr.com.br/mobile/cotacao.php): ícone do produto, nome, e os preços de
// manhã e tarde um ao lado do outro. É como a região está acostumada a ler.
// Usado na tela /cotacao; a home e /cotacoes usam o quadro (QuoteBoard).

const ICONE: Record<string, LucideIcon> = {
  SOJA: Bean,
  MILHO: Sprout,
  TRIGO: Wheat,
  MANDIOCA: Carrot,
  DOLAR: CircleDollarSign,
}

/** Um dos dois períodos do dia. Sem lançamento mostra "—", não R$ 0,00. */
function Periodo({ rotulo, cents, destaque }: {
  rotulo: string
  cents: number | null
  destaque: boolean
}) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-lg bg-muted px-2 py-1.5">
      <span className="text-xs text-muted-foreground">{rotulo}</span>
      <span
        className={cn(
          'num',
          cents == null
            ? 'text-sm text-muted-foreground'
            : destaque
              ? 'text-base font-semibold text-foreground'
              : 'text-base text-foreground',
        )}
      >
        {cents == null ? '—' : centsToBRL(cents)}
      </span>
    </div>
  )
}

export function QuoteDayCard({ quote, className }: { quote: MarketQuote; className?: string }) {
  const Icone = ICONE[quote.label] ?? Sprout
  const trend = trendOf(quote.variation)
  const basis = variationBasis(quote)
  // Sem nenhum dos dois períodos (lançamento antigo, antes de guardarmos os
  // dois), mostra o preço atual do produto para o cartão não ficar vazio.
  const semPeriodos = quote.morningCents == null && quote.afternoonCents == null

  return (
    <div className={cn('flex flex-col gap-2 rounded-xl border border-border bg-card p-3', className)}>
      <div className="flex items-center gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icone className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{quoteProductLabel(quote.label)}</p>
          {quote.unit && <p className="text-xs text-muted-foreground">por {quote.unit}</p>}
        </div>
        {quote.variation && (
          <span
            title={`Variação ${basis.long}`}
            className={cn(
              'inline-flex items-center gap-1 text-xs',
              trend === 'down' ? 'text-destructive'
                : trend === 'up' ? 'text-success'
                  : 'text-muted-foreground',
            )}
          >
            {trend === 'down' ? <ArrowDown className="size-3.5" aria-hidden />
              : trend === 'up' ? <ArrowUp className="size-3.5" aria-hidden />
                : <Minus className="size-3.5" aria-hidden />}
            <span className="num font-medium">{quote.variation}</span>
            <span className="text-muted-foreground">{basis.short}</span>
          </span>
        )}
      </div>

      {semPeriodos ? (
        <div className="rounded-lg bg-muted px-2 py-1.5 text-center">
          <span className="num text-base font-semibold text-foreground">
            {quote.priceCents != null ? centsToBRL(quote.priceCents) : quote.value || '—'}
          </span>
          {quote.period && (
            <span className="ml-1 text-xs text-muted-foreground">
              {QUOTE_PERIOD_LABEL[quote.period]}
            </span>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          {/* O período que vale agora fica em destaque: é o preço do momento. */}
          <Periodo rotulo="Manhã" cents={quote.morningCents} destaque={quote.period === 'MORNING'} />
          <Periodo rotulo="Tarde" cents={quote.afternoonCents} destaque={quote.period === 'AFTERNOON'} />
        </div>
      )}
    </div>
  )
}
