import { describe, it, expect } from 'vitest'
import {
  agendaCountLabel, agendaEntries, agendaFileName, hourAtFraction, itemsByDay, itemsOfDay,
  minutesToWall, occupancyRows, occupancyTicks, occupiedDays, plusOneHour, rangeLabel,
  startOfWeek, visibleRange, wallMinutes, weekDays,
  type AgendaEntry,
} from '@/lib/agenda'
import type { RoomBooking, RoomScheduleItem } from '@/hooks/useRoomBookings'

// Visões dia/semana, lista por dia e faixa de ocupação da agenda das salas.

const curso = (over: Partial<RoomScheduleItem> = {}): RoomScheduleItem => ({
  kind: 'COURSE', id: 'c1', title: 'MANEJO DE PASTAGEM', roomId: 'r1', roomName: 'AUDITORIO',
  startTime: '2026-10-05T08:00:00.000Z', endTime: '2026-10-05T12:00:00.000Z',
  status: 'PUBLIC', seriesId: null, publicOnSite: false, ...over,
})

const reserva = (over: Partial<RoomBooking> = {}): RoomBooking => ({
  id: 'b1', type: 'MEETING', title: 'REUNIAO DA DIRETORIA', description: null,
  publicOnSite: false, publicDescription: null, roomId: 'r2', roomName: 'SALA 1',
  startTime: '2026-10-05T14:00:00.000Z', endTime: '2026-10-05T16:00:00.000Z',
  responsible: null, responsibleName: null, seriesId: null, ...over,
})

const salas = [{ id: 'r1', name: 'AUDITORIO' }, { id: 'r2', name: 'SALA 1' }]

const entry = (over: Partial<AgendaEntry>): AgendaEntry => ({
  key: over.key ?? `k-${over.id ?? '1'}`, kind: 'EVENT', id: '1', title: 'EVENTO',
  roomId: 'r1', roomName: 'AUDITORIO',
  startTime: '2026-10-05T08:00:00.000Z', endTime: '2026-10-05T12:00:00.000Z',
  publicOnSite: false, responsible: null, ...over,
})

describe('semana', () => {
  it('a semana vai de segunda a domingo', () => {
    expect(startOfWeek('2026-10-07')).toBe('2026-10-05')
    // O domingo fecha a semana que começou na segunda anterior.
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05')
    expect(startOfWeek('2026-10-05')).toBe('2026-10-05')
    expect(weekDays('2026-10-08')).toEqual([
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11',
    ])
  })

  it('o período visível é o dia ou a semana inteira', () => {
    expect(visibleRange('2026-10-07', 'day')).toEqual({ from: '2026-10-07', to: '2026-10-07' })
    expect(visibleRange('2026-10-07', 'week')).toEqual({ from: '2026-10-05', to: '2026-10-11' })
  })

  it('rótulo e nome do arquivo do período', () => {
    expect(rangeLabel('2026-10-05', '2026-10-05')).toBe('05/10/2026')
    expect(rangeLabel('2026-10-05', '2026-10-11')).toBe('05/10/2026 a 11/10/2026')
    expect(agendaFileName('2026-10-05', '2026-10-05')).toBe('agenda-2026-10-05')
    expect(agendaFileName('2026-10-05', '2026-10-11')).toBe('agenda-2026-10-05-a-2026-10-11')
  })

  it('conta cursos e reservas', () => {
    expect(agendaCountLabel(2, 1)).toBe('2 cursos · 1 reserva')
    expect(agendaCountLabel(0, 3)).toBe('3 reservas')
    expect(agendaCountLabel(0, 0)).toBeNull()
  })
})

