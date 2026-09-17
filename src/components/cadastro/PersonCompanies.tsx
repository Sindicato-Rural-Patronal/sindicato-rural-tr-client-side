import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Building2, ChevronRight, ExternalLink, Handshake, Plus, Search, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import type { PersonCompanyMembership } from '@/hooks/useAdmin'
import { usePermissions } from '@/hooks/usePermissions'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  COMMON_MEMBER_TITLES, companyDisplayName, memberTitleSuggestions,
  useAdminCompanies, useCompanyMemberTitles, useLinkPersonToCompany, useUnlinkPersonFromCompany,
  type CompanyListItem,
} from '@/hooks/useCompanies'
import { apiErrorMessage } from '@/lib/api-error-message'
import { maskCNPJ } from '@/utils/masks'
import { upperNoAccents } from '@/utils/text-format'

// Empresas às quais a pessoa está vinculada. Dá para vincular e desvincular
// daqui mesmo (mesma permissão de vincular pessoas na empresa: UPDATE_USER);
// o título do vínculo continua editável na página da empresa.

type PickedCompany = Pick<CompanyListItem, 'id' | 'name' | 'tradeName' | 'cnpj'>

function companySubtitle(c: { cnpj: string | null; type?: string }) {
  return `${c.cnpj ? maskCNPJ(c.cnpj) : 'Sem CNPJ'}${c.type === 'PUBLIC' ? ' · Pública' : ''}`
}

