import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowRight, Check, Loader2, ShieldCheck, Users } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PersonPicker, type PickedPerson } from '@/components/PersonPicker'
import { apiErrorMessage } from '@/lib/api-error-message'
import { maskCPF, maskPhone } from '@/utils/masks'
import { cpfDigits } from '@/utils/cpf'
import { cn } from '@/lib/utils'
import {
  mergeSummary,
  useMergePeople,
  useMergePreview,
  type MergeCandidate,
} from './merge-people'

// Diálogo "Juntar com outro cadastro": escolhe o outro cadastro da mesma pessoa,
// mostra os dois lado a lado, deixa a equipe decidir qual fica e avisa o que vai
// ser movido antes de confirmar. Quem some é marcado como excluído, não apagado.

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium text-foreground">{value}</span>
    </div>
  )
}

function CandidateCard({
  person,
  selected,
  onSelect,
}: {
  person: MergeCandidate
  selected: boolean
  onSelect: () => void
}) {
  const { counts } = person
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-border bg-card hover:bg-muted/50',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
          )}
        >
          {selected && <Check className="size-3" />}
        </span>
        <span className="truncate text-sm font-semibold text-foreground">{person.name}</span>
      </div>
      <div className="flex flex-col gap-1">
        <Line label="CPF" value={person.cpf ? maskCPF(person.cpf) : 'sem CPF'} />
        <Line label="E-mail" value={person.email || '—'} />
        <Line label="Telefone" value={person.phone ? maskPhone(person.phone) : '—'} />
        <Line label="Criado em" value={new Date(person.createdAt).toLocaleDateString('pt-BR')} />
        <Line label="Inscrições" value={String(counts.registrations)} />
        <Line label="Empresas" value={String(counts.companies)} />
        <Line label="Propriedades" value={String(counts.properties)} />
        <Line label="Relações" value={String(counts.relations)} />
      </div>
      <div className="flex flex-wrap gap-1">
        {person.hasLogin && (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <ShieldCheck className="size-3" /> Acesso ao painel
          </Badge>
        )}
        {selected && <Badge className="text-[10px]">Este cadastro fica</Badge>}
      </div>
    </button>
  )
}

export function MergePeopleDialog({
  open,
  onOpenChange,
  person,
  otherId,
  onMerged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Cadastro de onde o diálogo foi aberto. */
  person: { id: string; name: string }
  /** Outro cadastro já escolhido (atalho "Juntar" da lista de duplicados). */
  otherId?: string
  /** Chamado com o id do cadastro que ficou, depois de juntar. */
  onMerged?: (keepId: string) => void
}) {
  const [other, setOther] = useState<{ id: string; name: string } | null>(null)
  const [keepId, setKeepId] = useState(person.id)
  const merge = useMergePeople()

  // Cada abertura começa do zero (com o atalho da lista de duplicados já
  // preenchido). Comparação em render, como nas outras telas do painel.
  const [session, setSession] = useState({ open, otherId, personId: person.id })
  if (session.open !== open || session.otherId !== otherId || session.personId !== person.id) {
    setSession({ open, otherId, personId: person.id })
    setOther(otherId ? { id: otherId, name: '' } : null)
    setKeepId(person.id)
  }

  const ids: [string, string] | null = other ? [person.id, other.id] : null
  const { data, isLoading, isError } = useMergePreview(open ? ids : null)
  const people = data?.people ?? []
  const current = people.find(p => p.id === person.id) ?? null
  const picked = people.find(p => p.id === other?.id) ?? null
  const keep = people.find(p => p.id === keepId) ?? null
  const removed = people.find(p => p.id !== keepId) ?? null

  // Os mesmos impedimentos do backend, avisados antes de tentar.
  const differentCpf =
    !!current?.cpf && !!picked?.cpf && cpfDigits(current.cpf) !== cpfDigits(picked.cpf)
  const bothHaveLogin = !!current?.hasLogin && !!picked?.hasLogin
  const blocked = differentCpf || bothHaveLogin
  const ready = !!current && !!picked && !blocked && !!keep && !!removed

  function pick(p: PickedPerson) {
    setOther({ id: p.id, name: p.name })
    setKeepId(person.id)
  }

  async function handleMerge() {
    if (!keep || !removed) return
    try {
      const result = await merge.mutateAsync({ keepId: keep.id, removeId: removed.id })
      toast.success(mergeSummary(result))
      onOpenChange(false)
      onMerged?.(result.keepId)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao juntar os cadastros.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!merge.isPending) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Juntar com outro cadastro</DialogTitle>
          <DialogDescription>
            Para a mesma pessoa cadastrada duas vezes. Tudo passa para o cadastro escolhido e o
            outro é marcado como excluído.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!other && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="merge-person">Outro cadastro da mesma pessoa</Label>
              <PersonPicker
                id="merge-person"
                onPick={pick}
                excludeIds={new Set([person.id])}
                excludedLabel="é este cadastro"
                placeholder="Buscar por nome, e-mail ou CPF…"
                autoFocus
              />
            </div>
          )}

          {other && isLoading && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-56 rounded-lg" />
              <Skeleton className="h-56 rounded-lg" />
            </div>
          )}

          {other && !isLoading && (isError || people.length < 2) && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              Não foi possível carregar os dois cadastros.
            </p>
          )}

          {other && !isLoading && people.length === 2 && (
            <>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Qual cadastro fica?
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {people.map(p => (
                    <CandidateCard
                      key={p.id}
                      person={p}
                      selected={p.id === keepId}
                      onSelect={() => setKeepId(p.id)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setOther(null)}
                  className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Escolher outro cadastro
                </button>
              </div>

              {differentCpf && (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  Cadastros com CPFs diferentes não podem ser juntados — são duas pessoas.
                </p>
              )}
              {bothHaveLogin && (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  Os dois cadastros têm conta de acesso ao painel. Só é possível juntar quando
                  apenas um deles tem login.
                </p>
              )}

              {!blocked && keep && removed && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="mb-1.5 flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="size-3.5" />
                    O que vai acontecer
                  </p>
                  <p className="mb-1.5 flex flex-wrap items-center gap-1">
                    <strong>{removed.name}</strong>
                    <ArrowRight className="size-3" />
                    <strong>{keep.name}</strong>
                  </p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    <li>
                      Inscrições em cursos ({removed.counts.registrations}) — inscrição repetida no
                      mesmo curso é cancelada.
                    </li>
                    <li>
                      Vínculos com empresas ({removed.counts.companies}) — vínculo repetido mantém o
                      título do cadastro que fica.
                    </li>
                    <li>Propriedades e endereços ({removed.counts.properties}).</li>
                    <li>Relações ({removed.counts.relations}), nos dois sentidos.</li>
                    <li>
                      Beneficiário Unimed, contato público, ficha de instrutor e acesso ao painel —
                      só se o cadastro que fica ainda não tiver o seu.
                    </li>
                    <li>
                      Campos vazios de <strong>{keep.name}</strong> são preenchidos com os dados do
                      outro (CPF, RG, nascimento…); nada preenchido é sobrescrito.
                    </li>
                    <li>
                      <strong>{removed.name}</strong> é marcado como excluído (continua no
                      histórico, não some do banco).
                    </li>
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={merge.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleMerge} disabled={!ready || merge.isPending} className="gap-1.5">
            {merge.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Users className="size-3.5" />}
            {merge.isPending ? 'Juntando…' : 'Juntar cadastros'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
