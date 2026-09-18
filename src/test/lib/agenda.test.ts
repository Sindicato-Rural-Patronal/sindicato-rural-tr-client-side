import { describe, it, expect } from 'vitest'
import {
  addDays, bookingFormToBody, bookingToForm, emptyBookingForm, formatDateBr, isMultiDay, lastDayOf,
  timeRangeLabel, toWallIso, validateBookingForm, wallDate, wallTime, weekdayLong,
  type BookingFormValues,
} from '@/lib/agenda'
import type { RoomBooking } from '@/hooks/useRoomBookings'

const item = (id: string, start: string, end: string) => ({ id, startTime: start, endTime: end })

describe('datas', () => {
  it('addDays atravessa mês e ano bissexto', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('weekdayLong nomeia o dia da semana', () => {
    expect(weekdayLong('2026-10-05')).toBe('Segunda-feira')
    expect(weekdayLong('2026-10-11')).toBe('Domingo')
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

describe('último dia ocupado', () => {
  it('item de vários dias ocupa até o dia do término', () => {
    const longo = item('longo', '2026-10-05T19:00:00.000Z', '2026-10-07T11:00:00.000Z')
    expect(lastDayOf(longo)).toBe('2026-10-07')
    expect(isMultiDay(longo)).toBe(true)
  })

  it('terminar à 00:00 não ocupa o dia seguinte', () => {
    const meiaNoite = item('meia-noite', '2026-10-08T20:00:00.000Z', '2026-10-09T00:00:00.000Z')
    expect(lastDayOf(meiaNoite)).toBe('2026-10-08')
    expect(isMultiDay(meiaNoite)).toBe(false)
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
      id: 'b1', type: 'MEETING', title: 'REUNIAO', description: null,
      publicOnSite: false, publicDescription: null, roomId: 'r1', roomName: 'SALA 1',
      startTime: '2026-10-05T19:00:00.000Z', endTime: '2026-10-06T01:00:00.000Z',
      responsible: null, responsibleName: 'JOAO', seriesId: 's1',
    }
    expect(bookingToForm(booking)).toMatchObject({
      type: 'MEETING', date: '2026-10-05', startHour: '19:00', endHour: '01:00',
      multiDay: true, endDate: '2026-10-06', responsibleMode: 'name', responsibleName: 'JOAO', repeat: 'NONE',
    })
  })
})
