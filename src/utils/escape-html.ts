// Escapa um valor dinâmico antes de injetá-lo em HTML (dangerouslySetInnerHTML).
// Necessário porque o i18n roda com escapeValue:false (templates trazem <strong>);
// sem isso, um valor controlado por dado (ex: título de curso) vira XSS.
const MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => MAP[c])
}
