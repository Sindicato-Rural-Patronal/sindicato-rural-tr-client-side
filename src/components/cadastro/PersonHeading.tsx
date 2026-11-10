import { MemberBadge } from '@/components/MemberBadge'
import type { MemberFields } from '@/lib/membership'

// Título da ficha da pessoa: o nome (até 3 linhas) com o selo "Associado" ao
// lado. Se o nome for comprido demais para dividir a linha, o selo desce para a
// linha de baixo em vez de espremer o nome.
export function PersonHeading({ person }: { person: MemberFields & { name: string } }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <h1 className="min-w-0 max-w-full line-clamp-3 break-words text-2xl leading-8 font-semibold text-foreground" title={person.name}>{person.name}</h1>
      <MemberBadge person={person} />
    </div>
  )
}
