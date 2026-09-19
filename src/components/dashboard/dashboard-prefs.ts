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
export const DASHBOARD_BLOCKS: { id: DashboardBlockId; label: string }[] = [
  { id: 'acoes', label: 'Ações rápidas' },
  { id: 'numeros', label: 'Números do sistema' },
  { id: 'cotacoes', label: 'Aviso das cotações' },
  { id: 'financeiro', label: 'Financeiro do mês' },
  { id: 'agenda', label: 'Calendário e agenda das salas' },
  { id: 'cursos', label: 'Cursos públicos' },
  { id: 'incompletos', label: 'Cadastros incompletos' },
  { id: 'auditoria', label: 'Últimas ações' },
]

/** Ordem de fábrica (quem nunca personalizou vê exatamente isto). */
export const DEFAULT_ORDER: DashboardBlockId[] = DASHBOARD_BLOCKS.map(b => b.id)

/**
 * Largura de fábrica: agenda, números, ações, cotações e financeiro ocupam a
 * linha inteira; os três cartões pequenos ficam em meia linha (cursos e
 * cadastros incompletos dividem uma linha, últimas ações fica na seguinte).
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

/** Solta o bloco arrastado no lugar de outro (é o único jeito de mover). */
export function dropBlock(
  order: DashboardBlockId[],
  id: DashboardBlockId,
  targetId: DashboardBlockId,
): DashboardBlockId[] {
  const from = order.indexOf(id)
  const to = order.indexOf(targetId)
  if (from < 0 || to < 0 || from === to) return order
  const next = [...order]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

/** Tira o bloco do painel / traz de volta. */
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

// ─── desenho do painel ───────────────────────────────────────────────────────

/** Quantas das 2 colunas o bloco ocupa no computador. */
export type DashboardSpan = 1 | 2

export type DashboardCell = { id: DashboardBlockId; size: DashboardBlockSize; span: DashboardSpan }

/** Colunas que a largura ocupa: metade = 1 coluna, inteira = as 2. */
export function blockSpan(size: DashboardBlockSize): DashboardSpan {
  return size === 'full' ? 2 : 1
}

/**
 * Os blocos na ordem em que a tela desenha, cada um já com quantas colunas
 * ocupa. O painel é UMA grade de 2 colunas (no celular, 1): quem está em
 * "metade" ocupa uma coluna MESMO SOZINHO — deixa o espaço do lado vazio em vez
 * de esticar — e quem está em "inteira" ocupa as duas. Não existe mais
 * "empacotar em linhas": juntar dois blocos de meia largura lado a lado é a
 * própria grade que faz. Assim diminuir um bloco tem efeito na hora, e o bloco
 * nunca troca de pai no meio de um arrasto (o que cancelaria o gesto).
 */
export function dashboardLayout(
  ids: readonly DashboardBlockId[],
  sizes: Record<DashboardBlockId, DashboardBlockSize>,
): DashboardCell[] {
  return ids.map(id => {
    const size = sizes[id] ?? DEFAULT_SIZES[id]
    return { id, size, span: blockSpan(size) }
  })
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
 * Devolve a ordem completa depois de mexer só nos blocos que estão na tela. O
 * que não está (sem permissão, ou removido do painel) fica exatamente onde
 * estava — senão arrastar trocaria de lugar com um bloco invisível e pareceria
 * que nada aconteceu.
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
