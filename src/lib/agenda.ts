import type { RoomBooking, RoomBookingBody, RoomScheduleItem } from '@/hooks/useRoomBookings'

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

/** Plural de cada tipo ("Reunião" + "s" daria "Reuniãos"). */
export const KIND_LABEL_PLURAL: Record<ScheduleKind, string> = {
  COURSE: 'Cursos',
  EVENT: 'Eventos',
  MEETING: 'Reuniões',
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

export function emptyBookingForm(date = '', roomId = '', startHour = '', endHour = ''): BookingFormValues {
  return {
    type: 'EVENT',
    title: '',
    roomId,
    date,
    startHour,
    endHour,
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

// ── Visão do dia / da semana ────────────────────────────────────────────────

/** Como a agenda está sendo vista. */
export type AgendaView = 'day' | 'week'

/** Filtro de tipo da agenda ("ALL" = todos). */
export type AgendaTypeFilter = 'ALL' | ScheduleKind

/** Segunda-feira da semana de `ymd` (a semana vai de segunda a domingo). */
export function startOfWeek(ymd: string): string {
  const day = weekdayOf(ymd)
  // Domingo (0) fecha a semana que começou na segunda anterior.
  return addDays(ymd, day === 0 ? -6 : 1 - day)
}

/** Os 7 dias da semana de `ymd`, de segunda a domingo. */
export function weekDays(ymd: string): string[] {
  const first = startOfWeek(ymd)
  return Array.from({ length: 7 }, (_, i) => addDays(first, i))
}

/** Período que está na tela: só o dia, ou a semana inteira. */
export function visibleRange(ymd: string, view: AgendaView): { from: string; to: string } {
  if (view === 'day') return { from: ymd, to: ymd }
  const days = weekDays(ymd)
  return { from: days[0], to: days[6] }
}

/** "05/10/2026" quando é um dia só; "05/10/2026 a 11/10/2026" no período. */
export function rangeLabel(from: string, to: string): string {
  return from === to ? formatDateBr(from) : `${formatDateBr(from)} a ${formatDateBr(to)}`
}

/** "2 cursos · 1 reserva" (a parte vazia some; nada marcado → null). */
export function agendaCountLabel(courses: number, bookings: number): string | null {
  const parts = [
    courses > 0 ? `${courses} curso${courses > 1 ? 's' : ''}` : null,
    bookings > 0 ? `${bookings} reserva${bookings > 1 ? 's' : ''}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

/** Nome do arquivo do PDF da agenda (sem extensão). */
export function agendaFileName(from: string, to: string): string {
  return from === to ? `agenda-${from}` : `agenda-${from}-a-${to}`
}

// ── Itens da agenda (cursos + reservas juntos) ──────────────────────────────

/** Curso ou reserva já no mesmo formato, do jeito que a tela mostra. */
export type AgendaEntry = {
  key: string
  kind: ScheduleKind
  id: string
  title: string
  roomId: string
  roomName: string
  startTime: string
  endTime: string
  publicOnSite: boolean
  /** Responsável da reserva (pessoa do cadastro ou nome digitado); curso não tem. */
  responsible: string | null
}

/** Curso da agenda das salas (GET /admin/room-schedule, kind COURSE). */
export function courseEntry(item: RoomScheduleItem): AgendaEntry {
  return {
    key: `course-${item.id}`,
    kind: 'COURSE',
    id: item.id,
    title: item.title,
    roomId: item.roomId,
    roomName: item.roomName,
    startTime: item.startTime,
    endTime: item.endTime,
    publicOnSite: false,
    responsible: null,
  }
}

/** Reserva (GET /admin/room-bookings) com o responsável já resolvido. */
export function bookingEntry(booking: RoomBooking): AgendaEntry {
  return {
    key: `booking-${booking.id}`,
    kind: booking.type,
    id: booking.id,
    title: booking.title,
    roomId: booking.roomId,
    roomName: booking.roomName,
    startTime: booking.startTime,
    endTime: booking.endTime,
    publicOnSite: booking.publicOnSite,
    responsible: booking.responsible?.name ?? booking.responsibleName ?? null,
  }
}

/** Cursos e reservas do período numa lista só. */
export function agendaEntries(courses: RoomScheduleItem[], bookings: RoomBooking[]): AgendaEntry[] {
  return [
    ...courses.filter(c => c.kind === 'COURSE').map(courseEntry),
    ...bookings.map(bookingEntry),
  ]
}

const KIND_ORDER: Record<ScheduleKind, number> = { COURSE: 0, EVENT: 1, MEETING: 2 }

/** Hora que ordena o item no dia: o que começou antes conta como 00:00. */
function sortHour(item: AgendaEntry, ymd: string): string {
  return wallDate(item.startTime) < ymd ? '00:00' : wallTime(item.startTime)
}

/** Itens que ocupam o dia (inclusive os que começaram antes), em ordem de horário. */
export function itemsOfDay(items: AgendaEntry[], ymd: string): AgendaEntry[] {
  return items
    .filter(item => wallDate(item.startTime) <= ymd && lastDayOf(item) >= ymd)
    .sort((a, b) =>
      sortHour(a, ymd).localeCompare(sortHour(b, ymd))
      || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
      || a.title.localeCompare(b.title, 'pt-BR'))
}

/**
 * Dias entre `from` e `to` ocupados por algum item — a MESMA regra para curso e
 * reserva (ver `lastDayOf`: terminar à 00:00 não ocupa o dia seguinte). É o que
 * marca as bolinhas do calendário, para a bolinha e a lista nunca discordarem.
 */
export function occupiedDays(items: AgendaItemLike[], from: string, to: string): Set<string> {
  const days = new Set<string>()
  for (const item of items) {
    const start = wallDate(item.startTime)
    const first = start < from ? from : start
    const itemLast = lastDayOf(item)
    const last = itemLast > to ? to : itemLast
    for (let day = first; day <= last; day = addDays(day, 1)) days.add(day)
  }
  return days
}

/** Os itens de cada dia do período (dia sem nada vem com a lista vazia). */
export function itemsByDay(items: AgendaEntry[], days: string[]): { date: string; items: AgendaEntry[] }[] {
  return days.map(date => ({ date, items: itemsOfDay(items, date) }))
}

// ── Faixa de ocupação das salas ─────────────────────────────────────────────

/** A faixa vai das 07:00 às 22:00 — o horário em que as salas são usadas. */
export const OCCUPANCY_START_MIN = 7 * 60
export const OCCUPANCY_END_MIN = 22 * 60
const OCCUPANCY_SPAN = OCCUPANCY_END_MIN - OCCUPANCY_START_MIN
const DAY_MIN = 24 * 60

/** "08:30" → 510 minutos. */
export function wallMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':')
  return Number(h) * 60 + Number(m)
}

/** 510 → "08:30". */
export function minutesToWall(minutes: number): string {
  const clamped = Math.max(0, Math.min(DAY_MIN, Math.round(minutes)))
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

/**
 * Horário escrito de um item no dia, do jeito que se fala: "08:00 às 12:00".
 * Quando o item atravessa a virada do dia o rótulo mostra as datas e o aviso
 * explica a relação com o dia que está na tela — a pessoa não precisa deduzir
 * nada olhando o tamanho da barra.
 */
export function occupancyTimeLabel(item: AgendaItemLike, ymd: string): { time: string; note: string | null } {
  const startDay = wallDate(item.startTime)
  const start = wallTime(item.startTime)
  const end = wallTime(item.endTime)
  const before = startDay < ymd
  const after = lastDayOf(item) > ymd
  if (!before && !after) return { time: `${start} às ${end}`, note: null }
  const time = `${formatDayMonth(startDay)} ${start} às ${formatDayMonth(wallDate(item.endTime))} ${end}`
  if (before && after) return { time, note: 'Ocupa o dia inteiro' }
  return { time, note: before ? 'Começou antes deste dia' : 'Termina em outro dia' }
}

/** Onde o horário do bloco cabe escrito: dentro da barra, ao lado dela ou em lugar nenhum. */
export type OccupancyLabelPlacement = 'inside' | 'after' | 'before' | 'none'

/**
 * Quanto da faixa (em %) um texto de `chars` letras precisa para caber escrito.
 * A faixa mais estreita em que o gráfico aparece tem uns 500px, então 1% ≈ 5px;
 * cada letra do miudinho da barra mede uns 5,5px e ainda sobra um respiro de
 * 12px. Conta pelo TAMANHO do texto porque "08:00 às 12:00" e "23/09 20:00 às
 * 24/09 10:00" não pedem o mesmo espaço — o segundo, com data, é quase o dobro.
 */
export function occupancyLabelMinWidth(chars: number): number {
  return (chars * 5.5 + 12) / 5
}

/** Bloco ocupado na faixa de uma sala (medidas em % da faixa). */
export type OccupancyBlock = {
  key: string
  kind: ScheduleKind
  id: string
  title: string
  left: number
  width: number
  /** "08:00 às 12:00" — o horário escrito, que a barra mostra sempre que couber. */
  time: string
  /** Aviso de virada de dia ("Começou antes deste dia"), quando houver. */
  note: string | null
  /** "08:00 às 12:00 · MANEJO DE PASTAGEM" (o que aparece ao passar o dedo/mouse). */
  label: string
  /** Começou antes das 07:00 (ou em outro dia) / termina depois das 22:00. */
  cutBefore: boolean
  cutAfter: boolean
  /** Linha dentro da sala, para quando dois itens se sobrepõem. */
  lane: number
  /** Espaço livre antes e depois do bloco na MESMA linha (em % da faixa). */
  gapBefore: number
  gapAfter: number
  /** Onde escrever o horário e quanto espaço ele tem (em % da faixa). */
  labelPlacement: OccupancyLabelPlacement
  labelSpace: number
}

/** Uma linha escrita da ocupação da sala: é o que a lista do celular mostra. */
export type OccupancyLine = {
  key: string
  kind: ScheduleKind
  title: string
  /** "08:00 às 12:00". */
  time: string
  note: string | null
  /** Fora das 07:00–22:00: não cabe no gráfico, mas continua na lista. */
  outside: boolean
}

export type OccupancyRow = {
  roomId: string
  roomName: string
  blocks: OccupancyBlock[]
  /** Quantas linhas a sala precisa (1 quando nada se sobrepõe). */
  lanes: number
  /** Itens do dia que ficam fora das 07:00–22:00 (só entram no aviso). */
  outside: AgendaEntry[]
  /** TODOS os itens do dia na sala, com o horário escrito e em ordem. */
  lines: OccupancyLine[]
}

/**
 * Onde escrever o horário de cada bloco de UMA linha da sala: dentro da barra,
 * no vazio depois dela, no vazio antes dela — ou em lugar nenhum, e aí a tela
 * escreve o horário embaixo da sala. Um mesmo vazio interessa aos dois vizinhos,
 * então quando os dois precisam dele cada um fica com metade e os rótulos nunca
 * caem um por cima do outro.
 */
function placeLaneLabels(lane: OccupancyBlock[]): void {
  const precisa = lane.map(block => block.width < occupancyLabelMinWidth(block.time.length))
  lane.forEach((block, i) => {
    if (!precisa[i]) {
      block.labelPlacement = 'inside'
      block.labelSpace = block.width
      return
    }
    const min = occupancyLabelMinWidth(block.time.length)
    const depois = block.gapAfter / (precisa[i + 1] ? 2 : 1)
    const antes = block.gapBefore / (precisa[i - 1] ? 2 : 1)
    if (depois >= min) {
      block.labelPlacement = 'after'
      block.labelSpace = depois
    } else if (antes >= min) {
      block.labelPlacement = 'before'
      block.labelSpace = antes
    } else {
      block.labelPlacement = 'none'
      block.labelSpace = 0
    }
  })
}

/** Minutos ocupados pelo item no dia (item de outro dia entra/sai pelas pontas). */
function spanOfDay(item: AgendaEntry, ymd: string): { start: number; end: number } {
  const startsBefore = wallDate(item.startTime) < ymd
  const endsAfter = lastDayOf(item) > ymd
  const start = startsBefore ? 0 : wallMinutes(wallTime(item.startTime))
  let end = endsAfter ? DAY_MIN : wallMinutes(wallTime(item.endTime))
  // Termina à meia-noite: ocupa até o fim do dia.
  if (end <= start) end = DAY_MIN
  return { start, end }
}

/** Uma faixa por sala com os blocos ocupados do dia. */
export function occupancyRows(
  items: AgendaEntry[],
  rooms: { id: string; name: string }[],
  ymd: string,
): OccupancyRow[] {
  const rows = new Map<string, OccupancyRow>()
  const newRow = (roomId: string, roomName: string): OccupancyRow =>
    ({ roomId, roomName, blocks: [], lanes: 1, outside: [], lines: [] })
  for (const room of rooms) rows.set(room.id, newRow(room.id, room.name))
  for (const item of itemsOfDay(items, ymd)) {
    let row = rows.get(item.roomId)
    if (!row) {
      // Sala fora da lista (ou que ainda não carregou): mostra a linha assim mesmo.
      row = newRow(item.roomId, item.roomName)
      rows.set(item.roomId, row)
    }
    const { start, end } = spanOfDay(item, ymd)
    const from = Math.max(start, OCCUPANCY_START_MIN)
    const to = Math.min(end, OCCUPANCY_END_MIN)
    const { time, note } = occupancyTimeLabel(item, ymd)
    const outside = to <= from
    // A lista escrita leva TUDO o que ocupa a sala no dia, inclusive o que não
    // cabe no gráfico — é ela que o celular mostra.
    row.lines.push({ key: item.key, kind: item.kind, title: item.title, time, note, outside })
    if (outside) {
      row.outside.push(item)
      continue
    }
    const left = ((from - OCCUPANCY_START_MIN) / OCCUPANCY_SPAN) * 100
    // Reserva curta ganha uma largura mínima para continuar visível.
    const width = Math.min(Math.max(((to - from) / OCCUPANCY_SPAN) * 100, 2), 100 - left)
    row.blocks.push({
      key: item.key,
      kind: item.kind,
      id: item.id,
      title: item.title,
      left,
      width,
      time,
      note,
      label: `${time} · ${item.title}`,
      cutBefore: start < OCCUPANCY_START_MIN,
      cutAfter: end > OCCUPANCY_END_MIN,
      lane: 0,
      gapBefore: left,
      gapAfter: 100 - (left + width),
      labelPlacement: 'none',
      labelSpace: 0,
    })
  }
  for (const row of rows.values()) {
    // Sobreposição (curso e evento na mesma sala): cada um na sua linha.
    const laneEnds: number[] = []
    // Os blocos de cada linha, em ordem de horário — é assim que se mede o
    // espaço vazio entre um e outro (o de trás é sempre o anterior).
    const lanes: OccupancyBlock[][] = []
    for (const block of row.blocks) {
      let lane = laneEnds.findIndex(end => end <= block.left + 0.001)
      if (lane === -1) lane = laneEnds.length
      laneEnds[lane] = block.left + block.width
      block.lane = lane
      const fila = lanes[lane] ?? (lanes[lane] = [])
      const prev = fila.at(-1)
      if (prev) {
        prev.gapAfter = block.left - (prev.left + prev.width)
        block.gapBefore = prev.gapAfter
      }
      fila.push(block)
    }
    for (const fila of lanes) placeLaneLabels(fila)
    row.lanes = Math.max(1, laneEnds.length)
  }
  return [...rows.values()]
}

/** Horário aproximado de um clique na faixa (0 = 07:00, 1 = 22:00), de meia em meia hora. */
export function hourAtFraction(fraction: number, stepMinutes = 30): string {
  const raw = OCCUPANCY_START_MIN + Math.max(0, Math.min(1, fraction)) * OCCUPANCY_SPAN
  const stepped = Math.round(raw / stepMinutes) * stepMinutes
  // Sempre sobra pelo menos uma hora até o fim da faixa.
  return minutesToWall(Math.max(OCCUPANCY_START_MIN, Math.min(stepped, OCCUPANCY_END_MIN - 60)))
}

/**
 * Hora sugerida para marcar nesta sala: logo depois do último item do dia,
 * arredondada para cima de meia em meia hora (sala vazia começa às 07:00). É o
 * que o botão "Marcar reserva nesta sala" da lista usa, já que ali não dá para
 * apontar a hora com o dedo como se faz na faixa.
 */
export function suggestedFreeHour(row: OccupancyRow): string {
  const endPct = row.blocks.reduce((max, block) => Math.max(max, block.left + block.width), 0)
  const minutes = OCCUPANCY_START_MIN + (endPct / 100) * OCCUPANCY_SPAN
  const stepped = Math.ceil(minutes / 30) * 30
  // Sempre sobra pelo menos uma hora até o fim da faixa.
  return minutesToWall(Math.max(OCCUPANCY_START_MIN, Math.min(stepped, OCCUPANCY_END_MIN - 60)))
}

/** Uma hora depois de "HH:MM" (término sugerido da nova reserva). */
export function plusOneHour(hhmm: string): string {
  return minutesToWall(Math.min(wallMinutes(hhmm) + 60, DAY_MIN))
}

/** Marca de hora da régua da faixa. */
export type OccupancyTick = {
  minutes: number
  left: number
  label: string
  /** Hora "cheia" de 3 em 3 (07:00, 10:00, 13:00…): linha mais forte e rótulo sempre visível. */
  major: boolean
}

/** Marcas de hora da faixa (07:00, 08:00 … 22:00). */
export function occupancyTicks(everyMinutes = 60): OccupancyTick[] {
  const ticks: OccupancyTick[] = []
  for (let m = OCCUPANCY_START_MIN; m <= OCCUPANCY_END_MIN; m += everyMinutes) {
    ticks.push({
      minutes: m,
      left: ((m - OCCUPANCY_START_MIN) / OCCUPANCY_SPAN) * 100,
      label: minutesToWall(m),
      // De 3 em 3 horas a partir das 07:00; o fim da faixa também fica em
      // destaque, para a régua nunca terminar numa marca apagada.
      major: (m - OCCUPANCY_START_MIN) % 180 === 0 || m === OCCUPANCY_END_MIN,
    })
  }
  return ticks
}
