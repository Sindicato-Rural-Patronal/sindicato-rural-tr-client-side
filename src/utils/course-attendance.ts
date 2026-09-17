// Presença nas inscrições de curso. Só as inscrições confirmadas entram na
// presença (o "Todos presentes" do backend também só mexe nelas).

type AttendanceItem = { confirmed: boolean; attended: boolean | null }

export type AttendanceCounts = { present: number; absent: number; unmarked: number }

/** Presentes, faltas e sem marcar entre as inscrições confirmadas. */
export function attendanceCounts(regs: AttendanceItem[]): AttendanceCounts {
  const counts: AttendanceCounts = { present: 0, absent: 0, unmarked: 0 }
  for (const r of regs) {
    if (!r.confirmed) continue
    if (r.attended === true) counts.present++
    else if (r.attended === false) counts.absent++
    else counts.unmarked++
  }
  return counts
}

/** "3 presentes · 1 falta · 2 sem marcar" */
export function attendanceSummary({ present, absent, unmarked }: AttendanceCounts): string {
  return [
    `${present} ${present === 1 ? 'presente' : 'presentes'}`,
    `${absent} ${absent === 1 ? 'falta' : 'faltas'}`,
    `${unmarked} sem marcar`,
  ].join(' · ')
}

/** Certificado: inscrição confirmada que não foi marcada como falta. */
export function canReceiveCertificate(reg: AttendanceItem): boolean {
  return reg.confirmed && reg.attended !== false
}

/**
 * Dias do curso ("YYYY-MM-DD"), do início ao fim, um por folha da lista de
 * presença. Data inválida ou fim antes do início → só o dia do início. Limite de
 * 60 dias para uma data digitada errado não gerar centenas de páginas.
 */
export function courseDays(startDate: string, endDate?: string | null, maxDays = 60): string[] {
  const start = startDate.slice(0, 10)
  const end = (endDate || startDate).slice(0, 10)
  const isDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`))
  if (!isDay(start)) return []
  if (!isDay(end) || end <= start) return [start]
  const days: string[] = []
  // Meio-dia UTC: somar dias nunca cruza a meia-noite por causa de fuso.
  for (let t = Date.parse(`${start}T12:00:00Z`); days.length < maxDays; t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10)
    if (day > end) break
    days.push(day)
  }
  return days
}

/** Ordem alfabética pelo nome, sem diferenciar acento e maiúscula. */
export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
}
