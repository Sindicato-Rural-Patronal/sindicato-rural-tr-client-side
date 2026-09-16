// Cotações: rótulos dos produtos fixos, período e tendência da variação.

export type QuotePeriod = 'MORNING' | 'AFTERNOON'

export const QUOTE_PERIOD_LABEL: Record<QuotePeriod, string> = {
  MORNING: 'Manhã',
  AFTERNOON: 'Tarde',
}

const PRODUCT_LABEL: Record<string, string> = {
  SOJA: 'Soja',
  MILHO: 'Milho',
  TRIGO: 'Trigo',
  MANDIOCA: 'Mandioca',
  DOLAR: 'Dólar',
}

export function quoteProductLabel(label: string): string {
  return PRODUCT_LABEL[label] ?? label
}

/** Período sugerido pela hora atual: antes do meio-dia é manhã. */
export function currentQuotePeriod(now: Date = new Date()): QuotePeriod {
  return now.getHours() < 12 ? 'MORNING' : 'AFTERNOON'
}

export type Trend = 'up' | 'down' | 'neutral'

export function trendOf(variation: string | null | undefined): Trend {
  const v = (variation ?? '').trim()
  if (!v) return 'neutral'
  // Variação numericamente zero ("0", "0,00", "0.00", "+0") é neutra, não alta.
  const n = parseFloat(v.replace('+', '').replace(',', '.'))
  if (n === 0) return 'neutral'
  return v.startsWith('-') ? 'down' : 'up'
}
