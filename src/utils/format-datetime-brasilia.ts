// Instante gravado pela API (ISO com Z, como o `createdAt` de uma inscrição) em
// data e hora de Brasília, "dd/mm/aaaa hh:mm". Não usa o fuso do aparelho: quem
// abre o painel de outro fuso vê a mesma hora que o Sindicato (UTC-3, sem
// horário de verão desde 2019).
//
// Não serve para horário "de parede" (curso, reserva, notícia agendada): esses
// vêm como ISO com Z mas já são a hora de Brasília escrita — ver `lib/agenda.ts`.

const formatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  // h23: meia-noite é 00:00, não 24:00 (depende da versão do ICU).
  hourCycle: 'h23',
})

/** "2026-10-30T17:35:00.000Z" → "30/10/2026 14:35". Vazio se não houver data ou ela for inválida. */
export function formatDateTimeBrasilia(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const parts: Record<string, string> = {}
  for (const part of formatter.formatToParts(date)) parts[part.type] = part.value
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`
}
