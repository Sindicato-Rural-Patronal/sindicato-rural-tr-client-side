import type { RoomBooking, RoomBookingBody } from '@/hooks/useRoomBookings'

// Agenda das salas (cursos, eventos e reuniões), hoje dentro do Painel Geral.
// Funções puras: datas "YYYY-MM-DD" e horários "de parede" — igual aos cursos,
// a API guarda 08:00 como "…T08:00:00.000Z" e a tela fatia o ISO. Nada aqui
// usa o fuso do navegador.

export type ScheduleKind = 'COURSE' | 'EVENT' | 'MEETING'
export type BookingType = 'EVENT' | 'MEETING'

/** O mínimo que a agenda precisa de um item (curso ou reserva). */
export type AgendaItemLike = { startTime: string; endTime: string }

export const KIND_LABEL: Record<ScheduleKind, string> = {
  COURSE: 'Curso',
  EVENT: 'Evento',
  MEETING: 'Reunião',
}

/** Selo do tipo (sempre com o texto — a cor não é a única pista). */
export const KIND_BADGE_CLASS: Record<ScheduleKind, string> = {
  COURSE: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900',
  EVENT: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-900',
  MEETING: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900',
}

/** Bolinha de cor dos filtros por tipo. */
export const KIND_DOT_CLASS: Record<ScheduleKind, string> = {
  COURSE: 'bg-sky-500',
  EVENT: 'bg-violet-500',
  MEETING: 'bg-emerald-500',
}

const WEEKDAYS_LONG = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function parseYmdUtc(ymd: string): Date | null {
  const m = YMD_RE.exec(ymd)
  if (!m) return null
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return date.toISOString().slice(0, 10) === ymd ? date : null
}

export function isValidYmd(value: unknown): value is string {
  return typeof value === 'string' && parseYmdUtc(value) !== null
}