describe('itens do dia', () => {
  it('junta cursos e reservas em ordem de horário', () => {
    const items = agendaEntries([curso()], [reserva(), reserva({ id: 'b2', type: 'EVENT', startTime: '2026-10-05T07:00:00.000Z', endTime: '2026-10-05T09:00:00.000Z', title: 'DIA DE CAMPO' })])
    expect(itemsOfDay(items, '2026-10-05').map(i => i.title)).toEqual([
      'DIA DE CAMPO', 'MANEJO DE PASTAGEM', 'REUNIAO DA DIRETORIA',
    ])
  })

  it('o responsável vem da pessoa do cadastro ou do nome digitado', () => {
    const [comPessoa, comNome] = agendaEntries([], [
      reserva({ id: 'b1', responsible: { id: 'p1', name: 'MARIA' } }),
      reserva({ id: 'b2', responsibleName: 'JOAO' }),
    ])
    expect(comPessoa.responsible).toBe('MARIA')
    expect(comNome.responsible).toBe('JOAO')
  })

  it('item de vários dias aparece em todos os dias, e o que começou antes vem primeiro', () => {
    const items = agendaEntries([curso({ startTime: '2026-10-05T08:00:00.000Z', endTime: '2026-10-07T12:00:00.000Z' })], [reserva({ startTime: '2026-10-06T14:00:00.000Z', endTime: '2026-10-06T16:00:00.000Z' })])
    const dias = itemsByDay(items, ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'])
    expect(dias.map(d => d.items.length)).toEqual([1, 2, 1, 0])
    expect(dias[1].items[0].title).toBe('MANEJO DE PASTAGEM')
  })

  it('terminar à meia-noite não ocupa o dia seguinte — curso e reserva pela mesma regra', () => {
    const items = agendaEntries(
      [curso({ startTime: '2026-10-05T20:00:00.000Z', endTime: '2026-10-06T00:00:00.000Z' })],
      [reserva({ startTime: '2026-10-05T20:00:00.000Z', endTime: '2026-10-06T00:00:00.000Z' })],
    )
    expect(itemsOfDay(items, '2026-10-05')).toHaveLength(2)
    expect(itemsOfDay(items, '2026-10-06')).toHaveLength(0)
    expect([...occupiedDays(items, '2026-10-01', '2026-10-31')]).toEqual(['2026-10-05'])
  })

  it('occupiedDays recorta o período pedido', () => {
    const items = agendaEntries([curso({ startTime: '2026-10-04T08:00:00.000Z', endTime: '2026-10-08T12:00:00.000Z' })], [])
    expect([...occupiedDays(items, '2026-10-05', '2026-10-06')]).toEqual(['2026-10-05', '2026-10-06'])
  })
})

describe('faixa de ocupação', () => {
  it('horas em minutos e de volta', () => {
    expect(wallMinutes('08:30')).toBe(510)
    expect(minutesToWall(510)).toBe('08:30')
    expect(plusOneHour('08:30')).toBe('09:30')
    expect(occupancyTicks()).toHaveLength(16)
  })

  it('uma linha por sala, mesmo a sala vazia', () => {
    const rows = occupancyRows(agendaEntries([curso()], []), salas, '2026-10-05')
    expect(rows.map(r => r.roomName)).toEqual(['AUDITORIO', 'SALA 1'])
    expect(rows[1].blocks).toHaveLength(0)
  })

  it('o bloco mede o pedaço do dia dentro das 07:00–22:00', () => {
    const [aud] = occupancyRows(agendaEntries([curso()], []), salas, '2026-10-05')
    const bloco = aud.blocks[0]
    expect(bloco.left).toBeCloseTo((60 / 900) * 100, 5)
    expect(bloco.width).toBeCloseTo((240 / 900) * 100, 5)
    expect(bloco.cutBefore).toBe(false)
    expect(bloco.cutAfter).toBe(false)
    expect(bloco.label).toBe('08:00–12:00 · MANEJO DE PASTAGEM')
  })

  it('itens que se sobrepõem ficam em linhas diferentes', () => {
    const items = [
      entry({ id: 'a', key: 'a', kind: 'COURSE', title: 'CURSO' }),
      entry({ id: 'b', key: 'b', title: 'EVENTO', startTime: '2026-10-05T10:00:00.000Z', endTime: '2026-10-05T11:00:00.000Z' }),
      entry({ id: 'c', key: 'c', title: 'DEPOIS', startTime: '2026-10-05T13:00:00.000Z', endTime: '2026-10-05T14:00:00.000Z' }),
    ]
    const [aud] = occupancyRows(items, salas, '2026-10-05')
    expect(aud.lanes).toBe(2)
    expect(aud.blocks.map(b => b.lane)).toEqual([0, 1, 0])
  })

  it('item de outro dia ocupa a faixa inteira, marcado dos dois lados', () => {
    const items = [entry({ id: 'm', key: 'm', startTime: '2026-10-04T20:00:00.000Z', endTime: '2026-10-06T10:00:00.000Z' })]
    const [aud] = occupancyRows(items, salas, '2026-10-05')
    expect(aud.blocks[0].left).toBe(0)
    expect(aud.blocks[0].width).toBe(100)
    expect(aud.blocks[0].cutBefore).toBe(true)
    expect(aud.blocks[0].cutAfter).toBe(true)
  })

  it('o que fica fora das 07:00–22:00 sai da faixa, mas continua contado', () => {
    const items = [entry({ id: 'x', key: 'x', startTime: '2026-10-05T05:00:00.000Z', endTime: '2026-10-05T06:30:00.000Z' })]
    const [aud] = occupancyRows(items, salas, '2026-10-05')
    expect(aud.blocks).toHaveLength(0)
    expect(aud.outside).toHaveLength(1)
  })

  it('reserva curta ganha largura mínima para continuar visível', () => {
    const items = [entry({ id: 's', key: 's', startTime: '2026-10-05T09:00:00.000Z', endTime: '2026-10-05T09:10:00.000Z' })]
    const [aud] = occupancyRows(items, salas, '2026-10-05')
    expect(aud.blocks[0].width).toBe(2)
  })

  it('sala que não está na lista ainda aparece', () => {
    const items = [entry({ id: 'z', key: 'z', roomId: 'r9', roomName: 'SALA APL' })]
    const rows = occupancyRows(items, salas, '2026-10-05')
    expect(rows.map(r => r.roomName)).toEqual(['AUDITORIO', 'SALA 1', 'SALA APL'])
  })

  it('o clique na faixa vira horário de meia em meia hora', () => {
    expect(hourAtFraction(0)).toBe('07:00')
    expect(hourAtFraction(0.5)).toBe('14:30')
    expect(hourAtFraction(0.2)).toBe('10:00')
    // No fim da faixa sobra pelo menos uma hora para a reserva.
    expect(hourAtFraction(1)).toBe('21:00')
  })
})
