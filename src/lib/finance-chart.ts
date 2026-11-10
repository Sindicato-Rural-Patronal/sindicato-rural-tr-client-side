// Contas do gráfico de entradas × saídas do Financeiro (components/financeiro/MonthlyChart).

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "2026-06" → "jun/26". */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MESES_ABREV[(m ?? 1) - 1]}/${String(y).slice(2)}`
}

/** "2026-06" → "Junho de 2026". */
export function monthLong(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const nome = MESES[(m ?? 1) - 1] ?? ''
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${y}`
}

/**
 * Escala do eixo: topo e passo redondos (1, 2, 2,5 ou 5 vezes uma potência de 10), com
 * cerca de `ticks` linhas de grade. Em centavos, como os valores. Sem valor nenhum, uma
 * escala de R$ 0 a R$ 400 só para desenhar a grade.
 */
export function niceScale(max: number, ticks = 4): { top: number; step: number } {
  if (!(max > 0)) return { top: 4 * 100_00, step: 100_00 }
  const raw = max / ticks
  const mag = 10 ** Math.floor(Math.log10(raw))
  const n = raw / mag
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  const step = nice * mag
  return { top: Math.ceil(max / step) * step, step }
}

const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

/** Rótulo do eixo em reais, curto: 3_000_000 centavos → "30 mil"; 150_000_000 → "1,5 mi". */
export function axisLabel(cents: number): string {
  return compacto.format(cents / 100)
}
