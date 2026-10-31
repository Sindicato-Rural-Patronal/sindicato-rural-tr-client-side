import { brasiliaYmd } from '@/lib/banner-dates'

export type MemberFields = {
  memberStatus?: 'ACTIVE' | 'INACTIVE' | null
  membershipValidUntil?: string | null
}

// Associado em dia (o selo "Associado"): situação ATIVO e validade vazia ou de
// hoje em diante. "Hoje" é o dia em Brasília, a mesma regra do filtro
// `activeMember` e do selo da API (GET /admin/users): quem abre o painel com o
// computador em outro fuso vê o mesmo selo que o Sindicato.
export function isActiveMember(
  memberStatus: 'ACTIVE' | 'INACTIVE' | null | undefined,
  membershipValidUntil: string | null | undefined,
  today: Date = new Date(),
): boolean {
  if (memberStatus !== 'ACTIVE') return false
  if (!membershipValidUntil) return true
  // Compara só a data (a validade vale o dia inteiro): a API manda a validade
  // como o dia à meia-noite UTC, então os 10 primeiros caracteres são o dia gravado.
  const todayBrasilia = brasiliaYmd(today.toISOString())
  return membershipValidUntil.slice(0, 10) >= todayBrasilia
}

/** O mesmo `isActiveMember`, direto sobre a pessoa que veio da API. */
export function personIsActiveMember(person: MemberFields, today?: Date): boolean {
  return isActiveMember(person.memberStatus, person.membershipValidUntil, today)
}
