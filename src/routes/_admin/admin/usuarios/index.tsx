import { createFileRoute, Link } from '@tanstack/react-router'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionButton } from '@/components/PermissionButton'
import {
  useAdminUsers, useAdminAdmins, useAdminRules,
  useCreateAdminInvite, useAdminInvites, useRevokeAdminInvite, useCreateRule, useUpdateRule, useDeleteRule,
  useDeleteWorker,
  useUpdateAdmin, useDeleteAdmin,
  type UserData, type UserAdmin, type Rule, type PendingInvite,
} from '@/hooks/useAdmin'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableHeader, TableBody,
  TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { AlertCircle, Plus, Shield, Users, Pencil, Trash2, ExternalLink, Globe, ChevronDown, X, SlidersHorizontal, Building2, Download, Loader2, Copy } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { NativeSelect } from '@/components/ui/native-select'
import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/ui/pagination'
import { InitialsAvatar } from '@/components/InitialsAvatar'
import { PasswordInput } from '@/components/PasswordInput'
import { PasswordStrengthHint } from '@/components/PasswordStrengthHint'
import { STICKY_ACTIONS_CELL, STICKY_ACTIONS_ROW } from '@/lib/table-sticky-actions'
import { CompaniesList } from '@/components/cadastro/CompaniesList'
import { DuplicatePeopleList } from '@/components/cadastro/DuplicatePeopleList'
import { useAdminCompanies } from '@/hooks/useCompanies'
import { MEMBER_TYPES } from '@/lib/member-types'
import { downloadExport, type ExportDataset, type ExportParams } from '@/lib/export'
import { useRowSelection } from '@/hooks/useRowSelection'
import { ExportMenu, SelectCheckbox, SelectionInfo } from '@/components/export/ExportMenu'
import { PersonPicker, type PickedPerson } from '@/components/PersonPicker'
import { AjudaLink } from '@/components/ajuda/AjudaLink'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { maskCPF } from '@/utils/masks'

const USERS_TABS = ['associados', 'empresas', 'admins'] as const
type UsersTab = (typeof USERS_TABS)[number]
type UsersSearch = { incomplete?: true; tab?: UsersTab; page?: number; q?: string }

export const Route = createFileRoute('/_admin/admin/usuarios/')({
  // Filtros principais na URL (sobrevivem a voltar/atualizar/compartilhar).
  validateSearch: (s: Record<string, unknown>): UsersSearch => {
    const page = Number(s.page)
    return {
      incomplete: s.incomplete === true || s.incomplete === 'true' ? true : undefined,
      tab: USERS_TABS.includes(s.tab as UsersTab) ? (s.tab as UsersTab) : undefined,
      page: Number.isInteger(page) && page >= 1 ? page : undefined,
      q: typeof s.q === 'string' ? s.q : undefined,
    }
  },
  component: RouteComponent,
})

const PERM_GROUPS = [
  { label: 'Usuários',        perms: ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'READ_USER'] },
  { label: 'Cursos',          perms: ['CREATE_COURSE', 'UPDATE_COURSE', 'DELETE_COURSE', 'READ_COURSE'] },
  { label: 'Regras',          perms: ['CREATE_RULE', 'UPDATE_RULE', 'DELETE_RULE', 'READ_RULE'] },
  { label: 'Administradores', perms: ['CREATE_USER_ADMIN', 'UPDATE_USER_ADMIN', 'DELETE_USER_ADMIN', 'READ_USER_ADMIN'] },
  { label: 'Notícias',        perms: ['CREATE_NEWS', 'READ_NEWS', 'UPDATE_NEWS', 'DELETE_NEWS'] },
  { label: 'Contatos',        perms: ['READ_CONTACT', 'UPDATE_CONTACT'] },
  { label: 'Banners',         perms: ['CREATE_BANNER', 'READ_BANNER', 'UPDATE_BANNER', 'DELETE_BANNER'] },
  { label: 'Cotações',        perms: ['CREATE_MARKET_QUOTE', 'READ_MARKET_QUOTE', 'UPDATE_MARKET_QUOTE', 'DELETE_MARKET_QUOTE'] },
  { label: 'Auditoria',       perms: ['READ_AUDIT', 'UPDATE_AUDIT'] },
  { label: 'Financeiro',      perms: ['CREATE_FINANCE', 'READ_FINANCE', 'UPDATE_FINANCE', 'DELETE_FINANCE'] },
  { label: 'Convênios',       perms: ['CREATE_CONVENIO', 'READ_CONVENIO', 'UPDATE_CONVENIO', 'DELETE_CONVENIO'] },
]

