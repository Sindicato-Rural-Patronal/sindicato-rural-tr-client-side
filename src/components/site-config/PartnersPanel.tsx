import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Building2, Handshake, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { PartnerEditDialog } from '@/components/site-config/PartnerEditDialog'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  useAdminCompanies, useReorderPartners, useSetCompanyPartner, companyDisplayName,
  type CompanyListItem,
} from '@/hooks/useCompanies'
import { apiErrorMessage } from '@/lib/api-error-message'
import { maskCNPJ } from '@/utils/masks'

// Na ordem da home: partnerOrder (sem ordem por último), depois nome.
function byHomeOrder(a: CompanyListItem, b: CompanyListItem) {
  const oa = a.partnerOrder ?? Number.MAX_SAFE_INTEGER
  const ob = b.partnerOrder ?? Number.MAX_SAFE_INTEGER
  return oa - ob || companyDisplayName(a).localeCompare(companyDisplayName(b))
}

function AddPartnerDialog({ open, onClose, onPick, pending }: {
  open: boolean
  onClose: () => void
  onPick: (company: CompanyListItem) => void
  pending: boolean
}) {
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search, 300).trim()
  const { data, isFetching } = useAdminCompanies({ search: q, isPartner: false, limit: 8 })
  const results = data?.data ?? []

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar parceiro</DialogTitle>
          <DialogDescription>Escolha uma empresa já cadastrada.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Buscar empresa" className="h-9 pl-9" placeholder="Razão social, nome fantasia ou CNPJ"
            value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        </div>
        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {results.map(c => (
            <button key={c.id} type="button" disabled={pending} onClick={() => onPick(c)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted disabled:opacity-50">
              <Building2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{companyDisplayName(c)}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[c.tradeName ? c.name : null, c.cnpj ? maskCNPJ(c.cnpj) : null].filter(Boolean).join(' · ') || 'Sem CNPJ'}
                </span>
              </span>
              <Plus className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
          {!isFetching && results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhuma empresa encontrada.{' '}
              <Link to="/admin/empresas/novo" className="text-primary hover:underline">Cadastrar empresa</Link>
            </p>
          )}
          {isFetching && results.length === 0 && <Loader2 className="mx-auto my-6 size-5 animate-spin text-muted-foreground" />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Empresas parceiras da faixa "Parcerias com" da página inicial.
export function PartnersPanel({ canEdit }: { canEdit: boolean }) {
  const { data, isLoading, isError } = useAdminCompanies({ isPartner: true, limit: 100 })
  const setPartner = useSetCompanyPartner()
  const reorder = useReorderPartners()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<CompanyListItem | null>(null)
  const [removing, setRemoving] = useState<CompanyListItem | null>(null)

  const partners = [...(data?.data ?? [])].sort(byHomeOrder)

  async function move(index: number, direction: -1 | 1) {
    const ids = partners.map(p => p.id)
    const [id] = ids.splice(index, 1)
    ids.splice(index + direction, 0, id)
    try {
      await reorder.mutateAsync(ids)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao reordenar.'))
    }
  }

  async function add(company: CompanyListItem) {
    try {
      await setPartner.mutateAsync({ id: company.id, isPartner: true, partnerOrder: partners.length })
      setAdding(false)
      toast.success(`${companyDisplayName(company)} agora aparece na home. Envie o logo.`)
      setEditing({ ...company, isPartner: true, partnerOrder: partners.length })
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao adicionar parceiro.'))
    }
  }

  async function confirmRemove() {
    if (!removing) return
    try {
      await setPartner.mutateAsync({ id: removing.id, isPartner: false, partnerOrder: null })
      toast.success(`${companyDisplayName(removing)} saiu da página inicial.`)
      setRemoving(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover parceiro.'))
    }
  }

  // O diálogo de edição lê a versão atualizada da lista (logo recém-enviado).
  const editingCurrent = editing ? partners.find(p => p.id === editing.id) ?? editing : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Empresas da faixa "Parcerias com" da página inicial, nesta ordem.
        </p>
        {canEdit && (
          <Button className="shrink-0" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Adicionar parceiro
          </Button>
        )}
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar os parceiros." />}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-b-0">
            <Skeleton className="h-12 w-24" /><Skeleton className="h-4 w-48" />
          </div>
        ))}

        {!isLoading && partners.length === 0 && (
          <EmptyState icon={Handshake} title="Nenhum parceiro na home" description='Clique em "Adicionar parceiro" e escolha uma empresa cadastrada.' />
        )}

        {partners.map((p, i) => {
          const name = companyDisplayName(p)
          return (
            <div key={p.id} className="flex flex-col gap-3 border-b border-border p-4 last:border-b-0 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <span className="w-5 shrink-0 text-center text-sm tabular-nums text-muted-foreground">{i + 1}</span>
                <div className="flex h-12 w-24 shrink-0 items-center justify-center rounded-md border bg-white px-2">
                  {p.partnerLogo
                    ? <img src={p.partnerLogo} alt={`Logo ${name}`} className="max-h-full max-w-full object-contain" />
                    : <Handshake className="size-5 text-muted-foreground/40" />}
                </div>
                <div className="min-w-0">
                  <Link to="/admin/empresas/$id" params={{ id: p.id }} className="block truncate font-medium text-foreground hover:underline">
                    {name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{p.partnerUrl || 'Sem link'}</p>
                </div>
                {!p.partnerLogo && <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">Sem logo</Badge>}
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                  <Button size="sm" variant="ghost" className="h-8 px-2" disabled={i === 0 || reorder.isPending}
                    onClick={() => move(i, -1)} aria-label={`Subir ${name}`} title="Subir"><ArrowUp className="size-4" /></Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2" disabled={i === partners.length - 1 || reorder.isPending}
                    onClick={() => move(i, 1)} aria-label={`Descer ${name}`} title="Descer"><ArrowDown className="size-4" /></Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditing(p)}
                    aria-label={`Editar logo e link de ${name}`} title="Logo e link"><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => setRemoving(p)} aria-label={`Tirar ${name} da home`} title="Tirar da home"><Trash2 className="size-4" /></Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {adding && <AddPartnerDialog open onClose={() => setAdding(false)} onPick={add} pending={setPartner.isPending} />}
      {editingCurrent && <PartnerEditDialog key={editingCurrent.id} company={editingCurrent} onClose={() => setEditing(null)} />}

      <DeleteConfirmDialog
        open={!!removing}
        onOpenChange={o => { if (!o) setRemoving(null) }}
        title="Tirar parceiro da home"
        description={<>A empresa <strong>{removing ? companyDisplayName(removing) : ''}</strong> deixa de aparecer na página inicial. O cadastro dela continua.</>}
        confirmLabel="Tirar da home"
        pendingLabel="Removendo..."
        onConfirm={confirmRemove}
        pending={setPartner.isPending}
      />
    </div>
  )
}
