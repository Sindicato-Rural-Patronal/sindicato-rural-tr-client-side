import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  HeartPulse, Receipt, ScrollText, FileSignature, Loader2, ExternalLink, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { useUnimedByPerson, type UnimedRow } from '@/hooks/useUnimed'
import { apiErrorMessage } from '@/lib/api-error-message'
import { baixarFichaUnimed, baixarTermoUnimed, baixarContratoUnimed } from '@/lib/unimed-docs'
import { unimedOptionLabel, UNIMED_DEPENDENCY_DEGREES } from '@/lib/unimed-options'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { maskCPF } from '@/utils/masks'

// Aba "Unimed" da ficha da pessoa: os cadastros do plano de saúde ligados a ela
// — o dela e os em que ela é o titular da família (dependentes). A tela de
// cadastro continua sendo /admin/unimed; aqui é só consulta + documentos.
// Permissão: a mesma da tela da Unimed (READ_USER), que já é exigida para abrir
// a ficha da pessoa.

type DocKind = 'ficha' | 'termo' | 'contrato'

const DOCS: { kind: DocKind; label: string; icon: typeof Receipt; run: (id: string) => Promise<void> }[] = [
  { kind: 'ficha', label: 'Ficha', icon: Receipt, run: baixarFichaUnimed },
  { kind: 'termo', label: 'Termo', icon: ScrollText, run: baixarTermoUnimed },
  { kind: 'contrato', label: 'Contrato', icon: FileSignature, run: baixarContratoUnimed },
]

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value?.trim() ? value : '—'}</span>
    </div>
  )
}

function UnimedCard({ row, isOwner }: { row: UnimedRow; isOwner: boolean }) {
  const [busy, setBusy] = useState<DocKind | null>(null)

  async function gerar(doc: (typeof DOCS)[number]) {
    setBusy(doc.kind)
    try {
      await doc.run(row.id)
    } catch (e) {
      toast.error(apiErrorMessage(e, `Erro ao gerar o documento (${doc.label}).`))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <HeartPulse className="size-4 shrink-0 text-muted-foreground" />
          <strong className="truncate text-foreground">{row.userData.name}</strong>
          {row.userData.cpf && (
            <span className="text-xs tabular-nums text-muted-foreground">{maskCPF(row.userData.cpf)}</span>
          )}
        </div>
        <Badge variant={isOwner ? 'default' : 'secondary'}>
          {isOwner ? 'Cadastro desta pessoa' : 'Dependente (ela é a titular)'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Plano" value={row.plano} />
        <Field label="Matrícula" value={row.matricula} />
        <Field
          label="Grau de dependência"
          value={unimedOptionLabel(UNIMED_DEPENDENCY_DEGREES, row.grauDependencia)}
        />
        <Field label="Data de adesão" value={row.dataAdesao ? formatDateFromString(row.dataAdesao) : null} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {DOCS.map(doc => (
          <Button key={doc.kind} size="sm" variant="outline" onClick={() => gerar(doc)} disabled={busy !== null}>
            {busy === doc.kind ? <Loader2 className="size-4 animate-spin" /> : <doc.icon className="size-4" />}
            {doc.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" asChild>
          <Link to="/admin/unimed">
            <ExternalLink className="size-4" /> Abrir na tela da Unimed
          </Link>
        </Button>
      </div>
    </div>
  )
}

export function PersonUnimedTab({ userDataId }: { userDataId: string }) {
  const { data, isLoading, isError } = useUnimedByPerson(userDataId)
  const rows = data?.data ?? []

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    )
  }

  if (isError) return <LoadErrorBanner message="Erro ao carregar os dados da Unimed." />

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={HeartPulse}
        title="Esta pessoa não tem cadastro na Unimed."
        description="Cadastre o beneficiário na tela da Unimed para emitir a Ficha, o Termo e o Contrato."
        action={(
          <Button asChild>
            <Link to="/admin/unimed">
              <Plus className="size-4" /> Cadastrar na Unimed
            </Link>
          </Button>
        )}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map(row => (
        <UnimedCard key={row.id} row={row} isOwner={row.userDataId === userDataId} />
      ))}
    </div>
  )
}
