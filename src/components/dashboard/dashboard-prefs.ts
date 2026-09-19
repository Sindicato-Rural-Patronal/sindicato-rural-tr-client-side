import type { DashboardPrefs } from '@/hooks/useAdmin'

// Personalização do Painel Geral: cada admin escolhe quais blocos aparecem, em
// que ordem e com que largura. Funções puras — a tela só guarda o resultado em
// /admin/me/preferences (o backend substitui o valor inteiro, até 4 KB de JSON).

export type DashboardBlockId =
  | 'acoes'
  | 'numeros'
  | 'cotacoes'
  | 'financeiro'
  | 'agenda'
  | 'cursos'
  | 'incompletos'
  | 'auditoria'

/** Largura do bloco: a linha toda ou metade dela (no celular é sempre inteira). */
export type DashboardBlockSize = 'full' | 'half'

/** Nome de cada bloco no modo de organizar (é o que o admin lê). */
export const DASHBOARD_BLOCKS: { id: DashboardBlockId; label: string; hint: string }[] = [
  { id: 'acoes', label: 'Ações rápidas', hint: 'Botões de novo associado, novo curso, reserva e cotação' },
  { id: 'numeros', label: 'Números do sistema', hint: 'Cartões com o que precisa de atenção' },
  { id: 'cotacoes', label: 'Aviso das cotações', hint: 'Lembrete de lançar as cotações do dia' },
  { id: 'financeiro', label: 'Financeiro do mês', hint: 'Entradas, saídas e saldo do mês atual' },
  { id: 'agenda', label: 'Calendário e agenda das salas', hint: 'Cursos, eventos e reuniões' },
  { id: 'cursos', label: 'Cursos públicos', hint: 'Vagas e prazo de inscrição' },
  { id: 'incompletos', label: 'Cadastros incompletos', hint: 'Pessoas com cadastro pela metade' },
  { id: 'auditoria', label: 'Últimas ações', hint: 'O que foi feito no sistema há pouco' },
]

/** Ordem de fábrica (quem nunca personalizou vê exatamente isto). */
export const DEFAULT_ORDER: DashboardBlockId[] = DASHBOARD_BLOCKS.map(b => b.id)

/**
 * Largura de fábrica. É o desenho que o painel sempre teve: agenda, números,
 * ações, cotações e financeiro ocupam a linha; os três cartões pequenos dividem.
 */
export const DEFAULT_SIZES: Record<DashboardBlockId, DashboardBlockSize> = {
  acoes: 'full',
  numeros: 'full',
  cotacoes: 'full',
  financeiro: 'full',
  agenda: 'full',
  cursos: 'half',
  incompletos: 'half',
  auditoria: 'half',
}

const KNOWN = new Set<string>(DEFAULT_ORDER)

