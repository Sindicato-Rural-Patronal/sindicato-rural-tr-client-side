import type { DashboardPrefs } from '@/hooks/useAdmin'

// Personalização do Painel Geral: cada admin escolhe quais blocos aparecem e em
// que ordem. Funções puras — a tela só guarda o resultado em /admin/me/preferences.

export type DashboardBlockId =
  | 'acoes'
  | 'numeros'
  | 'cotacoes'
  | 'financeiro'
  | 'agenda'
  | 'cursos'
  | 'incompletos'
  | 'auditoria'

/** Nome de cada bloco na janela "Personalizar" (é o que o admin lê). */
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

/**
 * Limpa o que veio do servidor: nomes de bloco que não existem mais (versão
 * antiga do painel) são ignorados em vez de sumir com a tela.
 */
export function normalizePrefs(raw: unknown): DashboardPrefs {
  const prefs = (raw ?? {}) as DashboardPrefs
  return { hidden: onlyKnown(prefs.hidden), order: onlyKnown(prefs.order) }
}

/** Ordem completa: o que o admin ordenou primeiro, o resto na ordem de fábrica. */
export function blockOrder(prefs: DashboardPrefs | null | undefined): DashboardBlockId[] {
  const saved = (normalizePrefs(prefs).order ?? []) as DashboardBlockId[]
  return [...saved, ...DEFAULT_ORDER.filter(id => !saved.includes(id))]
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
  const to = from + delta
  if (from < 0 || to < 0 || to >= order.length) return order
  const next = [...order]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

/** Marca/desmarca um bloco como escondido. */
export function toggleHidden(hidden: DashboardBlockId[], id: DashboardBlockId): DashboardBlockId[] {
  return hidden.includes(id) ? hidden.filter(h => h !== id) : [...hidden, id]
}

/** Blocos que ficam lado a lado quando caem um do lado do outro. */
const CARD_BLOCKS = new Set<DashboardBlockId>(['cursos', 'incompletos', 'auditoria'])

/**
 * Junta os cartões pequenos vizinhos numa linha só (2 colunas no computador).
 * Blocos largos (agenda, números…) ficam sozinhos no grupo deles.
 */
export function groupBlocks(ids: DashboardBlockId[]): DashboardBlockId[][] {
  const groups: DashboardBlockId[][] = []
  for (const id of ids) {
    const last = groups[groups.length - 1]
    if (CARD_BLOCKS.has(id) && last && CARD_BLOCKS.has(last[0])) last.push(id)
    else groups.push([id])
  }
  return groups
}
