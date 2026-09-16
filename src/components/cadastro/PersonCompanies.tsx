import { Link } from '@tanstack/react-router'
import { Building2, ChevronRight, Handshake } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { PersonCompanyMembership } from '@/hooks/useAdmin'
import { maskCNPJ } from '@/utils/masks'

// Empresas às quais a pessoa está vinculada. O vínculo (e o título) é criado e
// editado na própria empresa; aqui só lista e leva até ela.

export function PersonCompanies({ memberships }: { memberships: PersonCompanyMembership[] }) {
  if (memberships.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 text-center">
        <Building2 className="mb-3 size-10 text-muted-foreground/30" />
        <p className="text-sm font-medium">Não vinculada a nenhuma empresa</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Para vincular, abra a empresa em Usuários › Empresas e use "Vincular pessoa".
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {memberships.map(m => (
        <Link
          key={m.id}
          to="/admin/empresas/$id"
          params={{ id: m.company.id }}
          className="group flex items-center justify-between gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Building2 className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{m.company.name}</p>
              <p className="text-xs text-muted-foreground">
                {m.company.cnpj ? maskCNPJ(m.company.cnpj) : 'Sem CNPJ'}
                {m.company.type === 'PUBLIC' ? ' · Pública' : ''}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {m.company.isPartner && <Badge variant="outline" className="gap-1"><Handshake className="size-3" /> Parceira</Badge>}
            <Badge variant="secondary">{m.title}</Badge>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      ))}
    </div>
  )
}