function onlyKnown(list: unknown): DashboardBlockId[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  return list.filter((id): id is DashboardBlockId => {
    if (typeof id !== 'string' || !KNOWN.has(id) || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function onlySizes(raw: unknown): Partial<Record<DashboardBlockId, DashboardBlockSize>> {
  // Só objeto simples entra: array, texto ou null viram "nenhuma largura salva".
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const out: Partial<Record<DashboardBlockId, DashboardBlockSize>> = {}
  for (const [id, size] of Object.entries(raw as Record<string, unknown>)) {
    if (!KNOWN.has(id)) continue
    if (size === 'full' || size === 'half') out[id as DashboardBlockId] = size
  }
  return out
}

/** O que a tela usa depois de limpar o que veio do servidor. */
export type NormalizedPrefs = {
  hidden: DashboardBlockId[]
  order: DashboardBlockId[]
  sizes: Partial<Record<DashboardBlockId, DashboardBlockSize>>
}

/**
 * Limpa o que veio do servidor: nome de bloco que não existe mais (versão
 * antiga do painel), largura inventada ou campo com o tipo errado são
 * ignorados em vez de sumir com a tela.
 */
export function normalizePrefs(raw: unknown): NormalizedPrefs {
  const prefs = (typeof raw === 'object' && raw !== null ? raw : {}) as DashboardPrefs
  return {
    hidden: onlyKnown(prefs.hidden),
    order: onlyKnown(prefs.order),
    sizes: onlySizes(prefs.sizes),
  }
}

/** Ordem completa: o que o admin ordenou primeiro, o resto na ordem de fábrica. */
export function blockOrder(prefs: DashboardPrefs | null | undefined): DashboardBlockId[] {
  const saved = normalizePrefs(prefs).order
  return [...saved, ...DEFAULT_ORDER.filter(id => !saved.includes(id))]
}

/** Largura de todos os blocos: a escolhida pelo admin ou a de fábrica. */
export function blockSizes(prefs: DashboardPrefs | null | undefined): Record<DashboardBlockId, DashboardBlockSize> {
  return { ...DEFAULT_SIZES, ...normalizePrefs(prefs).sizes }
}

/**
 * Blocos que a tela desenha: na ordem do admin, sem os escondidos e sem os que
 * ele não pode ver (permissão) ou que não têm nada para mostrar.
 */
export function visibleBlocks(
  prefs: DashboardPrefs | null | undefined,
  available: readonly DashboardBlockId[],
): DashboardBlockId[] {
  const hidden = new Set(normalizePrefs(prefs).hidden)
  const allowed = new Set(available)
  return blockOrder(prefs).filter(id => allowed.has(id) && !hidden.has(id))
}

/** Sobe (−1) ou desce (+1) um bloco na ordem. Nas pontas, não faz nada. */
export function moveBlock(order: DashboardBlockId[], id: DashboardBlockId, delta: number): DashboardBlockId[] {
  const from = order.indexOf(id)
  if (from < 0) return order
  return placeAt(order, from, from + delta)
}

/** Solta o bloco arrastado no lugar de outro (é o que o arrastar faz). */
export function dropBlock(
  order: DashboardBlockId[],
  id: DashboardBlockId,
  targetId: DashboardBlockId,
): DashboardBlockId[] {
  return placeAt(order, order.indexOf(id), order.indexOf(targetId))
}

function placeAt(order: DashboardBlockId[], from: number, to: number): DashboardBlockId[] {
  if (from < 0 || to < 0 || to >= order.length || from === to) return order
  const next = [...order]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

/** Marca/desmarca um bloco como escondido. */
export function toggleHidden(hidden: DashboardBlockId[], id: DashboardBlockId): DashboardBlockId[] {
  return hidden.includes(id) ? hidden.filter(h => h !== id) : [...hidden, id]
}

/** Troca a largura de um bloco. */
export function setBlockSize(
  sizes: Record<DashboardBlockId, DashboardBlockSize>,
  id: DashboardBlockId,
  size: DashboardBlockSize,
): Record<DashboardBlockId, DashboardBlockSize> {
  return { ...sizes, [id]: size }
}

// ─── linhas do painel ────────────────────────────────────────────────────────

export type DashboardCell = { id: DashboardBlockId; size: DashboardBlockSize }

/**
 * Monta as linhas do painel a partir da largura de cada bloco: "inteira" fica
 * sozinho na linha e dois "metade" seguidos dividem a mesma linha. Meia largura
 * sem vizinho de meia largura ocupa a linha toda (não deixa buraco na tela).
 */
export function buildRows(
  ids: readonly DashboardBlockId[],
  sizes: Record<DashboardBlockId, DashboardBlockSize>,
): DashboardCell[][] {
  const rows: DashboardCell[][] = []
  for (const id of ids) {
    const size = sizes[id] ?? DEFAULT_SIZES[id]
    const last = rows[rows.length - 1]
    if (size === 'half' && last && last.length === 1 && last[0].size === 'half') last.push({ id, size })
    else rows.push([{ id, size }])
  }
  return rows
}

// ─── rascunho do modo de organizar ───────────────────────────────────────────

/** O que o admin está mexendo antes de clicar em Salvar. */
export type DashboardDraft = {
  order: DashboardBlockId[]
  hidden: DashboardBlockId[]
  sizes: Record<DashboardBlockId, DashboardBlockSize>
}

/** Rascunho a partir do que está salvo (é o ponto de partida do modo de organizar). */
export function prefsDraft(prefs: DashboardPrefs | null | undefined): DashboardDraft {
  return { order: blockOrder(prefs), hidden: normalizePrefs(prefs).hidden, sizes: blockSizes(prefs) }
}

/** Rascunho do layout de fábrica ("Restaurar padrão"). */
export function defaultDraft(): DashboardDraft {
  return { order: [...DEFAULT_ORDER], hidden: [], sizes: { ...DEFAULT_SIZES } }
}

/** true quando nada mudou (o botão Salvar não precisa insistir). */
export function sameDraft(a: DashboardDraft, b: DashboardDraft): boolean {
  return (
    a.order.join() === b.order.join()
    && [...a.hidden].sort().join() === [...b.hidden].sort().join()
    && DEFAULT_ORDER.every(id => a.sizes[id] === b.sizes[id])
  )
}

/**
 * O objeto que vai para PATCH /admin/me/preferences. Grava sempre os três
 * campos por inteiro: o backend substitui o valor anterior, não mistura.
 */
export function prefsToSave(draft: DashboardDraft): DashboardPrefs {
  const sizes: Record<string, DashboardBlockSize> = {}
  for (const id of DEFAULT_ORDER) sizes[id] = draft.sizes[id] ?? DEFAULT_SIZES[id]
  return { order: [...draft.order], hidden: [...draft.hidden], sizes }
}

/** Blocos do modo de organizar: tudo que este admin pode ver, inclusive escondidos. */
export function editableBlocks(
  order: readonly DashboardBlockId[],
  available: readonly DashboardBlockId[],
): DashboardBlockId[] {
  const allowed = new Set(available)
  return order.filter(id => allowed.has(id))
}

/**
 * Devolve a ordem completa depois de mexer só nos blocos que o admin vê. O que
 * ele não pode ver (permissão) fica exatamente onde estava — senão "Subir"
 * trocaria de lugar com um bloco invisível e pareceria que nada aconteceu.
 */
export function applyOrder(
  full: readonly DashboardBlockId[],
  available: readonly DashboardBlockId[],
  reordered: readonly DashboardBlockId[],
): DashboardBlockId[] {
  const allowed = new Set(available)
  let i = 0
  return full.map(id => (allowed.has(id) ? reordered[i++] ?? id : id))
}
