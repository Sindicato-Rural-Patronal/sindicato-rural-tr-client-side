export type CourseSituation = 'open' | 'in_progress' | 'closed'

// Datas vêm como ISO "YYYY-MM-DD"; ancora à meia-noite local pra comparar por dia.
function parseDay(iso: string | null): Date | null {
  if (!iso) return null
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

type CourseDates = {
  registrationDeadline: string | null
  startDate: string
  endDate: string
}

/**
 * Situação do curso a partir das datas:
 * - closed: já terminou, ou inscrições encerraram antes de começar
 * - in_progress: começou e ainda não terminou
 * - open: ainda vai começar e inscrições em aberto
 */
export function getCourseSituation(c: CourseDates): CourseSituation {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const end = parseDay(c.endDate)
  if (end && end < today) return 'closed'

  const start = parseDay(c.startDate)
  if (start && start <= today && (!end || end >= today)) return 'in_progress'

  const deadline = parseDay(c.registrationDeadline)
  if (deadline && deadline < today) return 'closed'

  return 'open'
}
