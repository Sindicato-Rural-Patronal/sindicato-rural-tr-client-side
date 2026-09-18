// Calendário do painel: cursos + reservas de sala (eventos e reuniões) da agenda.
// Funções puras sobre datas "YYYY-MM-DD" e horários "de parede" (ver lib/agenda.ts).
import { addDays, lastDayOf, wallDate, wallTime, type ScheduleKind } from '@/lib/agenda'

export type BookingKind = Exclude<ScheduleKind, 'COURSE'>

/** O mínimo de um item de GET /admin/room-schedule usado pelo painel. */
export type ScheduleEntryLike = {
  kind: ScheduleKind
  startTime: string
  endTime: string
}

/** Só eventos e reuniões: os cursos do calendário vêm da lista de cursos. */
export function bookingsOnly<T extends ScheduleEntryLike>(items: T[]): (T & { kind: BookingKind })[] {
  return items.filter((item): item is T & { kind: BookingKind } => item.kind !== 'COURSE')
}

/** Dias entre `from` e `to` (inclusive) ocupados por alguma reserva. */
export function bookingDays(items: ScheduleEntryLike[], from: string, to: string): Set<string> {
  const days = new Set<string>()
  for (const item of bookingsOnly(items)) {
    const start = wallDate(item.startTime)
    const first = start < from ? from : start
    const lastOfItem = lastDayOf(item)
    const last = lastOfItem > to ? to : lastOfItem
    for (let day = first; day <= last; day = addDays(day, 1)) days.add(day)
  }
  return days
}

export type DayAgendaEntry<C, B> =
  | { kind: 'COURSE'; key: string; item: C }
  | { kind: BookingKind; key: string; item: B }

/**
 * Lista do dia selecionado: cursos e reservas juntos, pela hora de início.
 * Reserva que começou em outro dia conta como 00:00; curso sem horário vai para o fim.
 * Empate: cursos primeiro.
 */
export function dayAgenda<
  C extends { id: string; startTime: string | null },
  B extends ScheduleEntryLike & { id: string },
>(courses: C[], bookings: B[], ymd: string): DayAgendaEntry<C, B>[] {
  const entries: { sort: string; order: number; entry: DayAgendaEntry<C, B> }[] = []
  courses.forEach((course, i) => {
    entries.push({
      sort: course.startTime || '99:99',
      order: i,
      entry: { kind: 'COURSE', key: `course-${course.id}`, item: course },
    })
  })
  bookingsOnly(bookings)
    .filter(b => wallDate(b.startTime) <= ymd && lastDayOf(b) >= ymd)
    .forEach((booking, i) => {
      entries.push({
        sort: wallDate(booking.startTime) < ymd ? '00:00' : wallTime(booking.startTime),
        order: courses.length + i,
        entry: { kind: booking.kind, key: `booking-${booking.id}`, item: booking as B },
      })
    })
  return entries
    .sort((a, b) => a.sort.localeCompare(b.sort) || a.order - b.order)
    .map(e => e.entry)
}

/** "2 cursos · 1 reserva" (partes vazias somem; nada → null). */
export function dayCountLabel(courses: number, bookings: number): string | null {
  const parts = [
    courses > 0 ? `${courses} curso${courses > 1 ? 's' : ''}` : null,
    bookings > 0 ? `${bookings} reserva${bookings > 1 ? 's' : ''}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}
