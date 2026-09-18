import type { DashboardStats } from '@/hooks/useAdmin'

// Aviso das cotações do dia no Painel Geral. Tudo em horário de Brasília
// (UTC−3 fixo, como em utils/course-status.ts): o lembrete tem de aparecer na
// mesma hora para todo mundo, não no fuso do computador.

const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000

/** A partir desta hora (Brasília) a cotação do dia já deveria estar lançada. */
export const QUOTES_REMINDER_HOUR = 11

type Quotes = NonNullable<DashboardStats['quotesToday']>

export type QuotesNotice = {
  tone: 'ok' | 'warn'
  text: string
}

const PERIOD_LABEL: Record<'MORNING' | 'AFTERNOON', string> = {
  MORNING: 'manhã',
  AFTERNOON: 'tarde',
}

/** Hora (0–23) e dia da semana (0 = domingo) em Brasília. */
function brasiliaNow(now: Date): { hour: number; weekday: number } {
  const shifted = new Date(now.getTime() - BRASILIA_OFFSET_MS)
  return { hour: shifted.getUTCHours(), weekday: shifted.getUTCDay() }
}

/**
 * O que mostrar sobre as cotações de hoje:
 * - lançadas → confirmação discreta, com o período;
 * - não lançadas, em dia útil depois das 11h (Brasília) → lembrete âmbar;
 * - resto (fim de semana, cedo demais, sem permissão) → nada.
 */
export function quotesNotice(quotes: Quotes | undefined, now: Date = new Date()): QuotesNotice | null {
  if (!quotes) return null
  if (quotes.launched) {
    const period = quotes.period ? PERIOD_LABEL[quotes.period] : null
    return { tone: 'ok', text: period ? `Cotações de hoje lançadas (${period})` : 'Cotações de hoje lançadas' }
  }
  const { hour, weekday } = brasiliaNow(now)
  const weekend = weekday === 0 || weekday === 6
  if (weekend || hour < QUOTES_REMINDER_HOUR) return null
  return { tone: 'warn', text: 'Cotações de hoje ainda não lançadas' }
}
