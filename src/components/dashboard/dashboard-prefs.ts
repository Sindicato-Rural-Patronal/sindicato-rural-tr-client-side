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

/**
 * O painel é uma grade de 4 COLUNAS no computador (1 no celular, onde todo
 * bloco ocupa a linha). A largura de um bloco é quantas dessas colunas ele
 * cobre — no mínimo 2, no máximo 4. O mínimo de 2 é de propósito: com blocos de
 * 1 coluna os cartões ficavam espremidos e de tamanhos muito diferentes uns dos
 * outros, que era o que atrapalhava tanto na tela quanto no código.
 */
export const COLUNAS = 4

export type DashboardSpan = 2 | 3 | 4

/** As três larguras, da menor para a maior (a alça do canto anda por elas). */
export const SPANS: DashboardSpan[] = [2, 3, 4]

/** Como a pessoa (e o leitor de tela) ouve cada largura. */
export const NOME_SPAN: Record<DashboardSpan, string> = {
  2: 'Meia linha',
  3: 'Três quartos da linha',
  4: 'Linha inteira',
}

/** Classe da grade para cada largura (Tailwind precisa do nome inteiro escrito). */
export const CLASSE_SPAN: Record<DashboardSpan, string> = {
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
}

function ehSpan(v: unknown): v is DashboardSpan {
  return v === 2 || v === 3 || v === 4
}

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
 * Largura de fábrica: agenda, números, ações, cotações e financeiro ocupam as 4
 * colunas; os três cartões pequenos ficam com 2 (cursos e cadastros incompletos
 * dividem uma linha, últimas ações fica na seguinte).
 */
export const DEFAULT_SIZES: Record<DashboardBlockId, DashboardSpan> = {
  acoes: 4,
  numeros: 4,
  cotacoes: 4,
  financeiro: 4,
  agenda: 4,
  cursos: 2,
  incompletos: 2,
  auditoria: 2,
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

function onlySizes(raw: unknown): Partial<Record<DashboardBlockId, DashboardSpan>> {
  // Só objeto simples entra: array, texto ou null viram "nenhuma largura salva".
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const out: Partial<Record<DashboardBlockId, DashboardSpan>> = {}
  for (const [id, size] of Object.entries(raw as Record<string, unknown>)) {
    if (!KNOWN.has(id)) continue
    // Quem personalizou o painel antes das 4 colunas tem 'full'/'half' gravado:
    // vira 4 e 2 em vez de cair no padrão e bagunçar o painel da pessoa.
    const span = size === 'full' ? 4 : size === 'half' ? 2 : size
    if (ehSpan(span)) out[id as DashboardBlockId] = span
  }
  return out
}

/** O que a tela usa depois de limpar o que veio do servidor. */
export type NormalizedPrefs = {
  hidden: DashboardBlockId[]
  order: DashboardBlockId[]
  sizes: Partial<Record<DashboardBlockId, DashboardSpan>>
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
export function blockSizes(prefs: DashboardPrefs | null | undefined): Record<DashboardBlockId, DashboardSpan> {
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
  sizes: Record<DashboardBlockId, DashboardSpan>,
  id: DashboardBlockId,
  size: DashboardSpan,
): Record<DashboardBlockId, DashboardSpan> {
  return { ...sizes, [id]: size }
}

// ─── desenho do painel ───────────────────────────────────────────────────────

export type DashboardCell = { id: DashboardBlockId; span: DashboardSpan }

/**
 * Os blocos na ordem em que a tela desenha, cada um já com quantas das 4
 * colunas ocupa. O painel é UMA grade só: o bloco ocupa as colunas dele MESMO
 * SOZINHO — deixa o resto da linha vazio em vez de esticar. Não existe
 * "empacotar em linhas"; juntar blocos lado a lado é a própria grade que faz.
 * Assim diminuir um bloco tem efeito na hora e ele nunca troca de pai no meio
 * de um arrasto (o que cancelaria o gesto).
 */
export function dashboardLayout(
  ids: readonly DashboardBlockId[],
  sizes: Record<DashboardBlockId, DashboardSpan>,
): DashboardCell[] {
  return ids.map(id => ({ id, span: sizes[id] ?? DEFAULT_SIZES[id] }))
}

// ─── rascunho do modo de organizar ───────────────────────────────────────────

/** O que o admin está mexendo antes de clicar em Salvar. */
export type DashboardDraft = {
  order: DashboardBlockId[]
  hidden: DashboardBlockId[]
  sizes: Record<DashboardBlockId, DashboardSpan>
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
  const sizes: Record<string, DashboardSpan> = {}
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
