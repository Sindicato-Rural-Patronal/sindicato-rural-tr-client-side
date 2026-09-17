// Tempo relativo curto, em português, para listas de avisos:
// "agora", "há 5 min", "há 2 h", "ontem", "12/09" (ou "12/09/2025" em outro ano).

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const two = (n: number) => String(n).padStart(2, '0')

export function relativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const diff = now.getTime() - date.getTime()
  // Menos de 1 minuto (ou relógio do computador um pouco atrasado).
  if (diff < MINUTE) return 'agora'
  if (diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`
  if (diff < DAY) return `há ${Math.floor(diff / HOUR)} h`

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (sameDay(date, yesterday)) return 'ontem'

  const dayMonth = `${two(date.getDate())}/${two(date.getMonth() + 1)}`
  return date.getFullYear() === now.getFullYear() ? dayMonth : `${dayMonth}/${date.getFullYear()}`
}

/** Data e hora completas (dica ao passar o mouse): "12/09/2026 14:30". */
export function fullDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()} ${two(date.getHours())}:${two(date.getMinutes())}`
}
