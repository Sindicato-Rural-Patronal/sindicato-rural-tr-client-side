import { createFileRoute, Link } from '@tanstack/react-router'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
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
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent, tabsWrapClass } from '@/components/ui/tabs'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableHeader, TableBody,
  TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { AlertCircle, AlertTriangle, BadgeCheck, FileSpreadsheet, FileText, Plus, Search, Shield, Users, Pencil, Trash2, ExternalLink, Globe, ChevronDown, X, SlidersHorizontal, Building2, Download, Loader2, Copy } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { NativeSelect } from '@/components/ui/native-select'
import { EmptyState } from '@/components/EmptyState'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { Pagination } from '@/components/ui/pagination'
import { InitialsAvatar } from '@/components/InitialsAvatar'
import { PasswordInput } from '@/components/PasswordInput'
import { PasswordStrengthHint } from '@/components/PasswordStrengthHint'
import { STICKY_ACTIONS_CELL, STICKY_ACTIONS_ROW } from '@/lib/table-sticky-actions'
import { CompaniesList } from '@/components/cadastro/CompaniesList'
import { DuplicatePeopleList } from '@/components/cadastro/DuplicatePeopleList'
import { PersonNameCell } from '@/components/cadastro/PersonNameCell'
import { useAdminCompanies } from '@/hooks/useCompanies'
import { MEMBER_TYPES } from '@/lib/member-types'
import { EDUCATION_OPTIONS, ETHNICITY_OPTIONS } from '@/lib/user-form-options'
import { downloadExport, exportErrorMessage, type ExportDataset, type ExportFormat, type ExportParams } from '@/lib/export'
import { useRowSelection } from '@/hooks/useRowSelection'
import { ExportMenu, SelectCheckbox, SelectionInfo } from '@/components/export/ExportMenu'
import { PersonPicker, type PickedPerson } from '@/components/PersonPicker'
import { AjudaLink } from '@/components/ajuda/AjudaLink'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { BulkDeleteButton } from '@/components/export/BulkDeleteButton'
import { maskCPF } from '@/utils/masks'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { RowActions, type RowAction } from '@/components/RowActions'
import { FilterBar, FilterField } from '@/components/FilterBar'
import { MemberBadge } from '@/components/MemberBadge'

