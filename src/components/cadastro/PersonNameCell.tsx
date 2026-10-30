import { InitialsAvatar } from '@/components/InitialsAvatar'
import { MemberBadge } from '@/components/MemberBadge'
import type { MemberFields } from '@/lib/membership'

// Conteúdo da coluna "Nome" da lista de pessoas: avatar, nome, selo "Associado"
// embaixo do nome e, no celular (onde a coluna de e-mail some), o e-mail embaixo
// do selo. A lista não rola de lado: o nome trunca com reticências (texto inteiro
// no title). O selo fica embaixo, e não ao lado, para não tirar espaço do nome:
// os nomes são em caixa alta e a coluna já é estreita (até 14rem em 1280 px).
export function PersonNameCell({ person }: {
  person: MemberFields & { name: string; email: string | null; avatar: string | null }
}) {
  return (
    <div className="flex items-center gap-3">
      <InitialsAvatar name={person.name} avatar={person.avatar} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground" title={person.name}>{person.name}</p>
        <MemberBadge person={person} className="mt-0.5 flex w-fit" />
        {person.email && (
          <p className="truncate text-xs text-muted-foreground md:hidden" title={person.email}>{person.email}</p>
        )}
      </div>
    </div>
  )
}