// Conteúdo do diálogo: fica montado só com o diálogo aberto, então reabrir começa limpo.
function LinkCompanyForm({ userId, personName, linkedCompanyIds, onDone }: {
  userId: string
  personName: string
  linkedCompanyIds: Set<string>
  onDone: () => void
}) {
  const { can } = usePermissions()
  const link = useLinkPersonToCompany()
  const { data: usedTitles } = useCompanyMemberTitles()
  const suggestions = memberTitleSuggestions(usedTitles)
  const [q, setQ] = useState('')
  const dq = useDebouncedValue(q, 300).trim()
  const { data, isFetching } = useAdminCompanies({ search: dq, limit: 8 })
  const results = data?.data ?? []
  const [company, setCompany] = useState<PickedCompany | null>(null)
  const [title, setTitle] = useState('')
  const [errors, setErrors] = useState<{ company?: string; title?: string }>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const problems = {
      company: company ? undefined : 'Escolha a empresa.',
      title: title.trim() ? undefined : 'Informe o título da pessoa na empresa.',
    }
    setErrors(problems)
    if (problems.company) { document.getElementById('link-company-search')?.focus(); return }
    if (problems.title) { document.getElementById('link-company-title')?.focus(); return }
    try {
      await link.mutateAsync({ companyId: company!.id, userDataId: userId, title: title.trim() })
      toast.success(`${personName} vinculada a ${companyDisplayName(company!)} como ${title.trim()}.`)
      onDone()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao vincular à empresa.'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <datalist id="person-company-title-suggestions">
        {suggestions.map(t => <option key={t} value={t} />)}
      </datalist>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="link-company-search" className="text-xs font-medium text-muted-foreground">Empresa *</Label>
        {company ? (
          <div className="flex min-h-9 items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{companyDisplayName(company)}</p>
              <p className="text-xs text-muted-foreground">{companySubtitle(company)}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2"
              onClick={() => setCompany(null)}>
              <X className="size-3.5" /> Trocar
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="link-company-search"
                className="h-9 pl-9"
                autoFocus
                autoComplete="off"
                placeholder="Buscar por nome, CNPJ ou e-mail…"
                value={q}
                aria-invalid={!!errors.company || undefined}
                onChange={e => { setQ(e.target.value); setErrors(p => ({ ...p, company: undefined })) }}
              />
            </div>
            <div className="max-h-56 overflow-y-auto rounded-md border" aria-label="Empresas encontradas">
              {isFetching && results.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">Buscando…</p>
              )}
              {!isFetching && results.length === 0 && (
                <div className="space-y-1 px-3 py-2 text-xs text-muted-foreground">
                  <p>Nenhuma empresa encontrada.</p>
                  {can('CREATE_USER') && (
                    <>
                      <a href="/admin/empresas/novo" target="_blank" rel="noopener"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                        Cadastrar nova empresa <ExternalLink className="size-3" />
                      </a>
                      <p>Abre em outra aba. Depois de salvar, busque de novo aqui.</p>
                    </>
                  )}
                </div>
              )}
              {results.map(c => {
                const already = linkedCompanyIds.has(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={already}
                    onClick={() => {
                      setCompany(c)
                      setErrors(p => ({ ...p, company: undefined }))
                      document.getElementById('link-company-title')?.focus()
                    }}
                    className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{companyDisplayName(c)}</span>
                      <span className="block text-xs text-muted-foreground">{companySubtitle(c)}</span>
                    </span>
                    {already && <span className="shrink-0 text-xs text-muted-foreground">já vinculada</span>}
                  </button>
                )
              })}
            </div>
          </>
        )}
        {errors.company && <p className="text-xs text-destructive" role="alert">{errors.company}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="link-company-title" className="text-xs font-medium text-muted-foreground">Título na empresa *</Label>
        <Input
          id="link-company-title"
          className="h-9"
          list="person-company-title-suggestions"
          maxLength={80}
          placeholder="Ex.: SOCIO, GERENTE, CONTADOR"
          value={title}
          aria-invalid={!!errors.title || undefined}
          onChange={e => { setTitle(upperNoAccents(e.target.value)); setErrors(p => ({ ...p, title: undefined })) }}
        />
        <div className="flex flex-wrap gap-1.5">
          {COMMON_MEMBER_TITLES.map(t => (
            <Button key={t} type="button" size="sm" variant={title === t ? 'default' : 'outline'} className="h-7 px-2 text-xs"
              onClick={() => { setTitle(t); setErrors(p => ({ ...p, title: undefined })) }}>
              {t}
            </Button>
          ))}
        </div>
        {errors.title && <p className="text-xs text-destructive" role="alert">{errors.title}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={link.isPending}>Cancelar</Button>
        <Button type="submit" disabled={link.isPending}>
          {link.isPending ? 'Vinculando…' : 'Vincular'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function PersonCompanies({ userId, personName, memberships }: {
  userId: string
  personName: string
  memberships: PersonCompanyMembership[]
}) {
  const { can } = usePermissions()
  const canEdit = can('UPDATE_USER')
  const unlink = useUnlinkPersonFromCompany()
  const [linkOpen, setLinkOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<PersonCompanyMembership | null>(null)
  const linkedCompanyIds = new Set(memberships.map(m => m.company.id))

  async function handleRemove() {
    if (!removeTarget) return
    try {
      await unlink.mutateAsync({ companyId: removeTarget.company.id, memberId: removeTarget.id })
      toast.success('Vínculo removido.')
      setRemoveTarget(null)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao desvincular.'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{memberships.length} empresa(s) vinculada(s)</p>
        {canEdit && (
          <Button size="sm" onClick={() => setLinkOpen(true)}>
            <Plus className="size-4" /> Vincular a empresa
          </Button>
        )}
      </div>

      {memberships.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 text-center">
          <Building2 className="mb-3 size-10 text-muted-foreground/30" />
          <p className="text-sm font-medium">Não vinculada a nenhuma empresa</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {memberships.map(m => (
            <div key={m.id} className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                to="/admin/empresas/$id"
                params={{ id: m.company.id }}
                className="group flex min-w-0 items-center gap-3"
                title="Abrir empresa"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Building2 className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-sm font-medium group-hover:underline">
                    {companyDisplayName(m.company)}
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </p>
                  <p className="text-xs text-muted-foreground">{companySubtitle(m.company)}</p>
                </div>
              </Link>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                {m.company.isPartner && <Badge variant="outline" className="gap-1"><Handshake className="size-3" /> Parceira</Badge>}
                <Badge variant="secondary">{m.title}</Badge>
                {canEdit && (
                  <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => setRemoveTarget(m)} aria-label={`Desvincular de ${companyDisplayName(m.company)}`}>
                    <Trash2 className="size-3.5" /> Desvincular
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular a empresa</DialogTitle>
            <DialogDescription>{personName}</DialogDescription>
          </DialogHeader>
          <LinkCompanyForm
            userId={userId}
            personName={personName}
            linkedCompanyIds={linkedCompanyIds}
            onDone={() => setLinkOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!removeTarget}
        onOpenChange={open => { if (!open) setRemoveTarget(null) }}
        title="Desvincular da empresa"
        description={<>
          Desvincular <strong>{personName}</strong> de <strong>{removeTarget ? companyDisplayName(removeTarget.company) : ''}</strong> ({removeTarget?.title})?
          A empresa e o cadastro da pessoa não são apagados.
        </>}
        onConfirm={handleRemove}
        pending={unlink.isPending}
        confirmLabel="Desvincular"
        pendingLabel="Desvinculando…"
      />
    </div>
  )
}
