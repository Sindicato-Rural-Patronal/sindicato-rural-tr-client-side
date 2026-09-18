import { brasiliaToday } from '@/utils/course-status'

/**
 * Primeiro e último dia do mês atual em Brasília ("YYYY-MM-DD"), do jeito que o
 * Financeiro espera em `from`/`to`.
 */
export function currentMonthRange(now: Date = new Date()): { from: string; to: string } {
  const today = brasiliaToday(now)
  const [year, month] = today.split('-').map(Number)
  // Dia 0 do mês seguinte = último dia deste mês (o Date normaliza dezembro).
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const mm = String(month).padStart(2, '0')
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` }
}

/** "setembro de 2026" — título do resumo do mês. */
export function monthTitle(now: Date = new Date()): string {
  const [year, month] = brasiliaToday(now).split('-').map(Number)
  const names = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  return `${names[month - 1]} de ${year}`
}