/** Soma dias a uma data "YYYY-MM-DD" (conta em UTC, sem horário de verão). */
export function addDays(ymd: string, days: number): string {
  const date = parseYmdUtc(ymd)
  if (!date) return ymd
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** 0 = domingo … 6 = sábado. */
function weekdayOf(ymd: string): number {
  return parseYmdUtc(ymd)?.getUTCDay() ?? 0
}

/** "dd/mm/aaaa". */
export function formatDateBr(ymd: string): string {
  const m = YMD_RE.exec(ymd.slice(0, 10))
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** "dd/mm". */
function formatDayMonth(ymd: string): string {
  return formatDateBr(ymd).slice(0, 5)
}

export function weekdayLong(ymd: string): string {
  return WEEKDAYS_LONG[weekdayOf(ymd)]
}

// ── Horário "de parede" ─────────────────────────────────────────────────────

/** Dia do ISO da API ("2026-10-05T08:00:00.000Z" → "2026-10-05"). */
export function wallDate(iso: string): string {
  return iso.slice(0, 10)
}

/** Hora do ISO da API ("2026-10-05T08:00:00.000Z" → "08:00"). */
export function wallTime(iso: string): string {
  return iso.slice(11, 16)
}

/** Data + hora digitadas → ISO que a API espera (mesma regra do formulário de curso). */
export function toWallIso(date: string, hour: string): string {
  return `${date}T${hour || '00:00'}:00.000Z`
}

/**
 * Último dia ocupado. Terminar exatamente à 00:00 não ocupa o dia seguinte
 * (evento das 20:00 até 00:00 fica só no primeiro dia).
 */
export function lastDayOf(item: AgendaItemLike): string {
  const start = wallDate(item.startTime)
  const end = wallDate(item.endTime)
  if (end > start && wallTime(item.endTime) === '00:00') return addDays(end, -1)
  return end < start ? start : end
}

export function isMultiDay(item: AgendaItemLike): boolean {
  return lastDayOf(item) > wallDate(item.startTime)
}

/** "08:00–12:00"; em vários dias: "05/10 08:00 – 07/10 12:00". */
export function timeRangeLabel(item: AgendaItemLike): string {
  const start = wallTime(item.startTime)
  const end = wallTime(item.endTime)
  if (!isMultiDay(item)) return `${start}–${end}`
  return `${formatDayMonth(wallDate(item.startTime))} ${start} – ${formatDayMonth(wallDate(item.endTime))} ${end}`
}

// ── Formulário de reserva ───────────────────────────────────────────────────

export type RepeatOption = 'NONE' | 'WEEKLY' | 'MONTHLY'

export type BookingFormValues = {
  type: BookingType
  title: string
  roomId: string
  date: string
  startHour: string
  endHour: string
  multiDay: boolean
  endDate: string
  responsibleMode: 'person' | 'name'
  responsible: { id: string; name: string } | null
  responsibleName: string
  description: string
  /** Mostrar o evento na página pública /eventos (nunca vale para reunião). */
  publicOnSite: boolean
  /** Texto do evento no site (o campo Descrição é só para a equipe). */
  publicDescription: string
  repeat: RepeatOption
  repeatUntil: string
}

export type BookingFormErrors = Partial<Record<
  'title' | 'roomId' | 'date' | 'startHour' | 'endHour' | 'endDate' | 'repeatUntil',
  string
>>

const HOUR_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function emptyBookingForm(date = '', roomId = ''): BookingFormValues {
  return {
    type: 'EVENT',
    title: '',
    roomId,
    date,
    startHour: '',
    endHour: '',
    multiDay: false,
    endDate: '',
    responsibleMode: 'person',
    responsible: null,
    responsibleName: '',
    description: '',
    publicOnSite: false,
    publicDescription: '',
    repeat: 'NONE',
    repeatUntil: '',
  }
}

/** Fim efetivo do formulário (outro dia só quando marcado). */
export function formEndDate(values: BookingFormValues): string {
  return values.multiDay ? values.endDate : values.date
}

export function validateBookingForm(values: BookingFormValues, { creating }: { creating: boolean }): BookingFormErrors {
  const errors: BookingFormErrors = {}
  if (!values.title.trim()) errors.title = 'Informe o título.'
  if (!values.roomId) errors.roomId = 'Escolha a sala.'
  if (!isValidYmd(values.date)) errors.date = 'Informe a data.'
  if (!HOUR_RE.test(values.startHour)) errors.startHour = 'Informe a hora de início.'
  if (!HOUR_RE.test(values.endHour)) errors.endHour = 'Informe a hora de término.'
  if (values.multiDay) {
    if (!isValidYmd(values.endDate)) errors.endDate = 'Informe a data de término.'
    else if (isValidYmd(values.date) && values.endDate <= values.date) {
      errors.endDate = 'A data de término precisa ser depois da data de início.'
    }
  }
  if (!errors.date && !errors.startHour && !errors.endHour && !errors.endDate) {
    const start = `${values.date}T${values.startHour}`
    const end = `${formEndDate(values)}T${values.endHour}`
    if (end <= start) errors.endHour = 'O término precisa ser depois do início.'
  }
  if (creating && values.repeat !== 'NONE') {
    if (!isValidYmd(values.repeatUntil)) errors.repeatUntil = 'Informe até quando repetir.'
    else if (isValidYmd(values.date) && values.repeatUntil <= values.date) {
      errors.repeatUntil = 'A data final da repetição precisa ser depois da primeira data.'
    }
  }
  return errors
}

/** Reserva da API → formulário de edição (repetição só existe ao criar). */
export function bookingToForm(booking: RoomBooking): BookingFormValues {
  const date = wallDate(booking.startTime)
  const endDate = wallDate(booking.endTime)
  const freeName = !booking.responsible && !!booking.responsibleName
  return {
    type: booking.type,
    title: booking.title,
    roomId: booking.roomId,
    date,
    startHour: wallTime(booking.startTime),
    endHour: wallTime(booking.endTime),
    multiDay: endDate !== date,
    endDate: endDate !== date ? endDate : '',
    responsibleMode: freeName ? 'name' : 'person',
    responsible: booking.responsible ? { id: booking.responsible.id, name: booking.responsible.name } : null,
    responsibleName: freeName ? (booking.responsibleName ?? '') : '',
    description: booking.description ?? '',
    publicOnSite: booking.publicOnSite,
    publicDescription: booking.publicDescription ?? '',
    repeat: 'NONE',
    repeatUntil: '',
  }
}

/**
 * Formulário → corpo do POST/PATCH. Ao criar, campos vazios ficam de fora; ao
 * editar vão como null para apagar o que havia. Responsável é a pessoa do
 * cadastro OU o nome digitado, nunca os dois.
 */
export function bookingFormToBody(values: BookingFormValues, { creating }: { creating: boolean }): RoomBookingBody {
  const body: RoomBookingBody = {
    type: values.type,
    title: values.title.trim(),
    roomId: values.roomId,
    startTime: toWallIso(values.date, values.startHour),
    endTime: toWallIso(formEndDate(values), values.endHour),
  }
  const description = values.description.trim() || null
  // Só evento vai para o site; reunião nunca (o backend também garante).
  const publicOnSite = values.type === 'EVENT' && values.publicOnSite
  const publicDescription = publicOnSite ? (values.publicDescription.trim() || null) : null
  const personId = values.responsibleMode === 'person' ? (values.responsible?.id ?? null) : null
  const freeName = values.responsibleMode === 'name' ? (values.responsibleName.trim() || null) : null
  if (creating) {
    if (description) body.description = description
    if (publicOnSite) {
      body.publicOnSite = true
      if (publicDescription) body.publicDescription = publicDescription
    }
    if (personId) body.responsibleUserDataId = personId
    if (freeName) body.responsibleName = freeName
    if (values.repeat !== 'NONE') body.repeat = { frequency: values.repeat, until: values.repeatUntil }
  } else {
    body.description = description
    body.publicOnSite = publicOnSite
    body.publicDescription = publicDescription
    body.responsibleUserDataId = personId
    body.responsibleName = freeName
  }
  return body
}
