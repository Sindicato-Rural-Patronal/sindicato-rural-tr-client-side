import { formatDateBr, isValidYmd, toWallIso, wallDate, wallTime } from '@/lib/agenda'

// Agendamento de notícia. `publishAt` é hora "de parede" de Brasília rotulada
// em UTC ("…T08:00:00.000Z" = 08:00 em Terra Roxa), igual aos cursos e às
// reservas de sala. Funções puras: nada aqui usa o fuso do navegador a não ser
// `nowWallClock`, que converte o relógio do computador para o de Brasília.

const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000
const HOUR_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export type NewsPublishMode = 'now' | 'scheduled'

export type NewsScheduleForm = {
  mode: NewsPublishMode
  /** "AAAA-MM-DD". */
  date: string
  /** "HH:MM". */
  hour: string
}

/** "Agora" no mesmo formato dos horários gravados (relógio de Brasília com Z). */
export function nowWallClock(now: Date = new Date()): string {
  return new Date(now.getTime() - BRASILIA_OFFSET_MS).toISOString()
}

/** Notícia marcada para entrar no ar depois. */
export function isScheduled(publishAt: string | null | undefined, at: string = nowWallClock()): boolean {
  return !!publishAt && publishAt > at
}

/** O que o site mostra: publicada e sem agendamento pendente. */
export function isNewsLive(
  news: { status: 'PUBLISHED' | 'UNPUBLISHED'; publishAt: string | null },
  at: string = nowWallClock(),
): boolean {
  return news.status === 'PUBLISHED' && !isScheduled(news.publishAt, at)
}

/** "Agendada para 05/10/2026 08:00". */
export function scheduleLabel(publishAt: string): string {
  return `Agendada para ${formatDateBr(wallDate(publishAt))} ${wallTime(publishAt)}`
}

/** Notícia da API → estado dos campos de agendamento. */
export function scheduleToForm(publishAt: string | null | undefined): NewsScheduleForm {
  if (!publishAt) return { mode: 'now', date: '', hour: '' }
  return { mode: 'scheduled', date: wallDate(publishAt), hour: wallTime(publishAt) }
}

/** Mensagem do que falta preencher, ou null quando está pronto para salvar. */
export function validateSchedule(form: NewsScheduleForm): string | null {
  if (form.mode === 'now') return null
  if (!isValidYmd(form.date)) return 'Informe a data da publicação.'
  if (!HOUR_RE.test(form.hour)) return 'Informe a hora da publicação.'
  return null
}

/**
 * Campos de agendamento → `publishAt` do corpo. Rascunho e "publicar agora"
 * mandam null (limpa o agendamento que houver).
 */
export function scheduleToPublishAt(
  form: NewsScheduleForm,
  status: 'PUBLISHED' | 'UNPUBLISHED',
): string | null {
  if (status !== 'PUBLISHED' || form.mode === 'now') return null
  if (validateSchedule(form)) return null
  return toWallIso(form.date, form.hour)
}
