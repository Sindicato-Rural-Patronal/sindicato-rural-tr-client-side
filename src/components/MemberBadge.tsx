import { cn } from '@/lib/utils'
import { personIsActiveMember, type MemberFields } from '@/lib/membership'

// Selo "Associado" (situação ATIVO e validade em dia): o mesmo visual da lista de
// inscritos do curso. Não aparece para quem não está em dia. Fica ao lado do
// nome na lista de pessoas, na ficha e na busca de pessoa dos formulários; o
// texto não quebra e o selo não encolhe, quem trunca é o nome.
export function MemberBadge({ person, className }: { person: MemberFields; className?: string }) {
  if (!personIsActiveMember(person)) return null
  return (
    <span
      data-testid="member-badge"
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-amber-200 bg-amber-100 px-1.5 text-[10px] font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400',
        className,
      )}
      title="Associado em dia"
    >
      Associado
    </span>
  )
}
