import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CheckCircle2, ExternalLink, ShieldCheck, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { RowActions } from '@/components/RowActions'
import { InitialsAvatar } from '@/components/InitialsAvatar'
import { maskCPF, maskPhone } from '@/utils/masks'
import { MergePeopleDialog } from './MergePeopleDialog'
import {
  DUPLICATE_REASON_LABEL,
  useDuplicatePeople,
  type MergeCandidate,
} from './merge-people'

// "Possíveis duplicados" da lista de associados: pessoas com o mesmo nome,
// telefone ou e-mail em que pelo menos uma está sem CPF — o caso típico de quem
// já estava cadastrado e ganhou um segundo cadastro ao se inscrever num curso.

function PersonLine({ person }: { person: MergeCandidate }) {
  const navigate = useNavigate()
  const { counts } = person
  const totals = [
    counts.registrations > 0 && `${counts.registrations} insc.`,
    counts.companies > 0 && `${counts.companies} empresa${counts.companies > 1 ? 's' : ''}`,
    counts.properties > 0 && `${counts.properties} propriedade${counts.properties > 1 ? 's' : ''}`,
    counts.relations > 0 && `${counts.relations} relação${counts.relations > 1 ? 'ões' : ''}`,
  ].filter(Boolean) as string[]

  return (
    <div className="flex items-center gap-3 py-2">
      <InitialsAvatar name={person.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
          <span className="truncate">{person.name}</span>
          {!person.cpf && (
            <Badge variant="warning">sem CPF</Badge>
          )}
          {person.hasLogin && (
            <Badge variant="outline">
              <ShieldCheck /> painel
            </Badge>
          )}
        </p>
        <p className="break-words text-xs tabular-nums text-muted-foreground">
          {person.cpf ? maskCPF(person.cpf) : 'sem CPF'} · {maskPhone(person.phone)}
          {person.email ? ` · ${person.email}` : ''} · criado em{' '}
          <span className="num">{new Date(person.createdAt).toLocaleDateString('pt-BR')}</span>
          {totals.length > 0 ? ` · ${totals.join(', ')}` : ''}
        </p>
      </div>
      <RowActions
        label={`Ações de ${person.name}`}
        className="shrink-0"
        actions={[{ label: 'Ver cadastro', icon: ExternalLink, onClick: () => void navigate({ to: '/admin/usuarios/$id', params: { id: person.id } }) }]}
      />
    </div>
  )
}

export function DuplicatePeopleList({ canMerge }: { canMerge: boolean }) {
  const { data, isLoading, isError } = useDuplicatePeople()
  const [merging, setMerging] = useState<{ person: MergeCandidate; otherId: string } | null>(null)
  const groups = data?.groups ?? []

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }
  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm text-destructive">
        Erro ao procurar cadastros repetidos.
      </div>
    )
  }
  if (groups.length === 0) {
    return (
      <EmptyState
        framed
        icon={CheckCircle2}
        title="Nenhum cadastro repetido encontrado"
        description="Aparecem aqui pessoas com o mesmo nome, telefone ou e-mail em que pelo menos uma está sem CPF."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        <span className="tabular-nums">{groups.length === 1 ? '1 grupo' : `${groups.length} grupos`}</span> com possível repetição. Confira
        antes de juntar — nomes iguais podem ser pessoas diferentes.
      </p>
      {groups.map(group => (
        <div key={`${group.reason}:${group.key}`} className="rounded-xl border border-border bg-card p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <Badge variant="neutral">{DUPLICATE_REASON_LABEL[group.reason]}</Badge>
            {canMerge && group.people.length === 2 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setMerging({ person: group.people[0], otherId: group.people[1].id })
                }
              >
                <Users />
                Juntar
              </Button>
            )}
          </div>
          <div className="divide-y divide-border">
            {group.people.map(person => (
              <PersonLine key={person.id} person={person} />
            ))}
          </div>
          {canMerge && group.people.length > 2 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Mais de dois cadastros: abra um deles e use "Juntar com outro cadastro", dois a dois.
            </p>
          )}
        </div>
      ))}

      {merging && (
        <MergePeopleDialog
          open
          onOpenChange={o => { if (!o) setMerging(null) }}
          person={merging.person}
          otherId={merging.otherId}
        />
      )}
    </div>
  )
}
