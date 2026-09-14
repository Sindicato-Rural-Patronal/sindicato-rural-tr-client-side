// Converte uma data de input (YYYY-MM-DD) para ISO string, ou null se vazia.
// Compartilhado pelos formulários de associado (usuarios/$id.tsx e usuarios/novo.tsx).
export function toIso(date: string): string | null {
  if (!date) return null
  return new Date(date).toISOString()
}
