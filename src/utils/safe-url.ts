// Sanitiza uma URL controlada por dado (banner, parceiro, redes de instrutor)
// antes de virar href. Bloqueia javascript:/data:/outros esquemas (XSS/redirect);
// permite relativo, http(s), mailto, tel; assume https quando não há esquema.
export function safeUrl(url?: string | null): string {
  if (!url) return '#'
  const t = url.trim()
  if (!t) return '#'
  if (t.startsWith('/') || t.startsWith('#')) return t
  if (/^(https?:|mailto:|tel:)/i.test(t)) return t
  // qualquer outro esquema explícito (javascript:, data:, vbscript:…) → bloqueia
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return '#'
  // sem esquema (ex: "site.com.br/pagina") → assume https
  return `https://${t}`
}
