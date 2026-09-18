import type { FinanceRecurrence } from '@/hooks/useFinance'

/**
 * Meses do Financeiro (recorrentes e fechamento) são texto "AAAA-MM": comparável
 * e ordenável como string, sem surpresa de fuso. Mesmas regras do backend.
 */
const MONTHS_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "2026-09" → "set/26". */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS_ABBR[(m ?? 1) - 1]}/${String(y).slice(2)}`
}

/** Mês atual como "AAAA-MM". */
export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Soma `n` meses a "AAAA-MM". */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}`
}

/**
 * Próximo mês que a recorrência vai gerar — ou null quando está pausada ou já
 * passou do mês final. Só informativo: quem decide é o backend.
 */
export function nextMonthToGenerate(
  rec: Pick<FinanceRecurrence, 'active' | 'startMonth' | 'endMonth' | 'lastGeneratedMonth'>,
): string | null {
  if (!rec.active) return null
  const next = rec.lastGeneratedMonth ? addMonths(rec.lastGeneratedMonth, 1) : rec.startMonth
  // Nunca antes do primeiro mês da recorrência.
  const first = next < rec.startMonth ? rec.startMonth : next
  if (rec.endMonth && first > rec.endMonth) return null
  return first
}
