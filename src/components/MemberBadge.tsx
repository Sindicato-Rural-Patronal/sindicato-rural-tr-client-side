import { cn } from '@/lib/utils'
import { personIsActiveMember, type MemberFields } from '@/lib/membership'

// Selo "Associado" (situação ATIVO e validade em dia): o mesmo visual da lista de
// inscritos do curso. Não aparece para quem não está em dia. Fica ao lado do
// nome na lista de pessoas, na ficha e na busca de pessoa dos formulários; o
// texto não quebra e o selo não encolhe, quem trunca é o nome.
// Desenho da etiqueta do sistema (ui/badge), no tom âmbar de sempre (`warning`).
export function MemberBadge({ person, className }: { person: MemberFields; className?: string }) {
  if (!personIsActiveMember(person)) return null
  return (
    <span
      data-testid="member-badge"
      className={cn(
        'inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-sm bg-warning-soft px-1.5 text-xs font-medium text-warning',
        className,
      )}
      title="Associado em dia"
    >
      Associado
    </span>
  )
}
