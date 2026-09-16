// Helpers puros do módulo de Convênios (sem React), compartilhados entre a
// página pública e o editor do admin.

/** "Plano Odonto Sul!" → "plano-odonto-sul". Mesmo formato que o backend aceita. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Texto livre → parágrafos, separados por uma ou mais linhas em branco. */
export function toParagraphs(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
}
