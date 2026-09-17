export type CourseSituation = 'open' | 'in_progress' | 'closed'

/**
 * Motivo de o botão "Inscrever-se" ficar desligado (null = pode inscrever).
 * Mesmas regras do backend (`lib/course-registration-rules.ts`).
 */
export type RegistrationBlock = 'ended' | 'in_progress' | 'deadline' | 'full' | null

const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000

/**
 * Hoje em Brasília, "YYYY-MM-DD" (UTC-3 fixo — sem horário de verão desde 2019).
 * Não usa o fuso do aparelho: o prazo é o mesmo para quem abre de qualquer lugar.
 */
export function brasiliaToday(now: Date = new Date()): string {
  return new Date(now.getTime() - BRASILIA_OFFSET_MS).toISOString().slice(0, 10)
}

// Datas vêm como "YYYY-MM-DD" (ou ISO com a hora "de parede" + Z): o dia é o começo da string.
function dayOf(iso: string | null | undefined): string | null {
  if (!iso) return null
  const day = iso.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null
}

/** Hora do prazo "HH:MM"; null quando não veio ou é 00:00 (o painel grava 00:00 quando não há hora). */
export function deadlineTimeOf(time: string | null | undefined): string | null {
  const hm = /^([01]\d|2[0-3]):[0-5]\d/.exec(time ?? '')?.[0] ?? null
  return hm === '00:00' ? null : hm
}

/**
 * Prazo de inscrição, no horário de Brasília (mesma regra do backend):
 * - sem hora: vale até o fim do dia do prazo;
 * - com hora (`registrationDeadlineTime`): fecha quando o relógio de Brasília passa de dia + hora.
 */
export function isRegistrationDeadlinePassed(
  deadline: string | null | undefined,
  time: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const day = dayOf(deadline)
  if (!day) return false
  const hm = deadlineTimeOf(time)
  if (!hm) return day < brasiliaToday(now)
  // Compara em "hora de parede": o prazo como se fosse UTC e o agora deslocado para Brasília.
  return now.getTime() - BRASILIA_OFFSET_MS > Date.parse(`${day}T${hm}:00.000Z`)
}

/** O curso terminou quando o dia do fim (Brasília) já passou — no último dia ainda não. */
export function hasCourseEnded(endDate: string | null | undefined, now: Date = new Date()): boolean {
  const day = dayOf(endDate)
  return !!day && day < brasiliaToday(now)
}

type CourseDates = {
  registrationDeadline: string | null
  /** "HH:MM" quando o painel informou a hora do prazo. */
  registrationDeadlineTime?: string | null
  startDate: string
  endDate: string
  status?: string
}

/**
 * Situação do curso a partir das datas (Brasília):
 * - closed: já terminou, ou inscrições encerraram antes de começar
 * - in_progress: começou e ainda não terminou (ou o painel marcou "em andamento")
 * - open: ainda vai começar e inscrições em aberto
 */
export function getCourseSituation(c: CourseDates, now: Date = new Date()): CourseSituation {
  if (hasCourseEnded(c.endDate, now)) return 'closed'

  const start = dayOf(c.startDate)
  if (c.status === 'IN_PROGRESS' || (start && start <= brasiliaToday(now))) return 'in_progress'

  if (isRegistrationDeadlinePassed(c.registrationDeadline, c.registrationDeadlineTime, now)) return 'closed'

  return 'open'
}

type CourseForRegistration = CourseDates & {
  maxStudents: number
  enrolled: number
}

/** Por que não dá para se inscrever agora (null = pode). */
export function getRegistrationBlock(c: CourseForRegistration, now: Date = new Date()): RegistrationBlock {
  if (hasCourseEnded(c.endDate, now)) return 'ended'
  if (c.status === 'IN_PROGRESS') return 'in_progress'
  if (isRegistrationDeadlinePassed(c.registrationDeadline, c.registrationDeadlineTime, now)) return 'deadline'
  if (c.maxStudents - c.enrolled <= 0) return 'full'
  return null
}
