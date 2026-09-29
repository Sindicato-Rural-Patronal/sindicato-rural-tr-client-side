import type { MarketQuote } from '@/hooks/useMarketQuotes'
import { quoteProductLabel } from '@/lib/quote-utils'
import { centsToBRL } from '@/utils/masks'
import { formatDateFromString } from '@/utils/format-data-from-string'

// Resumo das cotações do dia: o dia de referência e uma linha curta com os
// preços. Serve ao título e à descrição da tela /cotacao — e é a mesma conta
// que `server/cotacao-resumo.mjs` faz para a prévia do link, que o servidor
// precisa montar sem carregar o bundle do React.

/** "24/09/2026" a partir de "2026-09-24T00:00:00.000Z" ou "2026-09-24". */
export function diaDaCotacao(quotes: readonly MarketQuote[]): string | null {
  const dia = quotes.map(q => q.referenceDate).filter(Boolean).sort().at(-1)
  return dia ? formatDateFromString(dia.slice(0, 10)) : null
}

/**
 * "R$ 120,00" com espaço NORMAL. O `centsToBRL` usa espaço não separável
 * (U+00A0), que é o certo na tela; aqui o resultado precisa bater caractere a
 * caractere com o que o servidor monta para a prévia do link, e lá o espaço é
 * comum.
 */
function preco(cents: number | null): string | null {
  return cents == null ? null : centsToBRL(cents).replace(/\u00a0/g, ' ')
}

/**
 * Uma linha só, curta, porque a prévia do link corta: produto e preço,
 * separados por " · ".
 */
export function resumoDaCotacao(quotes: readonly MarketQuote[]): string {
  return quotes
    .map(q => {
      const atual = preco(q.afternoonCents ?? q.morningCents ?? q.priceCents)
      return atual ? `${quoteProductLabel(q.label)} ${atual}` : null
    })
    .filter(Boolean)
    .join(' · ')
}
