// Conferência dos preços antes de lançar as cotações: um erro de digitação
// (R$ 1.250,00 no lugar de R$ 125,00) vai direto para o site, então um preço
// muito diferente do último lançado pede confirmação.

/** Diferença (para mais ou para menos) acima deste percentual pede confirmação. */
export const QUOTE_DEVIATION_PERCENT = 20

export type QuotePriceCandidate = {
  id: string
  label: string
  /** Último preço lançado (centavos); null antes do primeiro lançamento. */
  lastCents: number | null
  newCents: number
}

export type QuoteDeviation = {
  id: string
  label: string
  lastCents: number
  newCents: number
  /** Variação relativa: 0.25 = +25%, -0.5 = −50%. */
  change: number
}

/** Variação relativa do último preço para o novo; null sem preço anterior. */
export function quotePriceChange(lastCents: number | null | undefined, newCents: number): number | null {
  if (lastCents == null || lastCents <= 0) return null
  return (newCents - lastCents) / lastCents
}

/** Produtos cujo novo preço difere mais que o limite (padrão 20%) do último lançado. */
export function findQuoteDeviations(
  items: QuotePriceCandidate[],
  percent: number = QUOTE_DEVIATION_PERCENT,
): QuoteDeviation[] {
  return items.flatMap(i => {
    if (i.lastCents == null || i.lastCents <= 0 || i.newCents <= 0) return []
    // Conta em inteiros (centavos × 100): exatamente 20% não pede confirmação.
    if (Math.abs(i.newCents - i.lastCents) * 100 <= i.lastCents * percent) return []
    return [{ id: i.id, label: i.label, lastCents: i.lastCents, newCents: i.newCents, change: (i.newCents - i.lastCents) / i.lastCents }]
  })
}

/** 0.253 → "+25,3%"; -0.5 → "-50%"; 9 → "+900%". */
export function formatQuoteChange(change: number): string {
  const pct = Math.round(change * 1000) / 10
  const text = Math.abs(pct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return `${pct < 0 ? '-' : '+'}${text}%`
}
