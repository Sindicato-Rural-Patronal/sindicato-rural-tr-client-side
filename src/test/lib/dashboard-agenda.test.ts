import { describe, it, expect } from 'vitest'
import { bookingDays, bookingsOnly, dayAgenda, dayCountLabel } from '@/lib/dashboard-agenda'
import type { ScheduleKind } from '@/lib/agenda'

// Horários "de parede": 08:00 = "…T08:00:00.000Z".
function item(kind: ScheduleKind, id: string, start: string, end: string) {
  return { kind, id, title: id, roomName: 'SALA 1', startTime: `${start}:00.000Z`, endTime: `${end}:00.000Z` }
}

const course = (id: string, startTime: string | null) => ({ id, startTime })

describe('bookingsOnly', () => {
  it('tira os cursos da agenda (vêm da lista de cursos)', () => {
    const items = [
      item('COURSE', 'c', '2026-09-17T08:00', '2026-09-17T12:00'),
      item('EVENT', 'e', '2026-09-17T08:00', '2026-09-17T12:00'),
      item('MEETING', 'm', '2026-09-17T14:00', '2026-09-17T15:00'),
    ]
    expect(bookingsOnly(items).map(i => i.id)).toEqual(['e', 'm'])
  })
})

describe('bookingDays', () => {
  it('marca os dias ocupados dentro do período, sem cursos', () => {
    const days = bookingDays(
      [
        item('EVENT', 'feira', '2026-08-30T08:00', '2026-09-02T18:00'),
        item('MEETING', 'reuniao', '2026-09-17T14:00', '2026-09-17T15:00'),
        // Termina à 00:00: não ocupa o dia seguinte.
        item('EVENT', 'jantar', '2026-09-20T20:00', '2026-09-21T00:00'),
        item('COURSE', 'curso', '2026-09-10T08:00', '2026-09-10T12:00'),
        item('EVENT', 'fora', '2026-10-20T08:00', '2026-10-20T12:00'),
      ],
      '2026-08-31',
      '2026-10-03',
    )
    expect([...days].sort()).toEqual(['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-17', '2026-09-20'])
  })
})

describe('dayAgenda', () => {
  it('junta cursos e reservas do dia pela hora de início (empate: curso primeiro)', () => {
    const entries = dayAgenda(
      [course('horta', '14:00'), course('sem-hora', null), course('soja', '08:00')],
      [
        item('MEETING', 'diretoria', '2026-09-17T14:00', '2026-09-17T16:00'),
        item('EVENT', 'vigilia', '2026-09-16T20:00', '2026-09-17T02:00'),
        item('EVENT', 'amanha', '2026-09-18T08:00', '2026-09-18T09:00'),
        item('COURSE', 'curso-da-agenda', '2026-09-17T07:00', '2026-09-17T09:00'),
      ],
      '2026-09-17',
    )
    expect(entries.map(e => [e.kind, e.key])).toEqual([
      ['EVENT', 'booking-vigilia'],
      ['COURSE', 'course-soja'],
      ['COURSE', 'course-horta'],
      ['MEETING', 'booking-diretoria'],
      ['COURSE', 'course-sem-hora'],
    ])
  })

  it('reserva que termina à 00:00 não aparece no dia seguinte', () => {
    const bookings = [item('EVENT', 'jantar', '2026-09-20T20:00', '2026-09-21T00:00')]
    expect(dayAgenda([], bookings, '2026-09-21')).toEqual([])
    expect(dayAgenda([], bookings, '2026-09-20')).toHaveLength(1)
  })
})

describe('dayCountLabel', () => {
  it('conta cursos e reservas', () => {
    expect(dayCountLabel(0, 0)).toBeNull()
    expect(dayCountLabel(1, 0)).toBe('1 curso')
    expect(dayCountLabel(0, 1)).toBe('1 reserva')
    expect(dayCountLabel(2, 3)).toBe('2 cursos · 3 reservas')
  })
})
