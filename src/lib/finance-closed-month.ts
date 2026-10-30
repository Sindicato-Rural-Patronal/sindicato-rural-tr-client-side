import type { FinanceClosing } from '@/hooks/useFinance'
import { monthNumeric } from '@/lib/finance-month'

// Trava do mês fechado na tela (SR-060), espelho da regra da API (SR-054,
// `usecase/finance-closed-month.ts` do back). O fechamento é por caixa e mês:
// com o mês M fechado no caixa C, os lançamentos de C com data em M não podem
// ser criados, editados nem excluídos, e nenhum lançamento entra ou sai de
// (C, M). Transferência é recusada se M está fechado na origem OU no destino.
// Lançamento sem caixa fica livre. Quem decide é a API (409); a tela só avisa
// antes e desliga os botões.

/** Par caixa + mês fechado ("AAAA-MM"), como vem de GET /admin/finance/closings. */
export type ClosedMonth = Pick<FinanceClosing, 'accountId' | 'month'>

/** Caixa e data de um lançamento ("AAAA-MM-DD" do formulário ou o ISO da API). */
export type LockTarget = { accountId: string | null | undefined; date: string }

/**
 * Mês ("AAAA-MM") de um lançamento, como a API conta: o da data em UTC
 * (`date.toISOString().slice(0, 7)`). Data inválida → null.
 */
export function transactionMonth(date: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date.slice(0, 7)
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 7)
}

/** O fechamento que trava este caixa nesta data, ou null. Sem caixa nunca trava. */
export function findClosedMonth<T extends ClosedMonth>(
  accountId: string | null | undefined,
  date: string,
  closings: readonly T[] | undefined,
): T | null {
  if (!accountId || !closings?.length) return null
  const month = transactionMonth(date)
  if (!month) return null
  return closings.find(c => c.accountId === accountId && c.month === month) ?? null
}

export function isClosed(
  accountId: string | null | undefined,
  date: string,
  closings: readonly ClosedMonth[] | undefined,
): boolean {
  return findClosedMonth(accountId, date, closings) !== null
}

/** Primeiro par fechado entre os alvos; com mais de um, o mês mais antigo (como a API). */
function oldestClosed<T extends ClosedMonth>(targets: LockTarget[], closings: readonly T[] | undefined): T | null {
  const hits = targets
    .map(t => findClosedMonth(t.accountId, t.date, closings))
    .filter((c): c is T => c !== null)
  if (hits.length === 0) return null
  return hits.reduce((a, b) => (b.month < a.month ? b : a))
}

/**
 * Formulário de lançamento: criar com o caixa e a data escolhidos e, na edição,
 * também tirar o lançamento de onde ele está (`original`), porque mover para
 * fora de um mês fechado é recusado.
 */
export function closedMonthForTransaction<T extends ClosedMonth>(
  next: LockTarget,
  closings: readonly T[] | undefined,
  original?: LockTarget | null,
): T | null {
  return oldestClosed(original ? [next, original] : [next], closings)
}

/** Transferência: recusada se o mês da data está fechado na origem ou no destino. */
export function closedMonthForTransfer<T extends ClosedMonth>(
  t: { fromAccountId: string; toAccountId: string; date: string },
  closings: readonly T[] | undefined,
): T | null {
  return oldestClosed(
    [{ accountId: t.fromAccountId, date: t.date }, { accountId: t.toAccountId, date: t.date }],
    closings,
  )
}

/**
 * Linha da lista: editar e excluir ficam travados quando o lançamento está num
 * mês fechado do caixa dele. Perna de transferência também olha a outra perna
 * (excluir uma apaga as duas), quando ela está na mesma página.
 */
export function closedMonthForRow<T extends ClosedMonth>(
  t: { id: string; accountId: string | null; date: string; transferId: string | null },
  rows: readonly { id: string; accountId: string | null; date: string; transferId: string | null }[],
  closings: readonly T[] | undefined,
): T | null {
  const own = findClosedMonth(t.accountId, t.date, closings)
  if (own || !t.transferId) return own
  const others = rows.filter(r => r.transferId === t.transferId && r.id !== t.id)
  return oldestClosed(others, closings)
}

/**
 * O motivo, com o mesmo texto na lista (title do botão e do selo), no formulário
 * e na transferência: "Mês 10/2026 fechado no caixa BANCO. Para mudar, reabra o
 * mês na aba Fechamento."
 */
export function closedMonthMessage(month: string, accountName?: string | null): string {
  const caixa = accountName?.trim() ? `no caixa ${accountName.trim()}` : 'neste caixa'
  return `Mês ${monthNumeric(month)} fechado ${caixa}. Para mudar, reabra o mês na aba Fechamento.`
}
