import type { MarketQuote } from '@/hooks/useMarketQuotes'
import { formatDateBr, weekdayLong } from '@/lib/agenda'

/**
 * Com o que a variação compara, em poucas palavras ("vs manhã").
 *
 * A API calcula a variação do preço atual contra o lançamento ANTERIOR do
 * produto (o último antes do dia/período atual). Quando o preço atual é o da
 * tarde e a manhã do mesmo dia foi lançada, o anterior é a manhã. Nos outros
 * casos (preço da manhã, ou tarde sem manhã) o anterior pode ser de ontem ou de
 * vários dias antes, e a API não diz o dia: fica "vs anterior".
 */
export function variationBasis(quote: Pick<MarketQuote, 'period' | 'morningCents'>): { short: string; long: string } {
  if (quote.period === 'AFTERNOON' && quote.morningCents != null) {
    return { short: 'vs manhã', long: 'comparado com a manhã' }
  }
  return { short: 'vs anterior', long: 'comparado com o lançamento anterior' }
}

/** "terça-feira" e "10/11/2026" a partir do dia de referência mais recente. */
export function boardDay(quotes: readonly Pick<MarketQuote, 'referenceDate'>[]): { weekday: string; date: string } | null {
  const ymd = quotes.map(q => q.referenceDate).filter(Boolean).sort().at(-1)?.slice(0, 10)
  if (!ymd) return null
  return { weekday: weekdayLong(ymd).toLowerCase(), date: formatDateBr(ymd) }
}

/** "129,14" (sem o "R$", que o quadro mostra à parte, menor). */
export function boardPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