function PermCheckboxes({
  permissions,
  onChange,
}: {
  permissions: string[]
  onChange: (perms: string[]) => void
}) {
  function toggle(perm: string) {
    onChange(
      permissions.includes(perm)
        ? permissions.filter(p => p !== perm)
        : [...permissions, perm],
    )
  }
  function toggleGroup(groupPerms: string[]) {
    const allSelected = groupPerms.every(p => permissions.includes(p))
    onChange(
      allSelected
        ? permissions.filter(p => !groupPerms.includes(p))
        : [...new Set([...permissions, ...groupPerms])],
    )
  }
  return (
    <div className="grid grid-cols-1 gap-2">
      {PERM_GROUPS.map(group => {
        const count = group.perms.filter(p => permissions.includes(p)).length
        const allSelected = count === group.perms.length
        return (
          <div key={group.label} className="rounded-lg border border-border bg-muted/30 overflow-hidden">
            <label className="flex items-center gap-2.5 cursor-pointer px-3 py-2 hover:bg-muted/60 transition-colors">
              <input type="checkbox" checked={allSelected} onChange={() => toggleGroup(group.perms)} className="accent-primary" />
              <span className="text-xs font-semibold text-foreground flex-1">{group.label}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{count}/{group.perms.length}</span>
            </label>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 px-3 pb-2.5 pt-0.5 border-t border-border/50">
              {group.perms.map(perm => {
                const verb = perm.split('_')[0].toLowerCase()
                const verbLabel: Record<string, string> = { create: 'Criar', update: 'Editar', delete: 'Excluir', read: 'Visualizar' }
                return (
                  <label key={perm} className="flex items-center gap-1.5 cursor-pointer py-0.5">
                    <input type="checkbox" checked={permissions.includes(perm)} onChange={() => toggle(perm)} className="accent-primary" />
                    <span className="text-[11px] text-muted-foreground">{verbLabel[verb] ?? verb}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PermSummary({ permissions }: { permissions: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {PERM_GROUPS.map(group => {
        const count = group.perms.filter(p => permissions.includes(p)).length
        if (count === 0) return null
        const full = count === group.perms.length
        return (
          <span
            key={group.label}
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
              full
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {group.label}
            {!full && <span className="opacity-60 tabular-nums">{count}/{group.perms.length}</span>}
          </span>
        )
      })}
    </div>
  )
}

type RegraDialogState =
  | { mode: 'create' }
  | { mode: 'edit'; rule: Rule }

const ALL_PERMS = PERM_GROUPS.flatMap(g => g.perms)

function RegraDialog({
  state,
  onClose,
}: {
  state: RegraDialogState | null
  onClose: () => void
}) {
  const isEdit = state?.mode === 'edit'
  const ruleId = isEdit ? state.rule.id : ''
  const createRule = useCreateRule()
  const updateRule = useUpdateRule(ruleId)
  // O pai remonta o diálogo a cada abertura (key): nova → vazio; edição → dados da regra.
  const [form, setForm] = useState(() => (
    state?.mode === 'edit'
      ? { name: state.rule.name, description: state.rule.description ?? '', permissions: [...state.rule.permissions] }
      : { name: '', description: '', permissions: [] as string[] }
  ))
  const [error, setError] = useState<string | null>(null)
  const [confirmTotal, setConfirmTotal] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.permissions.length === 0) { setError('Selecione ao menos uma permissão.'); return }
    try {
      if (isEdit) {
        await updateRule.mutateAsync(form)
        toast.success('Regra atualizada!')
      } else {
        await createRule.mutateAsync(form)
        toast.success('Regra criada!')
      }
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar regra.'
      setError(msg)
      toast.error(msg)
    }
  }

  const isPending = createRule.isPending || updateRule.isPending
  const hasAllPerms = ALL_PERMS.every(p => form.permissions.includes(p))

  return (
    <Dialog open={!!state} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar regra' : 'Nova regra'}</DialogTitle>
          {isEdit && <DialogDescription>Atualize o nome, descrição e permissões desta regra.</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="regra-form-nome">Nome *</Label>
              <Input
                id="regra-form-nome"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="ex: Gerente de Cursos"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="regra-form-desc">Descrição</Label>
              <Input
                id="regra-form-desc"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Descrição opcional"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Permissões *</Label>
              {!hasAllPerms && !confirmTotal && (
                <button
                  type="button"
                  onClick={() => setConfirmTotal(true)}
                  className="text-[11px] text-amber-600 hover:text-amber-700 font-medium underline underline-offset-2 transition-colors"
                >
                  Conceder acesso total
                </button>
              )}
              {hasAllPerms && (
                <span className="text-[11px] text-primary font-medium">✓ Acesso total concedido</span>
              )}
            </div>

            {confirmTotal && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3 flex flex-col gap-2.5">
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 text-base leading-none mt-0.5">⚠</span>
                  <div>
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Conceder acesso total</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Isso marcará todas as <span className="font-semibold">{ALL_PERMS.length} permissões</span> disponíveis no sistema. O administrador com esta regra terá acesso irrestrito a usuários, cursos, regras, notícias, contatos e banners.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pl-5">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 bg-amber-600 hover:bg-amber-700 text-white text-xs"
                    onClick={() => {
                      setForm(p => ({ ...p, permissions: [...ALL_PERMS] }))
                      setConfirmTotal(false)
                    }}
                  >
                    Sim, conceder acesso total
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setConfirmTotal(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <PermCheckboxes
              permissions={form.permissions}
              onChange={perms => setForm(p => ({ ...p, permissions: perms }))}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar regra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RegrasSheet() {
  const { data: regrasResult, isLoading } = useAdminRules()
  const regras = regrasResult?.data ?? []
  const [dialog, setDialog] = useState<RegraDialogState | null>(null)
  // Muda a cada abertura para o diálogo remontar com o formulário certo.
  const [dialogKey, setDialogKey] = useState(0)
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<Rule | null>(null)
  const { can } = usePermissions()
  const deleteRule = useDeleteRule()

  function openDialog(next: RegraDialogState) {
    setDialog(next)
    setDialogKey(k => k + 1)
  }

  async function handleDeleteRule() {
    if (!deleteRuleTarget) return
    try {
      await deleteRule.mutateAsync(deleteRuleTarget.id)
      toast.success('Regra excluída.')
      setDeleteRuleTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao excluir a regra.'))
    }
  }

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">
            <Shield className="size-4" /> Gerenciar regras
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle>Regras de permissão</SheetTitle>
              <Button size="sm" onClick={() => openDialog({ mode: 'create' })}>
                <Plus className="size-3.5" /> Nova regra
              </Button>
            </div>
            {!isLoading && regras.length > 0 && (
              <p className="text-xs text-muted-foreground">{regras.length} {regras.length === 1 ? 'regra cadastrada' : 'regras cadastradas'}</p>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {isLoading && (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </>
            )}

            {!isLoading && regras.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="size-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">Nenhuma regra cadastrada</p>
                <p className="text-xs text-muted-foreground mt-1">Crie uma regra para definir permissões de acesso.</p>
                <Button size="sm" className="mt-4" onClick={() => openDialog({ mode: 'create' })}>
                  <Plus className="size-3.5" /> Nova regra
                </Button>
              </div>
            )}

            {regras.map(r => (
              <div
                key={r.id}
                className="group rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{r.name}</p>
                      <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
                        {r.permissions.length} perm{r.permissions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {r.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.description}</p>
                    )}
                    <div className="mt-2">
                      <PermSummary permissions={r.permissions} />
                    </div>
                  </div>
                  {/* Sempre visíveis: no celular/tablet não existe "passar o mouse". */}
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost" size="icon"
                      className="size-7"
                      onClick={() => openDialog({ mode: 'edit', rule: r })}
                      aria-label="Editar regra" title="Editar regra"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    {can('DELETE_RULE') && (
                      <Button
                        variant="ghost" size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        disabled={deleteRule.isPending}
                        onClick={() => setDeleteRuleTarget(r)}
                        aria-label="Excluir regra" title="Excluir regra"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <RegraDialog key={dialogKey} state={dialog} onClose={() => setDialog(null)} />

      <DeleteConfirmDialog
        open={!!deleteRuleTarget}
        onOpenChange={open => { if (!open) setDeleteRuleTarget(null) }}
        title="Excluir regra"
        description={<>Tem certeza que deseja excluir a regra <strong>{deleteRuleTarget?.name}</strong>? Esta ação não pode ser desfeita.</>}
        onConfirm={handleDeleteRule}
        pending={deleteRule.isPending}
      />
    </>
  )
}

function NovoAdminSheet() {
  const { data: regrasData } = useAdminRules()
  // Quem já é administrador aparece desabilitado na busca (a lista cabe numa página).
  const { data: adminsData } = useAdminAdmins({ limit: 100 })
  const adminIds = new Set((adminsData?.data ?? []).map(a => a.userDataId))
  const regras = regrasData?.data ?? []
  const createInvite = useCreateAdminInvite()
  const [open, setOpen] = useState(false)
  const [person, setPerson] = useState<PickedPerson | null>(null)
  const [userRole, setUserRole] = useState('')
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reabrir zera link/seleção/erro pra não vazar convite anterior.
  function handleOpenChange(o: boolean) {
    setOpen(o)
    if (o) {
      setPerson(null)
      setUserRole('')
      setLink(null)
      setError(null)
      setCopied(false)
    }
  }

  function pickPerson(p: PickedPerson | null) {
    setPerson(p)
    setLink(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!person) return
    setError(null)
    try {
      const { token } = await createInvite.mutateAsync({ userDataId: person.id, rulesId: userRole })
      setLink(`${window.location.origin}/convite/${token}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao gerar o convite.'
      setError(msg)
      toast.error(msg)
    }
  }

  async function copy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Link copiado!')
    } catch {
      toast.error('Não foi possível copiar — selecione e copie manualmente.')
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button><Plus className="size-4" /> Novo admin</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Convidar administrador</SheetTitle></SheetHeader>
        <div className="p-4">
          <p className="mb-4 text-xs text-muted-foreground">
            Escolha a pessoa e a regra de acesso. Um link é gerado para você enviar —
            a própria pessoa define o usuário e a senha dela para ativar o acesso.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-user">Pessoa (associado) *</Label>
              {person ? (
                <div className="flex min-h-9 items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-1 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{person.name}</span>
                    {person.cpf && <span className="block text-xs text-muted-foreground">CPF {maskCPF(person.cpf)}</span>}
                  </span>
                  <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2" onClick={() => pickPerson(null)}>
                    <X className="size-3.5" /> Trocar
                  </Button>
                </div>
              ) : (
                <PersonPicker
                  id="admin-user"
                  onPick={pickPerson}
                  excludeIds={adminIds}
                  excludedLabel="já é administrador"
                />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-role">Regra de permissão *</Label>
              <NativeSelect id="admin-role" value={userRole} onChange={e => { setUserRole(e.target.value); setLink(null) }} required>
                <option value="">Selecione uma regra</option>
                {regras.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </NativeSelect>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={!person || !userRole || createInvite.isPending}>
              {createInvite.isPending ? 'Gerando...' : 'Gerar link de convite'}
            </Button>
          </form>

          {link && (
            <div className="mt-5 rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-2">
              <p className="text-xs font-medium text-foreground">Link de convite (válido por 7 dias)</p>
              <p className="text-[11px] text-muted-foreground">Envie para a pessoa. Ela abre e define usuário + senha.</p>
              <div className="flex gap-2">
                <Input readOnly value={link} onFocus={e => e.currentTarget.select()} className="text-xs" />
                <Button type="button" variant="outline" onClick={copy} className="shrink-0">
                  {copied ? 'Copiado ✓' : 'Copiar'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}


function ConvitesPendentes({ canRevoke }: { canRevoke: boolean }) {
  const { data: invites, isLoading } = useAdminInvites()
  const revoke = useRevokeAdminInvite()
  const [target, setTarget] = useState<PendingInvite | null>(null)

  if (isLoading || !invites || invites.length === 0) return null

  async function handleRevoke() {
    if (!target) return
    try {
      await revoke.mutateAsync(target.id)
      toast.success('Convite revogado.')
      setTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao revogar convite.'))
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Convites pendentes ({invites.length})
      </p>
      <div className="flex flex-col gap-2">
        {invites.map(inv => (
          <div key={inv.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm">
            <div className="min-w-0">
              <span className="font-medium text-foreground">{inv.userName}</span>
              <span className="text-muted-foreground"> · {inv.ruleName}</span>
              <div className="text-xs">
                {inv.expired
                  ? <span className="text-destructive">Expirado</span>
                  : <span className="text-muted-foreground">Expira em {formatDateFromString(inv.expiresAt.slice(0, 10))}</span>}
              </div>
            </div>
            {canRevoke && (
              <Button
                size="sm" variant="ghost"
                className="h-8 px-2 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => setTarget(inv)}
                aria-label="Revogar convite" title="Revogar convite"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <DeleteConfirmDialog
        open={!!target}
        onOpenChange={o => { if (!o) setTarget(null) }}
        title="Revogar convite"
        description={<>Revogar o convite de <strong>{target?.userName}</strong>? O link deixa de funcionar.</>}
        onConfirm={handleRevoke}
        pending={revoke.isPending}
        confirmLabel="Revogar"
        pendingLabel="Revogando..."
      />
    </div>
  )
}

function EditarAdminDialog({ admin, onClose }: { admin: UserAdmin | null; onClose: () => void }) {
  const { data: regrasData } = useAdminRules()
  const regras = regrasData?.data ?? []
  const updateAdmin = useUpdateAdmin(admin?.id ?? '')
  // O pai remonta o diálogo a cada abertura (key): começa com os dados do admin.
  const [form, setForm] = useState(() => ({
    username: admin?.username ?? '',
    password: '',
    confirm: '',
    userRole: admin?.rulesId ?? '',
  }))
  const [error, setError] = useState<string | null>(null)

  const passwordMismatch = form.password.trim() !== '' && form.password !== form.confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (passwordMismatch) {
      setError('As senhas não coincidem.')
      return
    }
    const body: { username?: string; password?: string; rulesId?: string } = {}
    if (form.username !== admin?.username) body.username = form.username
    if (form.password.trim()) body.password = form.password
    if (form.userRole !== admin?.rulesId) body.rulesId = form.userRole
    if (Object.keys(body).length === 0) { onClose(); return }
    try {
      await updateAdmin.mutateAsync(body)
      toast.success('Administrador atualizado com sucesso!')
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao atualizar administrador.'
      setError(msg)
      toast.error(msg)
    }
  }

  return (
    <Dialog open={!!admin} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar administrador</DialogTitle>
          <DialogDescription>Atualize os dados de acesso de {admin?.userData.name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-admin-username">Username *</Label>
            <Input id="edit-admin-username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-admin-password">Nova senha</Label>
            <PasswordInput id="edit-admin-password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Deixar em branco para manter" autoComplete="new-password" />
            <PasswordStrengthHint password={form.password} context={{ username: form.username }} />
          </div>
          {form.password.trim() !== '' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-admin-confirm">Confirmar nova senha</Label>
              <PasswordInput
                id="edit-admin-confirm"
                value={form.confirm}
                onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                className={passwordMismatch ? 'border-destructive focus-visible:ring-destructive' : undefined}
              />
              {passwordMismatch
                ? <p className="text-xs text-destructive">As senhas não coincidem.</p>
                : form.confirm.trim() !== '' && <p className="text-xs text-emerald-600 dark:text-emerald-400">As senhas coincidem.</p>}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-admin-role">Regra de permissão *</Label>
            <NativeSelect id="edit-admin-role" value={form.userRole} onChange={e => setForm(p => ({ ...p, userRole: e.target.value }))} required>
              <option value="">Selecione uma regra</option>
              {regras.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </NativeSelect>
          </div>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Globe className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Para mostrar esta pessoa na página Contato do site, use{' '}
              <Link to="/admin/configuracoes" search={{ tab: 'contatos' }} className="text-primary hover:underline" onClick={onClose}>
                Configurações do site › Contatos públicos
              </Link>.
            </span>
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={updateAdmin.isPending || passwordMismatch}>
              {updateAdmin.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const USERS_LIMIT_OPTIONS = [10, 20, 50] as const

function RouteComponent() {
  const urlSearch = Route.useSearch()
  const navigate = Route.useNavigate()
  const { can } = usePermissions()
  const [activeTab, setActiveTab] = useState<string>(urlSearch.tab ?? 'associados')
  const [usersPage, setUsersPage] = useState(urlSearch.page ?? 1)
  const [adminsPage, setAdminsPage] = useState(1)
  const [limit, setLimit] = useState<typeof USERS_LIMIT_OPTIONS[number]>(10)
  const [incompleteOnly, setIncompleteOnly] = useState(urlSearch.incomplete ?? false)
  // Visão "Possíveis duplicados": mesma pessoa cadastrada duas vezes.
  const [duplicatesView, setDuplicatesView] = useState(false)
  const [usersSearch, setUsersSearch] = useState(urlSearch.q ?? '')
  // A consulta espera a pessoa parar de digitar (não busca a cada tecla).
  const usersQuery = useDebouncedValue(usersSearch, 300).trim()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [genderFilter, setGenderFilter] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('')
  const [ethnicityFilter, setEthnicityFilter] = useState<'WHITE' | 'BLACK' | 'MIXED' | 'ASIAN' | 'INDIGENOUS' | ''>('')
  const [educationFilter, setEducationFilter] = useState('')
  const [memberTypeFilter, setMemberTypeFilter] = useState('')
  const [memberClassFilter, setMemberClassFilter] = useState('')
  const [rulesFilter, setRulesFilter] = useState('')
  const [deleteAssociadoTarget, setDeleteAssociadoTarget] = useState<UserData | null>(null)
  const [editAdmin, setEditAdmin] = useState<UserAdmin | null>(null)
  // Muda a cada abertura para o diálogo de edição remontar com os dados do admin.
  const [editAdminKey, setEditAdminKey] = useState(0)
  const [deleteAdminTarget, setDeleteAdminTarget] = useState<UserAdmin | null>(null)
  const userSelection = useRowSelection()
  const adminSelection = useRowSelection()
  const [exportingRow, setExportingRow] = useState<string | null>(null)

  // Link que chega com a tela já aberta (ex.: sino de notificações →
  // `?incomplete=true` ou `?tab=admins`): a URL nova passa para os filtros.
  const [lastUrl, setLastUrl] = useState({ tab: urlSearch.tab, incomplete: urlSearch.incomplete })
  if (lastUrl.tab !== urlSearch.tab || lastUrl.incomplete !== urlSearch.incomplete) {
    setLastUrl({ tab: urlSearch.tab, incomplete: urlSearch.incomplete })
    if (lastUrl.tab !== urlSearch.tab) setActiveTab(urlSearch.tab ?? 'associados')
    if (lastUrl.incomplete !== urlSearch.incomplete) {
      setIncompleteOnly(urlSearch.incomplete ?? false)
      setUsersPage(1)
    }
  }

  // Espelha os filtros principais na URL (estado → URL; a URL igual ao estado não muda nada acima).
  useEffect(() => {
    navigate({
      search: {
        tab: activeTab === 'admins' || activeTab === 'empresas' ? activeTab : undefined,
        page: usersPage > 1 ? usersPage : undefined,
        incomplete: incompleteOnly || undefined,
        q: usersQuery || undefined,
      },
      replace: true,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, usersPage, incompleteOnly, usersQuery])

  const activeFiltersCount = [genderFilter, ethnicityFilter, educationFilter, memberTypeFilter, memberClassFilter].filter(Boolean).length

  function clearAdvancedFilters() {
    setGenderFilter('')
    setEthnicityFilter('')
    setEducationFilter('')
    setMemberTypeFilter('')
    setMemberClassFilter('')
    setUsersPage(1)
  }

  const { data: usuariosData, isLoading: loadingUsers, isError: errorUsers, isPlaceholderData: refreshingUsers } = useAdminUsers({
    page: usersPage,
    limit,
    search: usersQuery || undefined,
    incompleteRegistration: incompleteOnly ? true : undefined,
    gender: genderFilter || undefined,
    ethnicity: ethnicityFilter || undefined,
    educationLevel: (educationFilter || undefined) as 'NO_FORMAL_EDUCATION' | 'INCOMPLETE_PRIMARY' | 'COMPLETE_PRIMARY' | 'INCOMPLETE_SECONDARY' | 'COMPLETE_SECONDARY' | 'INCOMPLETE_HIGHER' | 'COMPLETE_HIGHER' | 'POSTGRADUATE' | undefined,
    memberType: memberTypeFilter || undefined,
    memberClassification: memberClassFilter || undefined,
  })
  const { data: regrasData } = useAdminRules()
  const { data: adminsData, isLoading: loadingAdmins, isError: errorAdmins } = useAdminAdmins({
    page: adminsPage,
    limit,
    rulesId: rulesFilter || undefined,
  })
  const deleteWorker = useDeleteWorker()
  const deleteAdmin = useDeleteAdmin()

  const usuarios   = usuariosData?.data       ?? []
  const admins     = adminsData?.data         ?? []
  const userTotal  = usuariosData?.total      ?? 0
  const userPages  = usuariosData?.totalPages ?? 1
  const adminTotal = adminsData?.total        ?? 0
  // Só pro contador da aba (a lista busca com os próprios filtros).
  const { data: companiesCount } = useAdminCompanies({ page: 1, limit: 1 })
  const companyTotal = companiesCount?.total ?? 0
  const adminPages = adminsData?.totalPages   ?? 1

  const userPageIds = usuarios.map(u => u.id)
  const userPageState = userSelection.pageState(userPageIds)
  const adminPageIds = admins.map(a => a.id)
  const adminPageState = adminSelection.pageState(adminPageIds)
  // Exportar administradores exige READ_USER_ADMIN no backend
  const canExportAdmins = can('READ_USER_ADMIN')
  // Mesmos filtros da listagem, sem página/limite.
  const usersExportFilters: ExportParams = {
    search: usersQuery || undefined,
    incompleteRegistration: incompleteOnly ? true : undefined,
    gender: genderFilter || undefined,
    ethnicity: ethnicityFilter || undefined,
    educationLevel: educationFilter || undefined,
    memberType: memberTypeFilter || undefined,
    memberClassification: memberClassFilter || undefined,
  }
  const usersFiltered = !!usersQuery || incompleteOnly || activeFiltersCount > 0

  async function handleExportRow(dataset: ExportDataset, id: string) {
    setExportingRow(id)
    try {
      await downloadExport(dataset, { ids: [id] })
      toast.success('Planilha baixada.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao exportar.'))
    } finally {
      setExportingRow(null)
    }
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    setUsersPage(1)
    setAdminsPage(1)
  }

  function handleRulesFilterChange(v: string) {
    setRulesFilter(v === 'all' ? '' : v)
    setAdminsPage(1)
  }

  async function handleDeleteAssociado() {
    if (!deleteAssociadoTarget) return
    try {
      await deleteWorker.mutateAsync(deleteAssociadoTarget.id)
      userSelection.remove(deleteAssociadoTarget.id)
      toast.success(`Associado "${deleteAssociadoTarget.name}" excluído.`)
      setDeleteAssociadoTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao excluir associado.'))
    }
  }

  async function handleDeleteAdmin() {
    if (!deleteAdminTarget) return
    try {
      await deleteAdmin.mutateAsync(deleteAdminTarget.id)
      adminSelection.remove(deleteAdminTarget.id)
      toast.success(`Administrador "${deleteAdminTarget.userData.name}" excluído.`)
      setDeleteAdminTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao excluir administrador.'))
    }
  }

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Usuários</h1>
              <AjudaLink topico="usuarios" titulo="Usuários" />
            </div>
            <p className="text-sm text-muted-foreground">Associados, empresas e administradores do sistema</p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'associados' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="hidden sm:inline">Itens por página:</span>
                <Select
                  value={String(limit)}
                  onValueChange={v => { setLimit(Number(v) as typeof USERS_LIMIT_OPTIONS[number]); setUsersPage(1); setAdminsPage(1) }}
                >
                  <SelectTrigger className="h-9 w-18">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USERS_LIMIT_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {activeTab === 'associados' && can('CREATE_USER') && (
              <Button asChild>
                <Link to="/admin/usuarios/novo"><Plus className="size-4" /> Novo associado</Link>
              </Button>
            )}
            {activeTab === 'empresas' && can('CREATE_USER') && (
              <Button asChild>
                <Link to="/admin/empresas/novo"><Plus className="size-4" /> Nova empresa</Link>
              </Button>
            )}
            {activeTab === 'admins' && (
              <>
                {can('READ_RULE') && <RegrasSheet />}
                {can('CREATE_USER_ADMIN') && <NovoAdminSheet />}
              </>
            )}
          </div>
        </div>

        <TabsList className="mb-6">
          <TabsTrigger value="associados" className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            Associados
            {userTotal > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {userTotal}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="empresas" className="flex items-center gap-1.5">
            <Building2 className="size-3.5" />
            Empresas
            {companyTotal > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {companyTotal}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="admins" className="flex items-center gap-1.5">
            <Shield className="size-3.5" />
            Administradores
            {adminTotal > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {adminTotal}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="associados">
          {/* Cadastros repetidos da mesma pessoa: a inscrição pública só acha por CPF,
              então quem estava cadastrado sem CPF ganha um segundo cadastro. */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDuplicatesView(v => !v)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 h-9 text-sm font-medium transition-colors ${
                duplicatesView
                  ? 'border-primary/40 bg-primary/5 text-primary dark:border-primary/60'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Copy className="size-3.5" />
              Possíveis duplicados
            </button>
            {duplicatesView && (
              <span className="text-xs text-muted-foreground">
                Mesmo nome, telefone ou e-mail, com pelo menos um cadastro sem CPF.
              </span>
            )}
          </div>

          {duplicatesView ? (
            <DuplicatePeopleList canMerge={can('DELETE_USER')} />
          ) : (<>
          {/* Search + advanced filter toggle */}
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Buscar por nome, email ou CPF..."
              value={usersSearch}
              onChange={e => { setUsersSearch(e.target.value); setUsersPage(1) }}
              className="h-9 flex-1"
            />
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 h-9 text-sm font-medium transition-colors shrink-0 ${
                activeFiltersCount > 0
                  ? 'border-primary/40 bg-primary/5 text-primary dark:border-primary/60'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <SlidersHorizontal className="size-3.5" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`size-3.5 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Advanced filters panel */}
          {showAdvanced && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 mb-3 flex flex-wrap gap-x-3 gap-y-2 items-end">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Gênero</span>
                <Select
                  value={genderFilter || 'all'}
                  onValueChange={v => { setGenderFilter(v === 'all' ? '' : v as 'MALE' | 'FEMALE' | 'OTHER'); setUsersPage(1) }}
                >
                  <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="MALE">Masculino</SelectItem>
                    <SelectItem value="FEMALE">Feminino</SelectItem>
                    <SelectItem value="OTHER">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Etnia</span>
                <Select
                  value={ethnicityFilter || 'all'}
                  onValueChange={v => { setEthnicityFilter(v === 'all' ? '' : v as 'WHITE' | 'BLACK' | 'MIXED' | 'ASIAN' | 'INDIGENOUS'); setUsersPage(1) }}
                >
                  <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="WHITE">Branco</SelectItem>
                    <SelectItem value="BLACK">Preto</SelectItem>
                    <SelectItem value="MIXED">Pardo</SelectItem>
                    <SelectItem value="ASIAN">Amarelo</SelectItem>
                    <SelectItem value="INDIGENOUS">Indígena</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Escolaridade</span>
                <Select
                  value={educationFilter || 'all'}
                  onValueChange={v => { setEducationFilter(v === 'all' ? '' : v); setUsersPage(1) }}
                >
                  <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="NO_FORMAL_EDUCATION">Sem escolaridade</SelectItem>
                    <SelectItem value="INCOMPLETE_PRIMARY">Fund. incompleto</SelectItem>
                    <SelectItem value="COMPLETE_PRIMARY">Fund. completo</SelectItem>
                    <SelectItem value="INCOMPLETE_SECONDARY">Médio incompleto</SelectItem>
                    <SelectItem value="COMPLETE_SECONDARY">Médio completo</SelectItem>
                    <SelectItem value="INCOMPLETE_HIGHER">Superior incompleto</SelectItem>
                    <SelectItem value="COMPLETE_HIGHER">Superior completo</SelectItem>
                    <SelectItem value="POSTGRADUATE">Pós-graduação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Tipo de membro</span>
                <Select
                  value={memberTypeFilter || 'all'}
                  onValueChange={v => { setMemberTypeFilter(v === 'all' ? '' : v); setUsersPage(1) }}
                >
                  <SelectTrigger className="h-8 text-xs w-52"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {MEMBER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Classificação</span>
                <Input
                  className="h-8 text-xs w-36"
                  placeholder="Classificação..."
                  value={memberClassFilter}
                  onChange={e => { setMemberClassFilter(e.target.value); setUsersPage(1) }}
                />
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearAdvancedFilters}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors self-end"
                >
                  <X className="size-3" />
                  Limpar filtros
                </button>
              )}
            </div>
          )}

          {/* Incomplete registration toggle */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => { setIncompleteOnly(v => !v); setUsersPage(1) }}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 h-9 text-sm font-medium transition-colors ${
                incompleteOnly
                  ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <AlertCircle className="size-3.5" />
              Cadastros incompletos
            </button>
            {incompleteOnly && userTotal > 0 && (
              <span className="text-xs text-muted-foreground">
                {userTotal} {userTotal === 1 ? 'cadastro incompleto' : 'cadastros incompletos'}
              </span>
            )}
            {incompleteOnly && userTotal === 0 && !loadingUsers && (
              <span className="text-xs text-emerald-600 font-medium">Todos os cadastros estão completos</span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <SelectionInfo count={userSelection.count} onClear={userSelection.clear} />
              <ExportMenu
                dataset="people"
                filters={usersExportFilters}
                selectedIds={userSelection.ids}
                total={usuariosData?.total}
                filtered={usersFiltered}
                extra={[{
                  label: 'Propriedades dos selecionados',
                  dataset: 'properties',
                  params: { ownerIds: userSelection.ids },
                  disabled: userSelection.count === 0,
                }]}
                className="h-9"
              />
            </div>
          </div>

          {loadingUsers && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loadingUsers && errorUsers && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Erro ao carregar associados.
            </div>
          )}
          {!loadingUsers && !errorUsers && usuarios.length === 0 && (
            <EmptyState
              icon={Users}
              title={usersFiltered ? 'Nenhum associado encontrado' : 'Nenhum associado cadastrado'}
              description={usersFiltered ? 'Confira a busca ou limpe os filtros.' : undefined}
            />
          )}
          {!loadingUsers && usuarios.length > 0 && (
            <>
              <div
                className={`rounded-lg border border-border bg-card overflow-hidden transition-opacity ${refreshingUsers ? 'opacity-60' : ''}`}
                aria-busy={refreshingUsers}
              >
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <SelectCheckbox
                          checked={userPageState === 'all'}
                          indeterminate={userPageState === 'some'}
                          onChange={() => userSelection.togglePage(userPageIds)}
                          label="Selecionar todos desta página"
                        />
                      </TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                      <TableHead className="hidden lg:table-cell">CPF</TableHead>
                      <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                      <TableHead className={`w-28 text-right ${STICKY_ACTIONS_CELL}`}>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map(u => (
                      <TableRow key={u.id} className={STICKY_ACTIONS_ROW}>
                        <TableCell className="w-10">
                          <SelectCheckbox
                            checked={userSelection.isSelected(u.id)}
                            onChange={() => userSelection.toggle(u.id)}
                            label={`Selecionar ${u.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <InitialsAvatar name={u.name} avatar={u.avatar} size="sm" />
                            <div>
                              <p className="font-medium text-sm text-foreground">{u.name}</p>
                              {u.email && <p className="text-xs text-muted-foreground md:hidden">{u.email}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{u.email || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">{u.phone}</TableCell>
                        <TableCell className="text-muted-foreground text-sm font-mono hidden lg:table-cell">{u.cpf ? maskCPF(u.cpf) : '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                          {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className={`text-right ${STICKY_ACTIONS_CELL}`}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="size-7" asChild>
                              <Link to="/admin/usuarios/$id" params={{ id: u.id }} aria-label="Ver associado" title="Ver associado">
                                <ExternalLink className="size-3.5" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="size-7"
                              disabled={exportingRow === u.id}
                              onClick={() => handleExportRow('people', u.id)}
                              aria-label="Exportar associado" title="Exportar associado"
                            >
                              {exportingRow === u.id ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                            </Button>
                            <PermissionButton
                              allowed={can('DELETE_USER')}
                              noPermissionMessage="Sem permissão para excluir usuários"
                              variant="ghost" size="icon"
                              className="size-7 text-destructive/60 hover:text-destructive"
                              onClick={() => setDeleteAssociadoTarget(u)}
                              aria-label="Excluir associado"
                            >
                              <Trash2 className="size-3.5" />
                            </PermissionButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
              <Pagination
                page={usersPage}
                totalPages={userPages}
                total={userTotal}
                limit={limit}
                onPageChange={setUsersPage}
                showLimitSelector={false}
              />
            </>
          )}
          </>)}
        </TabsContent>

        <TabsContent value="empresas">
          <CompaniesList />
        </TabsContent>

        <TabsContent value="admins">
          {can('READ_USER_ADMIN') && <ConvitesPendentes canRevoke={can('CREATE_USER_ADMIN')} />}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Select value={rulesFilter || 'all'} onValueChange={handleRulesFilterChange}>
              <SelectTrigger className="h-9 w-full sm:w-48">
                <SelectValue placeholder="Todas as regras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as regras</SelectItem>
                {(regrasData?.data ?? []).map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canExportAdmins && (
              <div className="flex items-center gap-2 sm:ml-auto">
                <SelectionInfo count={adminSelection.count} onClear={adminSelection.clear} />
                <ExportMenu
                  dataset="admins"
                  filters={{ rulesId: rulesFilter || undefined }}
                  selectedIds={adminSelection.ids}
                  total={adminsData?.total}
                  filtered={!!rulesFilter}
                  className="h-9"
                />
              </div>
            )}
          </div>
          {loadingAdmins && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          )}
          {!loadingAdmins && errorAdmins && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Erro ao carregar administradores.
            </div>
          )}
          {!loadingAdmins && !errorAdmins && admins.length === 0 && (
            <EmptyState icon={Shield} title="Nenhum administrador cadastrado" description={'Use o botão "Novo admin" para adicionar.'} />
          )}
          {!loadingAdmins && admins.length > 0 && (
            <>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canExportAdmins && (
                      <TableHead className="w-10">
                        <SelectCheckbox
                          checked={adminPageState === 'all'}
                          indeterminate={adminPageState === 'some'}
                          onChange={() => adminSelection.togglePage(adminPageIds)}
                          label="Selecionar todos desta página"
                        />
                      </TableHead>
                    )}
                    <TableHead>Administrador</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead>Regra</TableHead>
                    <TableHead className={`w-28 text-right ${STICKY_ACTIONS_CELL}`}>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map(a => (
                    <TableRow key={a.id} className={STICKY_ACTIONS_ROW}>
                      {canExportAdmins && (
                        <TableCell className="w-10">
                          <SelectCheckbox
                            checked={adminSelection.isSelected(a.id)}
                            onChange={() => adminSelection.toggle(a.id)}
                            label={`Selecionar ${a.userData.name}`}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={a.userData.name} avatar={a.userData.avatar} size="sm" />
                          <div>
                            <p className="font-medium text-sm text-foreground">{a.userData.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">@{a.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{a.userData.email || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Shield className="size-3.5 text-muted-foreground" />
                          <Badge variant="outline" className="text-xs">{a.rules.name}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right ${STICKY_ACTIONS_CELL}`}>
                        <div className="flex items-center justify-end gap-1">
                          <PermissionButton
                            allowed={can('UPDATE_USER_ADMIN')}
                            noPermissionMessage="Sem permissão para editar administradores"
                            variant="ghost" size="icon"
                            className="size-7"
                            onClick={() => { setEditAdmin(a); setEditAdminKey(k => k + 1) }}
                          >
                            <Pencil className="size-3.5" />
                          </PermissionButton>
                          {canExportAdmins && (
                            <Button
                              variant="ghost" size="icon"
                              className="size-7"
                              disabled={exportingRow === a.id}
                              onClick={() => handleExportRow('admins', a.id)}
                              aria-label="Exportar administrador" title="Exportar administrador"
                            >
                              {exportingRow === a.id ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                            </Button>
                          )}
                          <PermissionButton
                            allowed={can('DELETE_USER_ADMIN')}
                            noPermissionMessage="Sem permissão para excluir administradores"
                            variant="ghost" size="icon"
                            className="size-7 text-destructive/60 hover:text-destructive"
                            onClick={() => setDeleteAdminTarget(a)}
                          >
                            <Trash2 className="size-3.5" />
                          </PermissionButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={adminsPage}
              totalPages={adminPages}
              total={adminTotal}
              limit={limit}
              onPageChange={setAdminsPage}
              showLimitSelector={false}
            />
            </>
          )}
        </TabsContent>
      </Tabs>

      <EditarAdminDialog key={editAdminKey} admin={editAdmin} onClose={() => setEditAdmin(null)} />

      <DeleteConfirmDialog
        open={!!deleteAssociadoTarget}
        onOpenChange={open => !open && setDeleteAssociadoTarget(null)}
        title="Excluir associado"
        description={<>
          <span className="font-medium text-foreground">{deleteAssociadoTarget?.name}</span>{deleteAssociadoTarget?.email && <> — {deleteAssociadoTarget.email}</>}
          <br />Esta ação não pode ser desfeita.
        </>}
        onConfirm={handleDeleteAssociado}
        pending={deleteWorker.isPending}
      />

      <DeleteConfirmDialog
        open={!!deleteAdminTarget}
        onOpenChange={open => !open && setDeleteAdminTarget(null)}
        title="Excluir administrador"
        description={<>
          <span className="font-medium text-foreground">{deleteAdminTarget?.userData.name}</span> <span className="font-mono">@{deleteAdminTarget?.username}</span>
          <br />Esta ação não pode ser desfeita.
        </>}
        onConfirm={handleDeleteAdmin}
        pending={deleteAdmin.isPending}
      />
    </div>
  )
}
