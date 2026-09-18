import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, ExternalLink, ShieldCheck, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
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
            <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-700 dark:text-amber-400">
              sem CPF
            </Badge>
          )}
          {person.hasLogin && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <ShieldCheck className="size-3" /> painel
            </Badge>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {person.cpf ? maskCPF(person.cpf) : 'sem CPF'} · {maskPhone(person.phone)}
          {person.email ? ` · ${person.email}` : ''} · criado em{' '}
          {new Date(person.createdAt).toLocaleDateString('pt-BR')}
          {totals.length > 0 ? ` · ${totals.join(', ')}` : ''}
        </p>
      </div>
      <Button variant="ghost" size="icon" className="size-7 shrink-0" asChild>
        <Link to="/admin/usuarios/$id" params={{ id: person.id }} aria-label={`Ver ${person.name}`} title="Ver cadastro">
          <ExternalLink className="size-3.5" />
        </Link>
      </Button>
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
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    )
  }
  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Erro ao procurar cadastros repetidos.
      </div>
    )
  }
  if (groups.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Nenhum cadastro repetido encontrado"
        description="Aparecem aqui pessoas com o mesmo nome, telefone ou e-mail em que pelo menos uma está sem CPF."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {groups.length === 1 ? '1 grupo' : `${groups.length} grupos`} com possível repetição. Confira
        antes de juntar — nomes iguais podem ser pessoas diferentes.
      </p>
      {groups.map(group => (
        <div key={`${group.reason}:${group.key}`} className="rounded-lg border border-border bg-card p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {DUPLICATE_REASON_LABEL[group.reason]}
            </Badge>
            {canMerge && group.people.length === 2 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() =>
                  setMerging({ person: group.people[0], otherId: group.people[1].id })
                }
              >
                <Users className="size-3.5" />
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
