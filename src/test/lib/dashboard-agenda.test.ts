import { describe, it, expect } from 'vitest'
import { kindDays, parseDashboardSearch } from '@/lib/dashboard-agenda'
import type { ScheduleKind } from '@/lib/agenda'

// Horários "de parede": 08:00 = "…T08:00:00.000Z".
function item(kind: ScheduleKind, id: string, start: string, end: string) {
  return { kind, id, title: id, roomName: 'SALA 1', startTime: `${start}:00.000Z`, endTime: `${end}:00.000Z` }
}

describe('parseDashboardSearch', () => {
  it('aceita dia, sala e tipo válidos', () => {
    expect(parseDashboardSearch({ dia: '2026-09-17', sala: 12, tipo: 'MEETING' }))
      .toEqual({ dia: '2026-09-17', sala: '12', tipo: 'MEETING', nova: undefined })
  })

  it('aceita o atalho de nova reserva', () => {
    expect(parseDashboardSearch({ nova: 'reserva' }).nova).toBe('reserva')
    expect(parseDashboardSearch({ nova: 'curso' }).nova).toBeUndefined()
  })

  it('joga fora o que não serve', () => {
    expect(parseDashboardSearch({ dia: '2026-02-31', sala: '', tipo: 'X' }))
      .toEqual({ dia: undefined, sala: undefined, tipo: undefined, nova: undefined })
    expect(parseDashboardSearch({})).toEqual({ dia: undefined, sala: undefined, tipo: undefined, nova: undefined })
  })
})

describe('kindDays', () => {
  it('marca só os dias do tipo pedido, com a regra da agenda', () => {
    const itens = [
      item('EVENT', 'feira', '2026-08-30T08:00', '2026-09-02T18:00'),
      item('MEETING', 'reuniao', '2026-09-17T14:00', '2026-09-17T15:00'),
      // Termina à 00:00: não ocupa o dia seguinte.
      item('EVENT', 'jantar', '2026-09-20T20:00', '2026-09-21T00:00'),
      item('COURSE', 'curso', '2026-09-10T08:00', '2026-09-10T12:00'),
      item('EVENT', 'fora', '2026-10-20T08:00', '2026-10-20T12:00'),
    ]
    expect([...kindDays(itens, '2026-08-31', '2026-10-03', 'EVENT')].sort())
      .toEqual(['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-20'])
    expect([...kindDays(itens, '2026-08-31', '2026-10-03', 'COURSE')]).toEqual(['2026-09-10'])
  })
})
