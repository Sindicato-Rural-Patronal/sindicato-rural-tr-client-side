import { describe, it, expect } from 'vitest'
import {
  addDays, bookingFormToBody, bookingToForm, emptyBookingForm, formatDateBr, isMultiDay, itemsForDay,
  parseAgendaSearch, timeRangeLabel, toWallIso, validateBookingForm, wallDate, wallTime, weekDays,
  weekLabel, weekStart, weekdayShort, type BookingFormValues,
} from '@/lib/agenda'
import type { RoomBooking } from '@/hooks/useRoomBookings'

const item = (id: string, start: string, end: string) => ({ id, startTime: start, endTime: end })

describe('semana', () => {
  it('weekStart devolve a segunda-feira (domingo pertence à semana anterior)', () => {
    expect(weekStart('2026-10-05')).toBe('2026-10-05') // segunda
    expect(weekStart('2026-10-08')).toBe('2026-10-05') // quinta
    expect(weekStart('2026-10-11')).toBe('2026-10-05') // domingo
    expect(weekStart('2026-10-12')).toBe('2026-10-12')
    expect(weekStart('2027-01-01')).toBe('2026-12-28') // vira o ano
  })

  it('weekDays lista seg → dom', () => {
    const days = weekDays('2026-10-05')
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-10-05')
    expect(days[6]).toBe('2026-10-11')
    expect(days.map(weekdayShort)).toEqual(['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'])
  })

  it('addDays atravessa mês e ano bissexto', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('weekLabel no mesmo mês, entre meses e entre anos', () => {
    expect(weekLabel('2026-10-05')).toBe('05–11 de outubro de 2026')
    expect(weekLabel('2026-09-28')).toBe('28 de setembro – 04 de outubro de 2026')
    expect(weekLabel('2026-12-28')).toBe('28 de dezembro de 2026 – 03 de janeiro de 2027')
  })
})

describe('horário de parede', () => {
  it('fatia o ISO sem converter fuso', () => {
    expect(wallDate('2026-10-05T08:00:00.000Z')).toBe('2026-10-05')
    expect(wallTime('2026-10-05T08:00:00.000Z')).toBe('08:00')
    expect(wallTime('2026-10-05T23:30:00.000Z')).toBe('23:30')
    expect(toWallIso('2026-10-05', '08:00')).toBe('2026-10-05T08:00:00.000Z')
    expect(formatDateBr('2026-10-05')).toBe('05/10/2026')
  })

  it('rótulo do horário: um dia e vários dias', () => {
    expect(timeRangeLabel(item('a', '2026-10-05T08:00:00.000Z', '2026-10-05T12:00:00.000Z'))).toBe('08:00–12:00')
    expect(timeRangeLabel(item('b', '2026-10-05T08:00:00.000Z', '2026-10-07T12:00:00.000Z'))).toBe('05/10 08:00 – 07/10 12:00')
  })
})

describe('itemsForDay', () => {
  const items = [
    item('tarde', '2026-10-06T14:00:00.000Z', '2026-10-06T17:00:00.000Z'),
    item('manha', '2026-10-06T08:00:00.000Z', '2026-10-06T12:00:00.000Z'),
    item('longo', '2026-10-05T19:00:00.000Z', '2026-10-07T11:00:00.000Z'),
    item('meia-noite', '2026-10-08T20:00:00.000Z', '2026-10-09T00:00:00.000Z'),
  ]

  it('ordena por horário e inclui itens de vários dias em cada dia', () => {
    expect(itemsForDay(items, '2026-10-05').map(i => i.id)).toEqual(['longo'])
    expect(itemsForDay(items, '2026-10-06').map(i => i.id)).toEqual(['longo', 'manha', 'tarde'])
    expect(itemsForDay(items, '2026-10-07').map(i => i.id)).toEqual(['longo'])
  })

  it('terminar à 00:00 não ocupa o dia seguinte', () => {
    expect(itemsForDay(items, '2026-10-08').map(i => i.id)).toEqual(['meia-noite'])
    expect(itemsForDay(items, '2026-10-09')).toEqual([])
    expect(isMultiDay(items[3])).toBe(false)
  })
})

describe('parseAgendaSearch', () => {
  it('normaliza a semana para a segunda e ignora valores inválidos', () => {
    expect(parseAgendaSearch({ week: '2026-10-08', roomId: 12, type: 'MEETING', view: 'lista' }))
      .toEqual({ week: '2026-10-05', roomId: '12', type: 'MEETING', view: 'lista' })
    expect(parseAgendaSearch({ week: '2026-02-31', roomId: '', type: 'X', view: 'mes' }))
      .toEqual({ week: undefined, roomId: undefined, type: undefined, view: undefined })
  })
})

describe('formulário de reserva', () => {
  const valid: BookingFormValues = {
    ...emptyBookingForm('2026-10-05', 'room-1'),
    title: 'REUNIAO DA DIRETORIA',
    startHour: '08:00',
    endHour: '12:00',
  }

  it('valida obrigatórios e término depois do início', () => {
    expect(validateBookingForm(emptyBookingForm(), { creating: true })).toMatchObject({
      title: expect.any(String), roomId: expect.any(String), date: expect.any(String),
      startHour: expect.any(String), endHour: expect.any(String),
    })
    expect(validateBookingForm(valid, { creating: true })).toEqual({})
    expect(validateBookingForm({ ...valid, endHour: '08:00' }, { creating: true }).endHour)
      .toBe('O término precisa ser depois do início.')
    // Em outro dia pode terminar mais cedo no relógio
    expect(validateBookingForm({ ...valid, multiDay: true, endDate: '2026-10-06', endHour: '07:00' }, { creating: true })).toEqual({})
    expect(validateBookingForm({ ...valid, multiDay: true, endDate: '2026-10-05' }, { creating: true }).endDate).toBeTruthy()
    expect(validateBookingForm({ ...valid, repeat: 'WEEKLY' }, { creating: true }).repeatUntil).toBeTruthy()
    // Repetição só existe ao criar
    expect(validateBookingForm({ ...valid, repeat: 'WEEKLY' }, { creating: false })).toEqual({})
  })

  it('monta o corpo com horário de parede, responsável e repetição', () => {
    const body = bookingFormToBody({
      ...valid,
      multiDay: true,
      endDate: '2026-10-06',
      responsible: { id: 'p1', name: 'MARIA' },
      responsibleName: 'ignorado',
      repeat: 'MONTHLY',
      repeatUntil: '2026-12-31',
    }, { creating: true })
    expect(body).toEqual({
      type: 'EVENT',
      title: 'REUNIAO DA DIRETORIA',
      roomId: 'room-1',
      startTime: '2026-10-05T08:00:00.000Z',
      endTime: '2026-10-06T12:00:00.000Z',
      responsibleUserDataId: 'p1',
      repeat: { frequency: 'MONTHLY', until: '2026-12-31' },
    })
  })

  it('ao editar, limpa campos vazios com null e não manda repetição', () => {
    const body = bookingFormToBody(
      { ...valid, responsibleMode: 'name', responsibleName: ' JOAO ', repeat: 'WEEKLY' },
      { creating: false },
    )
    expect(body).toMatchObject({ description: null, responsibleUserDataId: null, responsibleName: 'JOAO' })
    expect(body).not.toHaveProperty('repeat')
  })

  it('reserva da API → formulário', () => {
    const booking: RoomBooking = {
      id: 'b1', type: 'MEETING', title: 'REUNIAO', description: null, roomId: 'r1', roomName: 'SALA 1',
      startTime: '2026-10-05T19:00:00.000Z', endTime: '2026-10-06T01:00:00.000Z',
      responsible: null, responsibleName: 'JOAO', seriesId: 's1',
    }
    expect(bookingToForm(booking)).toMatchObject({
      type: 'MEETING', date: '2026-10-05', startHour: '19:00', endHour: '01:00',
      multiDay: true, endDate: '2026-10-06', responsibleMode: 'name', responsibleName: 'JOAO', repeat: 'NONE',
    })
  })
})
