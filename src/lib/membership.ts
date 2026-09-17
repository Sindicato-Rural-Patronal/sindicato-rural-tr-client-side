import { toYmd } from '@/utils/dates'

// Associado em dia: situação ATIVO e validade (se houver) ainda não vencida.
export function isActiveMember(
  memberStatus: 'ACTIVE' | 'INACTIVE' | null | undefined,
  membershipValidUntil: string | null | undefined,
  today: Date = new Date(),
): boolean {
  if (memberStatus !== 'ACTIVE') return false
  if (!membershipValidUntil) return true
  // Compara só a data (a validade vale o dia inteiro).
  return membershipValidUntil.slice(0, 10) >= toYmd(today)
}
