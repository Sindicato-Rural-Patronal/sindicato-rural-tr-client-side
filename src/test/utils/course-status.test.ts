import { describe, it, expect } from 'vitest'
import {
  brasiliaToday,
  deadlineTimeOf,
  getCourseSituation,
  getRegistrationBlock,
  hasCourseEnded,
  hasCourseStarted,
  isRegistrationDeadlinePassed,
} from '@/utils/course-status'

// 20/09/2026 23:30 em Brasília = 21/09 02:30 UTC.
const deadlineDayLate = new Date('2026-09-21T02:30:00.000Z')
// 21/09/2026 00:01 em Brasília = 21/09 03:01 UTC.
const nextDayEarly = new Date('2026-09-21T03:01:00.000Z')

const base = {
  status: 'PUBLIC',
  startDate: '2026-09-25',
  endDate: '2026-09-26',
  registrationDeadline: '2026-09-20',
  maxStudents: 20,
  enrolled: 5,
}

describe('brasiliaToday', () => {
  it('usa o dia de Brasília, não o UTC', () => {
    expect(brasiliaToday(deadlineDayLate)).toBe('2026-09-20')
    expect(brasiliaToday(nextDayEarly)).toBe('2026-09-21')
  })
})

describe('prazo sem hora (dia inteiro)', () => {
  it('continua aberto às 23:30 do dia do prazo', () => {
    expect(isRegistrationDeadlinePassed('2026-09-20', null, deadlineDayLate)).toBe(false)
    expect(getRegistrationBlock(base, deadlineDayLate)).toBeNull()
    expect(getCourseSituation(base, deadlineDayLate)).toBe('open')
  })

  it('fecha às 00:01 do dia seguinte', () => {
    expect(isRegistrationDeadlinePassed('2026-09-20', null, nextDayEarly)).toBe(true)
    expect(getRegistrationBlock(base, nextDayEarly)).toBe('deadline')
    expect(getCourseSituation(base, nextDayEarly)).toBe('closed')
  })

  it('hora 00:00 conta como sem hora; vazio ou inválido não fecha', () => {
    expect(isRegistrationDeadlinePassed('2026-09-20', '00:00', deadlineDayLate)).toBe(false)
    expect(isRegistrationDeadlinePassed('2026-09-20', '00:00', nextDayEarly)).toBe(true)
    expect(isRegistrationDeadlinePassed(null, null, nextDayEarly)).toBe(false)
    expect(isRegistrationDeadlinePassed('lixo', null, nextDayEarly)).toBe(false)
  })
})

describe('prazo com hora (relógio de Brasília)', () => {
  // 20/09 17:59 e 18:01 em Brasília = 20:59 e 21:01 UTC.
  const at1759 = new Date('2026-09-20T20:59:00.000Z')
  const at1801 = new Date('2026-09-20T21:01:00.000Z')
  const withHour = { ...base, registrationDeadlineTime: '18:00' }

  it('lê a hora e trata 00:00 como sem hora', () => {
    expect(deadlineTimeOf('18:00')).toBe('18:00')
    expect(deadlineTimeOf('00:00')).toBeNull()
    expect(deadlineTimeOf(null)).toBeNull()
    expect(deadlineTimeOf('25:00')).toBeNull()
  })

  it('aberto às 17:59', () => {
    expect(isRegistrationDeadlinePassed('2026-09-20', '18:00', at1759)).toBe(false)
    expect(getRegistrationBlock(withHour, at1759)).toBeNull()
    expect(getCourseSituation(withHour, at1759)).toBe('open')
  })

  it('fechado às 18:01', () => {
    expect(isRegistrationDeadlinePassed('2026-09-20', '18:00', at1801)).toBe(true)
    expect(getRegistrationBlock(withHour, at1801)).toBe('deadline')
    expect(getCourseSituation(withHour, at1801)).toBe('closed')
  })
})

describe('fim do curso e andamento', () => {
  const lastDay = { ...base, startDate: '2026-09-18', endDate: '2026-09-20', registrationDeadline: null }

  it('no último dia ainda está em andamento e aceita inscrição', () => {
    expect(hasCourseEnded('2026-09-20', deadlineDayLate)).toBe(false)
    expect(getCourseSituation(lastDay, deadlineDayLate)).toBe('in_progress')
    expect(getRegistrationBlock(lastDay, deadlineDayLate)).toBeNull()
  })

  it('no dia seguinte ao fim está encerrado', () => {
    expect(hasCourseEnded('2026-09-20', nextDayEarly)).toBe(true)
    expect(getCourseSituation(lastDay, nextDayEarly)).toBe('closed')
    expect(getRegistrationBlock(lastDay, nextDayEarly)).toBe('ended')
  })

  it('status IN_PROGRESS bloqueia inscrição e aparece como em andamento', () => {
    const marked = { ...base, status: 'IN_PROGRESS' }
    expect(getRegistrationBlock(marked, deadlineDayLate)).toBe('in_progress')
    expect(getCourseSituation(marked, deadlineDayLate)).toBe('in_progress')
  })

  it('status COMPLETED conta como terminado, mesmo antes do fim', () => {
    const done = { ...base, status: 'COMPLETED' }
    expect(getRegistrationBlock(done, deadlineDayLate)).toBe('ended')
    expect(getCourseSituation(done, deadlineDayLate)).toBe('closed')
  })

  it('curso lotado', () => {
    expect(getRegistrationBlock({ ...base, enrolled: 20 }, deadlineDayLate)).toBe('full')
  })

  it('terminado tem prioridade sobre prazo e lotação', () => {
    const c = { ...lastDay, registrationDeadline: '2026-09-10', enrolled: 20 }
    expect(getRegistrationBlock(c, nextDayEarly)).toBe('ended')
  })
})

describe('hasCourseStarted (presença)', () => {
  it('iniciado ou concluído no painel', () => {
    expect(hasCourseStarted({ status: 'IN_PROGRESS', startDate: '2026-09-25' }, deadlineDayLate)).toBe(true)
    expect(hasCourseStarted({ status: 'COMPLETED', startDate: '2026-09-25' }, deadlineDayLate)).toBe(true)
  })

  it('pela data de início em Brasília', () => {
    expect(hasCourseStarted({ status: 'PUBLIC', startDate: '2026-09-21' }, deadlineDayLate)).toBe(false)
    expect(hasCourseStarted({ status: 'PUBLIC', startDate: '2026-09-21' }, nextDayEarly)).toBe(true)
    expect(hasCourseStarted({ status: 'PUBLIC', startDate: null }, nextDayEarly)).toBe(false)
  })
})