const USERS_TABS = ['pessoas', 'associados', 'empresas', 'admins'] as const
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
              <span className="text-xs text-muted-foreground tabular-nums">{count}/{group.perms.length}</span>
            </label>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 px-3 pb-2.5 pt-0.5 border-t border-border/50">
              {group.perms.map(perm => {
                const verb = perm.split('_')[0].toLowerCase()
                const verbLabel: Record<string, string> = { create: 'Criar', update: 'Editar', delete: 'Excluir', read: 'Visualizar' }
                return (
                  <label key={perm} className="flex items-center gap-1.5 cursor-pointer py-0.5">
                    <input type="checkbox" checked={permissions.includes(perm)} onChange={() => toggle(perm)} className="accent-primary" />
                    <span className="text-xs text-muted-foreground">{verbLabel[verb] ?? verb}</span>
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
          // Grupo inteiro: etiqueta neutra; grupo em parte: só a linha, com a conta.
          <Badge key={group.label} variant={full ? 'neutral' : 'outline'}>
            {group.label}
            {!full && <span className="tabular-nums text-muted-foreground">{count}/{group.perms.length}</span>}
          </Badge>
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
        toast.success('Regra atualizada.')
      } else {
        await createRule.mutateAsync(form)
        toast.success('Regra criada.')
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
                  className="text-xs font-medium text-warning underline underline-offset-2 transition-colors hover:text-warning/80"
                >
                  Conceder acesso total
                </button>
              )}
              {hasAllPerms && (
                <span className="text-xs font-medium text-success">✓ Acesso total concedido</span>
              )}
            </div>

            {confirmTotal && (
              <div className="rounded-lg border border-warning/30 bg-warning-soft p-3 flex flex-col gap-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Conceder acesso total</p>
                    <p className="text-xs text-warning mt-0.5">
                      Isso marcará todas as <span className="font-semibold">{ALL_PERMS.length} permissões</span> disponíveis no sistema. O administrador com esta regra terá acesso irrestrito a usuários, cursos, regras, notícias, contatos e banners.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pl-6">
                  <Button
                    type="button"
                    size="xs"
                    className="bg-warning text-warning-foreground hover:bg-warning/90"
                    onClick={() => {
                      setForm(p => ({ ...p, permissions: [...ALL_PERMS] }))
                      setConfirmTotal(false)
                    }}
                  >
                    Sim, conceder acesso total
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
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
  const { data: regrasResult, isLoading, isError, isFetching, refetch } = useAdminRules()
  const regras = regrasResult?.data ?? []
  const regrasFalharam = isError && !regrasResult
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
                <Plus className="size-4" /> Nova regra
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

            {regrasFalharam && (
              <LoadErrorRetry
                className="rounded-xl border border-border bg-card"
                message="Não foi possível carregar as regras de permissão."
                onRetry={() => void refetch()}
                retrying={isFetching}
              />
            )}

            {!isLoading && !regrasFalharam && regras.length === 0 && (
              <EmptyState
                icon={Shield}
                title="Nenhuma regra cadastrada"
                description="Crie uma regra para definir permissões de acesso."
                action={(
                  <Button size="sm" onClick={() => openDialog({ mode: 'create' })}>
                    <Plus className="size-4" /> Nova regra
                  </Button>
                )}
              />
            )}

            {regras.map(r => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Shield className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{r.name}</p>
                      <span className="text-xs tabular-nums text-faint-foreground shrink-0">
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
                  <RowActions
                    label={`Ações da regra ${r.name}`}
                    className="-my-1.5 -mr-1.5 shrink-0"
                    actions={[
                      { label: 'Editar regra', icon: Pencil, onClick: () => openDialog({ mode: 'edit', rule: r }) },
                      {
                        label: 'Excluir regra', icon: Trash2, onClick: () => setDeleteRuleTarget(r), destructive: true,
                        hidden: !can('DELETE_RULE'), disabled: deleteRule.isPending,
                      },
                    ]}
                  />
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
  const { data: regrasData, isError: regrasQueryError, isFetching: buscandoRegras, refetch: recarregarRegras } = useAdminRules()
  const regrasErro = regrasQueryError && !regrasData
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
      toast.success('Link copiado.')
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
                <div className="flex min-h-9 items-center justify-between gap-2 rounded-lg border border-border bg-muted px-3 py-1 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{person.name}</span>
                    {person.cpf && <span className="block text-xs tabular-nums text-muted-foreground">CPF {maskCPF(person.cpf)}</span>}
                  </span>
                  <Button type="button" variant="ghost" size="xs" className="shrink-0" onClick={() => pickPerson(null)}>
                    <X /> Trocar
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
              {regrasErro && (
                <LoadErrorRetry variant="inline" message="Não foi possível carregar as regras de permissão." onRetry={() => void recarregarRegras()} retrying={buscandoRegras} />
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={!person || !userRole || createInvite.isPending}>
              {createInvite.isPending ? 'Gerando...' : 'Gerar link de convite'}
            </Button>
          </form>

          {link && (
            <div className="mt-5 rounded-xl border border-border bg-muted p-3 flex flex-col gap-2">
              <p className="text-xs font-medium text-foreground">Link de convite (válido por 7 dias)</p>
              <p className="text-xs text-muted-foreground">Envie para a pessoa. Ela abre e define usuário + senha.</p>
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
  const { data: invites, isLoading, isError, isFetching, refetch } = useAdminInvites()
  const revoke = useRevokeAdminInvite()
  const [target, setTarget] = useState<PendingInvite | null>(null)

  // O bloco só existe quando há convite pendente; a falha vira uma linha com
  // "Tentar de novo" (sumir calado escondia convites que estavam lá).
  if (isError && !invites) {
    return (
      <LoadErrorRetry variant="inline" message="Não foi possível carregar os convites pendentes." onRetry={() => void refetch()} retrying={isFetching} />
    )
  }

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
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="mb-2 text-sm font-medium text-foreground">
        Convites pendentes <span className="tabular-nums text-muted-foreground">({invites.length})</span>
      </p>
      <div className="flex flex-col gap-2">
        {invites.map(inv => (
          <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <div className="min-w-0">
              <span className="font-medium text-foreground">{inv.userName}</span>
              <span className="text-muted-foreground"> · {inv.ruleName}</span>
              <div className="text-xs">
                {inv.expired
                  ? <span className="text-destructive">Expirado</span>
                  : <span className="text-muted-foreground">Expira em <span className="num">{formatDateFromString(inv.expiresAt.slice(0, 10))}</span></span>}
              </div>
            </div>
            <RowActions
              label={`Ações do convite de ${inv.userName}`}
              className="shrink-0"
              actions={[{ label: 'Revogar convite', icon: Trash2, onClick: () => setTarget(inv), destructive: true, hidden: !canRevoke }]}
            />
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
  const { data: regrasData, isError: regrasQueryError, isFetching: buscandoRegras, refetch: recarregarRegras } = useAdminRules()
  const regrasErro = regrasQueryError && !regrasData
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
      toast.success('Administrador atualizado com sucesso.')
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
                : form.confirm.trim() !== '' && <p className="text-xs text-success">As senhas coincidem.</p>}
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
            {regrasErro && (
              <LoadErrorRetry variant="inline" message="Não foi possível carregar as regras de permissão." onRetry={() => void recarregarRegras()} retrying={buscandoRegras} />
            )}
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
  const [activeTab, setActiveTab] = useState<string>(urlSearch.tab ?? 'pessoas')
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
    if (lastUrl.tab !== urlSearch.tab) setActiveTab(urlSearch.tab ?? 'pessoas')
    if (lastUrl.incomplete !== urlSearch.incomplete) {
      setIncompleteOnly(urlSearch.incomplete ?? false)
      setUsersPage(1)
    }
  }

  // Espelha os filtros principais na URL (estado → URL; a URL igual ao estado não muda nada acima).
  useEffect(() => {
    navigate({
      search: {
        tab: activeTab === 'pessoas' ? undefined : (activeTab as UsersTab),
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

  const { data: usuariosData, isLoading: loadingUsers, isError: errorUsers, isPlaceholderData: refreshingUsers, isFetching: fetchingUsers, refetch: refetchUsers } = useAdminUsers({
    page: usersPage,
    limit,
    search: usersQuery || undefined,
    incompleteRegistration: incompleteOnly ? true : undefined,
    gender: genderFilter || undefined,
    ethnicity: ethnicityFilter || undefined,
    educationLevel: (educationFilter || undefined) as 'NO_FORMAL_EDUCATION' | 'INCOMPLETE_PRIMARY' | 'COMPLETE_PRIMARY' | 'INCOMPLETE_SECONDARY' | 'COMPLETE_SECONDARY' | 'INCOMPLETE_HIGHER' | 'COMPLETE_HIGHER' | 'POSTGRADUATE' | undefined,
    memberType: memberTypeFilter || undefined,
    memberClassification: memberClassFilter || undefined,
    // A aba "Associados" é a mesma lista de pessoas, só com quem está em dia.
    activeMember: activeTab === 'associados' ? true : undefined,
  })
  const { data: regrasData } = useAdminRules()
  const nomeDaRegraFiltrada = rulesFilter ? regrasData?.data.find(r => r.id === rulesFilter)?.name : undefined
  const { data: adminsData, isLoading: loadingAdmins, isError: errorAdmins, isFetching: fetchingAdmins, refetch: refetchAdmins } = useAdminAdmins({
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
    // Sem isto, exportar na aba "Associados" baixava TODAS as pessoas com o
    // rótulo do total de associados — planilha errada sem nenhum aviso.
    activeMember: activeTab === 'associados' ? true : undefined,
    incompleteRegistration: incompleteOnly ? true : undefined,
    gender: genderFilter || undefined,
    ethnicity: ethnicityFilter || undefined,
    educationLevel: educationFilter || undefined,
    memberType: memberTypeFilter || undefined,
    memberClassification: memberClassFilter || undefined,
  }
  const usersFiltered = !!usersQuery || incompleteOnly || activeFiltersCount > 0
    || activeTab === 'associados'

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

  const [baixandoRelatorio, setBaixandoRelatorio] = useState(false)

  async function baixarRelatorio(formato: ExportFormat) {
    setBaixandoRelatorio(true)
    try {
      // O PDF é montado aqui do CSV da API: a linha da auditoria é a da planilha
      // (não chama registrarDocumento, senão seriam duas linhas).
      const n = await downloadExport('cadastros', {}, formato)
      toast.success(n >= 0
        ? `Relatório de cadastros baixado (${n.toLocaleString('pt-BR')} registros).`
        : 'Relatório de cadastros baixado.')
    } catch (e) {
      // O 429 ("Muitas exportações seguidas…") com o texto da API.
      toast.error(exportErrorMessage(e, 'Não foi possível gerar o relatório.'))
    } finally {
      setBaixandoRelatorio(false)
    }
  }

  // "Pessoa física" e "Associados" mostram a MESMA lista; muda só o filtro.
  const ehAbaDePessoa = activeTab === 'pessoas' || activeTab === 'associados'

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

  // Ações da linha (tabela e cartão do celular): as mesmas, na mesma ordem.
  function personActions(u: UserData): RowAction[] {
    return [
      { label: 'Ver associado', icon: ExternalLink, onClick: () => void navigate({ to: '/admin/usuarios/$id', params: { id: u.id } }) },
      { label: 'Exportar associado', icon: Download, onClick: () => void handleExportRow('people', u.id), busy: exportingRow === u.id },
      {
        label: 'Excluir associado', icon: Trash2, onClick: () => setDeleteAssociadoTarget(u), destructive: true,
        disabled: !can('DELETE_USER'), reason: 'Sem permissão para excluir usuários',
      },
    ]
  }

  function adminActions(a: UserAdmin): RowAction[] {
    return [
      {
        label: 'Editar administrador', icon: Pencil, onClick: () => { setEditAdmin(a); setEditAdminKey(k => k + 1) },
        disabled: !can('UPDATE_USER_ADMIN'), reason: 'Sem permissão para editar administradores',
      },
      { label: 'Exportar administrador', icon: Download, onClick: () => void handleExportRow('admins', a.id), busy: exportingRow === a.id, hidden: !canExportAdmins },
      {
        label: 'Excluir administrador', icon: Trash2, onClick: () => setDeleteAdminTarget(a), destructive: true,
        disabled: !can('DELETE_USER_ADMIN'), reason: 'Sem permissão para excluir administradores',
      },
    ]
  }

  const filtroAtivo = 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary'

  return (
    <PageContainer>
      <PageHeader
        title="Usuários"
        description="Pessoas, empresas e administradores do sistema"
        help={<AjudaLink topico="usuarios" titulo="Usuários" />}
        actions={<>
          {/* Os quatro tipos num arquivo só. Pede READ_USER_ADMIN porque
              traz os administradores junto. */}
          {can('READ_USER_ADMIN') && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={baixandoRelatorio}>
                  {baixandoRelatorio
                    ? <Loader2 className="size-4 animate-spin" />
                    : <Download className="size-4" />}
                  Relatório de cadastros
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" collisionPadding={8} className="w-60">
                <DropdownMenuItem onSelect={() => void baixarRelatorio('csv')}>
                  <FileSpreadsheet className="size-4" /> Planilha CSV
                </DropdownMenuItem>
                {/* Uma aba por seção (Pessoas físicas, Associados em dia, Pessoas jurídicas, Administradores). */}
                <DropdownMenuItem onSelect={() => void baixarRelatorio('xlsx')}>
                  <FileSpreadsheet className="size-4" /> Planilha do Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void baixarRelatorio('pdf')}>
                  <FileText className="size-4" /> Relatório em PDF (para imprimir)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {activeTab === 'admins' && can('READ_RULE') && <RegrasSheet />}
          {ehAbaDePessoa && can('CREATE_USER') && (
            <Button asChild>
              <Link to="/admin/usuarios/novo"><Plus className="size-4" /> Novo associado</Link>
            </Button>
          )}
          {activeTab === 'empresas' && can('CREATE_USER') && (
            <Button asChild>
              <Link to="/admin/empresas/novo"><Plus className="size-4" /> Nova empresa</Link>
            </Button>
          )}
          {activeTab === 'admins' && can('CREATE_USER_ADMIN') && <NovoAdminSheet />}
        </>}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className={tabsWrapClass}>
          <TabsTrigger value="pessoas">
            <Users />
            Pessoa física
            {/* `userTotal` é o total da consulta ATUAL. Na aba de associados
                ele conta só os em dia, então mostrá-lo aqui mentiria. */}
            {activeTab === 'pessoas' && userTotal > 0 && <TabCount n={userTotal} />}
          </TabsTrigger>
          <TabsTrigger value="associados">
            <BadgeCheck />
            Associados
            {activeTab === 'associados' && userTotal > 0 && <TabCount n={userTotal} />}
          </TabsTrigger>
          <TabsTrigger value="empresas">
            <Building2 />
            Pessoa jurídica
            {companyTotal > 0 && <TabCount n={companyTotal} />}
          </TabsTrigger>
          <TabsTrigger value="admins">
            <Shield />
            Administradores
            {adminTotal > 0 && <TabCount n={adminTotal} />}
          </TabsTrigger>
        </TabsList>

        {/* Uma lista só para as duas abas de pessoa: o `value` acompanha a aba
            aberta, então o mesmo bloco serve a "Pessoa física" e a "Associados"
            sem duplicar 300 linhas de tela. */}
        <TabsContent value={activeTab === 'associados' ? 'associados' : 'pessoas'} className="flex flex-col gap-4">
          <FilterBar
            actions={duplicatesView ? undefined : <>
              <SelectionInfo count={userSelection.count} onClear={userSelection.clear} />
              <BulkDeleteButton
                ids={userSelection.ids}
                singular="pessoa"
                plural="pessoas"
                allowed={can('DELETE_USER')}
                onDelete={id => deleteWorker.mutateAsync(id)}
                onDone={() => userSelection.clear()}
              />
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
                  builder: true,
                }]}
              />
            </>}
          >
            {!duplicatesView && (
              <div className="relative sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  placeholder="Buscar por nome, email ou CPF..."
                  aria-label="Buscar por nome, email ou CPF"
                  value={usersSearch}
                  onChange={e => { setUsersSearch(e.target.value); setUsersPage(1) }}
                  className="pl-9"
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {!duplicatesView && (<>
                <Button
                  type="button"
                  variant="outline"
                  aria-expanded={showAdvanced}
                  onClick={() => setShowAdvanced(v => !v)}
                  className={cn(activeFiltersCount > 0 && filtroAtivo)}
                >
                  <SlidersHorizontal className="size-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-medium tabular-nums text-primary-foreground">
                      {activeFiltersCount}
                    </span>
                  )}
                  <ChevronDown className={cn('size-4 transition-transform', showAdvanced && 'rotate-180')} />
                </Button>
                {/* Cadastro incompleto é o que pede atenção: o filtro ligado fica em âmbar. */}
                <Button
                  type="button"
                  variant="outline"
                  aria-pressed={incompleteOnly}
                  onClick={() => { setIncompleteOnly(v => !v); setUsersPage(1) }}
                  className={cn(incompleteOnly && 'border-warning/30 bg-warning-soft text-warning hover:bg-warning-soft hover:text-warning')}
                >
                  <AlertCircle className="size-4" />
                  Cadastros incompletos
                </Button>
              </>)}
              {/* Cadastros repetidos da mesma pessoa: a inscrição pública só acha por CPF,
                  então quem estava cadastrado sem CPF ganha um segundo cadastro. */}
              <Button
                type="button"
                variant="outline"
                aria-pressed={duplicatesView}
                onClick={() => setDuplicatesView(v => !v)}
                className={cn(duplicatesView && filtroAtivo)}
              >
                <Copy className="size-4" />
                Possíveis duplicados
              </Button>
            </div>
          </FilterBar>

          {duplicatesView && (
            <p className="-mt-1 text-xs text-muted-foreground">
              Mesmo nome, telefone ou e-mail, com pelo menos um cadastro sem CPF
            </p>
          )}

          {duplicatesView ? (
            <DuplicatePeopleList canMerge={can('DELETE_USER')} />
          ) : (<>
          {/* Filtros avançados */}
          {showAdvanced && (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-end">
              <FilterField label="Gênero" htmlFor="f-genero">
                <Select
                  value={genderFilter || 'all'}
                  onValueChange={v => { setGenderFilter(v === 'all' ? '' : v as 'MALE' | 'FEMALE' | 'OTHER'); setUsersPage(1) }}
                >
                  <SelectTrigger id="f-genero" className="w-full sm:w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="MALE">Masculino</SelectItem>
                    <SelectItem value="FEMALE">Feminino</SelectItem>
                    <SelectItem value="OTHER">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Etnia" htmlFor="f-etnia">
                <Select
                  value={ethnicityFilter || 'all'}
                  onValueChange={v => { setEthnicityFilter(v === 'all' ? '' : v as 'WHITE' | 'BLACK' | 'MIXED' | 'ASIAN' | 'INDIGENOUS'); setUsersPage(1) }}
                >
                  <SelectTrigger id="f-etnia" className="w-full sm:w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {ETHNICITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Escolaridade" htmlFor="f-escolaridade">
                <Select
                  value={educationFilter || 'all'}
                  onValueChange={v => { setEducationFilter(v === 'all' ? '' : v); setUsersPage(1) }}
                >
                  {/* sm:w-56: "Fundamental incompleto" (por extenso desde a SR-111) pede ~160 px em
                      text-sm; o w-48 deixa 146 e cortava. */}
                  <SelectTrigger id="f-escolaridade" className="w-full sm:w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {EDUCATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Tipo de membro" htmlFor="f-tipo-membro">
                <Select
                  value={memberTypeFilter || 'all'}
                  onValueChange={v => { setMemberTypeFilter(v === 'all' ? '' : v); setUsersPage(1) }}
                >
                  <SelectTrigger id="f-tipo-membro" className="w-full sm:w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {MEMBER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Classificação" htmlFor="f-classificacao">
                <Input
                  id="f-classificacao"
                  className="w-full sm:w-40"
                  placeholder="Classificação..."
                  value={memberClassFilter}
                  onChange={e => { setMemberClassFilter(e.target.value); setUsersPage(1) }}
                />
              </FilterField>
              {activeFiltersCount > 0 && (
                <Button type="button" variant="ghost" onClick={clearAdvancedFilters} className="text-muted-foreground sm:self-end">
                  <X className="size-4" />
                  Limpar filtros
                </Button>
              )}
            </div>
          )}

          {incompleteOnly && userTotal > 0 && (
            <p className="-mt-1 text-xs text-muted-foreground">
              <span className="tabular-nums">{userTotal}</span> {userTotal === 1 ? 'cadastro incompleto' : 'cadastros incompletos'}
            </p>
          )}
          {incompleteOnly && userTotal === 0 && !loadingUsers && !errorUsers && (
            <p className="-mt-1 text-xs font-medium text-success">Todos os cadastros estão completos</p>
          )}

          {loadingUsers && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loadingUsers && errorUsers && (
            <LoadErrorRetry
              className="rounded-xl border border-border bg-card"
              message="Não foi possível carregar a lista de pessoas."
              onRetry={() => void refetchUsers()}
              retrying={fetchingUsers}
            />
          )}
          {!loadingUsers && !errorUsers && usuarios.length === 0 && (
            <EmptyState
              framed
              icon={Users}
              title={usersFiltered ? 'Nenhum associado encontrado' : 'Nenhum associado cadastrado'}
              description={usersFiltered ? 'Confira a busca ou limpe os filtros.' : undefined}
            />
          )}
          {!loadingUsers && usuarios.length > 0 && (
            <div className={cn('flex flex-col gap-2 transition-opacity', refreshingUsers && 'opacity-60')} aria-busy={refreshingUsers}>
              {/* Celular: um cartão por pessoa, com o nome inteiro (na tabela ele era cortado). */}
              <div className="flex flex-col gap-2 md:hidden">
                {usuarios.length > 1 && (
                  <label className="flex min-h-9 w-fit items-center gap-2 px-3 text-xs text-muted-foreground">
                    <SelectCheckbox
                      checked={userPageState === 'all'}
                      indeterminate={userPageState === 'some'}
                      onChange={() => userSelection.togglePage(userPageIds)}
                      label="Selecionar todos desta página"
                    />
                    Selecionar todos desta página
                  </label>
                )}
                <ul className="flex flex-col gap-2" aria-label="Pessoas">
                  {usuarios.map(u => (
                    <li key={u.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                      <span className="flex h-8 shrink-0 items-center">
                        <SelectCheckbox
                          checked={userSelection.isSelected(u.id)}
                          onChange={() => userSelection.toggle(u.id)}
                          label={`Selecionar ${u.name}`}
                        />
                      </span>
                      <InitialsAvatar name={u.name} avatar={u.avatar} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/admin/usuarios/$id"
                          params={{ id: u.id }}
                          className="block break-words text-sm font-medium text-foreground hover:underline"
                        >
                          {u.name}
                        </Link>
                        <MemberBadge person={u} className="mt-1 flex w-fit" />
                        {u.email && <p className="mt-1 break-all text-xs text-muted-foreground">{u.email}</p>}
                        {u.phone && <p className="text-xs tabular-nums text-muted-foreground">{u.phone}</p>}
                      </div>
                      <RowActions visible={0} label={`Ações de ${u.name}`} actions={personActions(u)} className="-my-1.5 -mr-1.5" />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
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
                      <TableHead>Email</TableHead>
                      <TableHead className="hidden xl:table-cell">Telefone</TableHead>
                      <TableHead className="hidden xl:table-cell">CPF</TableHead>
                      <TableHead className="hidden xl:table-cell">Cadastro</TableHead>
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
                        {/* Sem rolagem lateral: o nome tem largura máxima (reticências) e as colunas menores
                            só entram quando há espaço (o menu fixo come 256px a partir de lg). */}
                        <TableCell className="max-w-[16rem] xl:max-w-[14rem]">
                          <PersonNameCell person={u} />
                        </TableCell>
                        <TableCell className="max-w-[12rem] text-sm text-muted-foreground 2xl:max-w-[20rem]">
                          <span className="block truncate" title={u.email || undefined}>{u.email || '—'}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm tabular-nums hidden xl:table-cell">{u.phone}</TableCell>
                        <TableCell className="text-muted-foreground text-sm tabular-nums hidden xl:table-cell">{u.cpf ? maskCPF(u.cpf) : '—'}</TableCell>
                        <TableCell className="num text-muted-foreground text-sm hidden xl:table-cell">
                          {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className={`text-right ${STICKY_ACTIONS_CELL}`}>
                          <RowActions label={`Ações de ${u.name}`} actions={personActions(u)} />
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
                // "Por página" junto da lista (antes ficava no cabeçalho da tela, ao lado de "Novo associado").
                onLimitChange={n => { setLimit(n as typeof USERS_LIMIT_OPTIONS[number]); setUsersPage(1); setAdminsPage(1) }}
                limitOptions={[...USERS_LIMIT_OPTIONS]}
              />
            </div>
          )}
          </>)}
        </TabsContent>

        <TabsContent value="empresas">
          <CompaniesList />
        </TabsContent>

        <TabsContent value="admins" className="flex flex-col gap-4">
          {can('READ_USER_ADMIN') && <ConvitesPendentes canRevoke={can('CREATE_USER_ADMIN')} />}
          <FilterBar
            actions={canExportAdmins ? <>
              <SelectionInfo count={adminSelection.count} onClear={adminSelection.clear} />
              <BulkDeleteButton
                ids={adminSelection.ids}
                singular="administrador"
                plural="administradores"
                allowed={can('DELETE_USER_ADMIN')}
                onDelete={id => deleteAdmin.mutateAsync(id)}
                onDone={() => adminSelection.clear()}
              />
              <ExportMenu
                dataset="admins"
                filters={{ rulesId: rulesFilter || undefined }}
                selectedIds={adminSelection.ids}
                total={adminsData?.total}
                filtered={!!rulesFilter}
                // O filtro manda o id; o montador diz o nome, como a API no PDF.
                filterTexts={nomeDaRegraFiltrada ? { rulesId: `Regra de acesso: ${nomeDaRegraFiltrada}` } : undefined}
              />
            </> : undefined}
          >
            <Select value={rulesFilter || 'all'} onValueChange={handleRulesFilterChange}>
              <SelectTrigger className="w-full sm:w-56" aria-label="Filtrar por regra">
                <SelectValue placeholder="Todas as regras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as regras</SelectItem>
                {(regrasData?.data ?? []).map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterBar>
          {loadingAdmins && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          )}
          {!loadingAdmins && errorAdmins && (
            <LoadErrorRetry
              className="rounded-xl border border-border bg-card"
              message="Não foi possível carregar os administradores."
              onRetry={() => void refetchAdmins()}
              retrying={fetchingAdmins}
            />
          )}
          {!loadingAdmins && !errorAdmins && admins.length === 0 && (
            <EmptyState framed icon={Shield} title="Nenhum administrador cadastrado" description={'Use o botão "Novo admin" para adicionar.'} />
          )}
          {!loadingAdmins && admins.length > 0 && (
            <div className="flex flex-col gap-2">
            {/* Celular: um cartão por administrador, com o nome inteiro. */}
            <ul className="flex flex-col gap-2 md:hidden" aria-label="Administradores">
              {admins.map(a => (
                <li key={a.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                  {canExportAdmins && (
                    <span className="flex h-8 shrink-0 items-center">
                      <SelectCheckbox
                        checked={adminSelection.isSelected(a.id)}
                        onChange={() => adminSelection.toggle(a.id)}
                        label={`Selecionar ${a.userData.name}`}
                      />
                    </span>
                  )}
                  <InitialsAvatar name={a.userData.name} avatar={a.userData.avatar} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-foreground">{a.userData.name}</p>
                    <p className="break-all text-xs text-muted-foreground">@{a.username}</p>
                    <Badge variant="outline" className="mt-1 max-w-full" title={a.rules.name}>
                      <Shield aria-hidden /><span className="truncate">{a.rules.name}</span>
                    </Badge>
                  </div>
                  <RowActions visible={0} label={`Ações de ${a.userData.name}`} actions={adminActions(a)} className="-my-1.5 -mr-1.5" />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
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
                    <TableHead>Email</TableHead>
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
                      <TableCell className="max-w-[16rem]">
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={a.userData.name} avatar={a.userData.avatar} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-sm text-foreground" title={a.userData.name}>{a.userData.name}</p>
                            <p className="truncate text-xs text-muted-foreground" title={`@${a.username}`}>@{a.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[12rem] text-sm text-muted-foreground 2xl:max-w-[20rem]">
                        <span className="block truncate" title={a.userData.email || undefined}>{a.userData.email || '—'}</span>
                      </TableCell>
                      <TableCell className="max-w-[12rem]">
                        <Badge variant="outline" className="min-w-0 max-w-full" title={a.rules.name}>
                          <Shield aria-hidden /><span className="truncate">{a.rules.name}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right ${STICKY_ACTIONS_CELL}`}>
                        <RowActions label={`Ações de ${a.userData.name}`} actions={adminActions(a)} />
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
            </div>
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
          <span className="font-medium text-foreground">{deleteAdminTarget?.userData.name}</span> <span>@{deleteAdminTarget?.username}</span>
          <br />Esta ação não pode ser desfeita.
        </>}
        onConfirm={handleDeleteAdmin}
        pending={deleteAdmin.isPending}
      />
    </PageContainer>
  )
}

/** Contador ao lado do nome da aba (sem pílula). */
function TabCount({ n }: { n: number }) {
  return <span className="text-xs tabular-nums text-faint-foreground">{n}</span>
}
