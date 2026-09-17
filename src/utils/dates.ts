// Converte uma data de input (YYYY-MM-DD) para ISO string, ou null se vazia.
// Compartilhado pelos formulários de associado (usuarios/$id.tsx e usuarios/novo.tsx).
export function toIso(date: string): string | null {
  if (!date) return null
  return new Date(date).toISOString()
}

/** Date → "YYYY-MM-DD" pelo fuso local (toISOString usa UTC e vira o dia à noite). */
export function toYmd(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

/** Hoje em "YYYY-MM-DD", no fuso local. */
export function todayYmd(): string {
  return toYmd(new Date())
}
