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

/** Unidades aceitas pelo backend (`QUOTE_UNITS`); '' = sem unidade (dólar). */
export const QUOTE_UNIT_OPTIONS: { value: string; label: string; long: string }[] = [
  { value: 'sc 60kg', label: 'Saca 60 kg', long: 'saca de 60 kg' },
  { value: 'sc 50kg', label: 'Saca 50 kg', long: 'saca de 50 kg' },
  { value: 'sc 40kg', label: 'Saca 40 kg', long: 'saca de 40 kg' },
  { value: 't', label: 'Tonelada', long: 'tonelada' },
  { value: 'kg', label: 'Quilo', long: 'quilo' },
  { value: '@', label: 'Arroba (15 kg)', long: 'arroba (15 kg)' },
  { value: '', label: 'Sem unidade', long: '' },
]

/** "t" → "tonelada"; unidade desconhecida volta como veio. */
export function quoteUnitLong(unit: string | null | undefined): string {
  if (!unit) return ''
  return QUOTE_UNIT_OPTIONS.find(o => o.value === unit)?.long ?? unit
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
