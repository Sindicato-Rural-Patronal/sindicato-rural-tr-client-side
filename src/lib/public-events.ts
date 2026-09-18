import { formatDateBr, isMultiDay, lastDayOf, wallDate, weekdayLong, type AgendaItemLike } from '@/lib/agenda'

// Agrupamento e rótulos da página pública de eventos. Funções puras: leem só o
// ISO "de parede" que a API devolve, sem usar o fuso do navegador.

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** "2026-10" a partir do início do evento. */
export function monthKey(startTime: string): string {
  return startTime.slice(0, 7)
}

/** "outubro de 2026". */
export function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  return `${MONTHS[Number(month) - 1] ?? ''} de ${year}`
}

export type MonthGroup<T> = {
  key: string
  label: string
  events: T[]
}

/** Eventos por mês, na ordem em que vieram (a API já manda por início). */
export function groupByMonth<T extends { startTime: string }>(events: T[]): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = []
  for (const event of events) {
    const key = monthKey(event.startTime)
    const current = groups.at(-1)
    if (current?.key === key) current.events.push(event)
    else groups.push({ key, label: monthLabel(key), events: [event] })
  }
  return groups
}

/** "Segunda-feira, 05/10/2026"; em vários dias: "05/10/2026 a 07/10/2026". */
export function eventDateLabel(event: AgendaItemLike): string {
  const start = wallDate(event.startTime)
  if (isMultiDay(event)) return `${formatDateBr(start)} a ${formatDateBr(lastDayOf(event))}`
  return `${weekdayLong(start)}, ${formatDateBr(start)}`
}
