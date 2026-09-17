// Agenda e compartilhamento de um curso: arquivo .ics, link do Google Agenda e
// texto para o WhatsApp. Datas/horas do curso são a hora "de parede" de Brasília
// (UTC-3 fixo, sem horário de verão desde 2019).

import { fileSlug } from '@/utils/download'

export type CourseEvent = {
  id: string
  title: string
  /** "YYYY-MM-DD" */
  startDate: string
  /** "YYYY-MM-DD" */
  endDate: string
  /** "HH:MM" */
  startTime: string
  /** "HH:MM" */
  endTime: string
  location: string
  /** Endereço da página do curso. */
  url: string
}

const BRASILIA_OFFSET_HOURS = 3

function parseYmd(ymd: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

function parseHm(hm: string): [number, number] | null {
  const m = /^(\d{2}):(\d{2})/.exec(hm)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h < 24 && min < 60 ? [h, min] : null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Date (UTC) → "YYYYMMDDTHHMMSSZ". */
function utcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

/** Date (UTC) → "YYYYMMDD". */
function dateStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
}

/** "DD/MM/YYYY" a partir de "YYYY-MM-DD". */
function brDate(ymd: string): string {
  const p = parseYmd(ymd)
  return p ? `${pad(p[2])}/${pad(p[1])}/${p[0]}` : ymd
}

type EventTimes =
  | { allDay: false; start: Date; end: Date; days: number }
  | { allDay: true; start: Date; endExclusive: Date }

/**
 * Horários do evento. Curso de vários dias vira um evento diário repetido
 * (`days` vezes) no horário da aula. Sem horário válido (ou fim antes do
 * início), vira evento de dia inteiro do primeiro ao último dia.
 */
export function courseEventTimes(ev: CourseEvent): EventTimes | null {
  const sd = parseYmd(ev.startDate)
  if (!sd) return null
  const ed = parseYmd(ev.endDate) ?? sd
  const firstDay = Date.UTC(sd[0], sd[1] - 1, sd[2])
  const lastDay = Math.max(firstDay, Date.UTC(ed[0], ed[1] - 1, ed[2]))
  const days = Math.round((lastDay - firstDay) / 86_400_000) + 1

  const st = parseHm(ev.startTime)
  const et = parseHm(ev.endTime)
  if (!st || !et || et[0] * 60 + et[1] <= st[0] * 60 + st[1]) {
    return { allDay: true, start: new Date(firstDay), endExclusive: new Date(lastDay + 86_400_000) }
  }
  const at = ([h, min]: [number, number]) =>
    new Date(Date.UTC(sd[0], sd[1] - 1, sd[2], h + BRASILIA_OFFSET_HOURS, min))
  return { allDay: false, start: at(st), end: at(et), days }
}

/** Escapa texto para o .ics (RFC 5545). */
function icsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Quebra linhas longas em até 75 bytes, como pede o formato. */
function foldLine(line: string): string {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let current = ''
  let bytes = 0
  for (const ch of line) {
    const size = encoder.encode(ch).length
    const limit = parts.length === 0 ? 75 : 74 // continuação começa com um espaço
    if (bytes + size > limit) {
      parts.push(current)
      current = ''
      bytes = 0
    }
    current += ch
    bytes += size
  }
  parts.push(current)
  return parts.join('\r\n ')
}

/** Conteúdo do arquivo .ics do curso (null se as datas forem inválidas). */
export function buildCourseIcs(ev: CourseEvent, now: Date = new Date()): string | null {
  const times = courseEventTimes(ev)
  if (!times) return null
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sindicato Rural de Terra Roxa//Cursos//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:curso-${ev.id}@sindicatoruraltr`,
    `DTSTAMP:${utcStamp(now)}`,
    ...(times.allDay
      ? [`DTSTART;VALUE=DATE:${dateStamp(times.start)}`, `DTEND;VALUE=DATE:${dateStamp(times.endExclusive)}`]
      : [
          `DTSTART:${utcStamp(times.start)}`,
          `DTEND:${utcStamp(times.end)}`,
          ...(times.days > 1 ? [`RRULE:FREQ=DAILY;COUNT=${times.days}`] : []),
        ]),
    `SUMMARY:${icsText(ev.title)}`,
    ...(ev.location ? [`LOCATION:${icsText(ev.location)}`] : []),
    `DESCRIPTION:${icsText(ev.url)}`,
    `URL:${ev.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/** Link "adicionar ao Google Agenda" (null se as datas forem inválidas). */
export function googleCalendarUrl(ev: CourseEvent): string | null {
  const times = courseEventTimes(ev)
  if (!times) return null
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: times.allDay
      ? `${dateStamp(times.start)}/${dateStamp(times.endExclusive)}`
      : `${utcStamp(times.start)}/${utcStamp(times.end)}`,
    details: ev.url,
    location: ev.location,
    ctz: 'America/Sao_Paulo',
  })
  if (!times.allDay && times.days > 1) params.set('recur', `RRULE:FREQ=DAILY;COUNT=${times.days}`)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** "10/08/2026" ou "10/08/2026 a 12/08/2026". */
export function courseDaysLabel(startDate: string, endDate: string): string {
  const start = brDate(startDate)
  const end = brDate(endDate)
  return !endDate || start === end ? start : `${start} a ${end}`
}

/** Texto com os dados do curso (só fatos: nome, data, horário, local e link). */
export function courseShareText(ev: CourseEvent): string {
  const lines = [
    ev.title,
    `Data: ${courseDaysLabel(ev.startDate, ev.endDate)}`,
    ...(ev.startTime && ev.endTime ? [`Horário: ${ev.startTime} às ${ev.endTime}`] : []),
    ...(ev.location ? [`Local: ${ev.location}`] : []),
    ev.url,
  ]
  return lines.join('\n')
}

/** Link do WhatsApp que abre a conversa para a própria pessoa escolher com quem enviar. */
export function whatsappShareUrl(ev: CourseEvent): string {
  return `https://wa.me/?text=${encodeURIComponent(courseShareText(ev))}`
}

/** Nome do arquivo .ics: "curso-<titulo>.ics". */
export function icsFileName(title: string): string {
  return `curso-${fileSlug(title, 50) || 'agenda'}.ics`
}
