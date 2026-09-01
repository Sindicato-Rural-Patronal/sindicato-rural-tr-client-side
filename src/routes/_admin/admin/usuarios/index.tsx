import { createFileRoute, Link } from '@tanstack/react-router'
import { apiErrorMessage } from '@/lib/api-error-message'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionButton } from '@/components/PermissionButton'
import {
  useAdminUsers, useAdminAdmins, useAdminRules,
  useCreateAdmin, useCreateRule, useUpdateRule,
  useDeleteWorker,
  useUpdateAdmin, useDeleteAdmin,
  type UserData, type UserAdmin, type Rule,
} from '@/hooks/useAdmin'
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
import { AlertCircle, Plus, Shield, Users, Pencil, Trash2, ExternalLink, Globe, ChevronDown, X, SlidersHorizontal } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'

export const Route = createFileRoute('/_admin/admin/usuarios/')({
  validateSearch: z.object({
    incomplete: z.boolean().optional(),
  }),
  component: RouteComponent,
})

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const PERM_GROUPS = [
  { label: 'Usuários',        perms: ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'READ_USER'] },
  { label: 'Cursos',          perms: ['CREATE_COURSE', 'UPDATE_COURSE', 'DELETE_COURSE', 'READ_COURSE'] },
  { label: 'Regras',          perms: ['CREATE_RULE', 'UPDATE_RULE', 'DELETE_RULE', 'READ_RULE'] },
  { label: 'Administradores', perms: ['CREATE_USER_ADMIN', 'UPDATE_USER_ADMIN', 'DELETE_USER_ADMIN', 'READ_USER_ADMIN'] },
  { label: 'Notícias',        perms: ['CREATE_NEWS', 'READ_NEWS', 'UPDATE_NEWS', 'DELETE_NEWS'] },
  { label: 'Contatos',        perms: ['READ_CONTACT', 'UPDATE_CONTACT'] },
  { label: 'Banners',         perms: ['CREATE_BANNER', 'READ_BANNER', 'UPDATE_BANNER', 'DELETE_BANNER'] },
  { label: 'Cotações',        perms: ['CREATE_MARKET_QUOTE', 'READ_MARKET_QUOTE', 'UPDATE_MARKET_QUOTE', 'DELETE_MARKET_QUOTE'] },
  { label: 'Auditoria',       perms: ['READ_AUDIT'] },
]

function AvatarCircle({ name, avatar, size = 'md' }: { name: string; avatar?: string | null; size?: 'sm' | 'md' }) {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-purple-100 text-purple-700',
    'bg-sky-100 text-sky-700',
  ]
  const color = colors[name.charCodeAt(0) % colors.length]
  const cls = size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm'
  if (avatar) {
    return (
      <img src={avatar} alt={name} className={`${cls} rounded-full object-cover shrink-0 border border-border`} />
    )
  }
  return (
    <div className={`${cls} ${color} rounded-full flex items-center justify-center font-semibold shrink-0`}>
      {getInitials(name)}
    </div>
  )
}

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
  const [form, setForm] = useState({ name: '', description: '', permissions: [] as string[] })
  const [error, setError] = useState<string | null>(null)
  const [confirmTotal, setConfirmTotal] = useState(false)

  useEffect(() => {
    if (!state) return
    if (state.mode === 'edit') {
      setForm({ name: state.rule.name, description: state.rule.description ?? '', permissions: [...state.rule.permissions] })
    } else {
      setForm({ name: '', description: '', permissions: [] })
    }
    setError(null)
    setConfirmTotal(false)
  }, [state?.mode, isEdit && state.mode === 'edit' ? state.rule.id : ''])

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
              <Button size="sm" onClick={() => setDialog({ mode: 'create' })}>
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
                <Button size="sm" className="mt-4" onClick={() => setDialog({ mode: 'create' })}>
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
                  <Button
                    variant="ghost" size="icon"
                    className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDialog({ mode: 'edit', rule: r })}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <RegraDialog state={dialog} onClose={() => setDialog(null)} />
    </>
  )
}

function NovoAdminSheet() {
  const { data: usuariosData } = useAdminUsers({ limit: 1000 })
  const { data: regrasData } = useAdminRules()
  const usuarios = usuariosData?.data ?? []
  const regras = regrasData?.data ?? []
  const createAdmin = useCreateAdmin()
  const [form, setForm] = useState({ username: '', password: '', userDataId: '', userRole: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    try {
      await createAdmin.mutateAsync(form)
      setForm({ username: '', password: '', userDataId: '', userRole: '' })
      setSuccess(true)
      toast.success('Administrador criado com sucesso!')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar administrador.'
      setError(msg)
      toast.error(msg)
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button><Plus className="size-4" /> Novo admin</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Novo administrador</SheetTitle></SheetHeader>
        <div className="p-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-username">Username *</Label>
              <Input id="admin-username" name="username" value={form.username} onChange={handleChange} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-password">Senha *</Label>
              <Input id="admin-password" type="password" name="password" value={form.password} onChange={handleChange} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-user">Associado vinculado *</Label>
              <select id="admin-user" name="userDataId" value={form.userDataId} onChange={handleChange} required className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background">
                <option value="">Selecione um associado</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-role">Regra de permissão *</Label>
              <select id="admin-role" name="userRole" value={form.userRole} onChange={handleChange} required className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background">
                <option value="">Selecione uma regra</option>
                {regras.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">Administrador criado com sucesso!</p>}
            <Button type="submit" disabled={createAdmin.isPending}>
              {createAdmin.isPending ? 'Salvando...' : 'Criar administrador'}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}


function EditarAdminDialog({ admin, onClose }: { admin: UserAdmin | null; onClose: () => void }) {
  const { data: regrasData } = useAdminRules()
  const regras = regrasData?.data ?? []
  const updateAdmin = useUpdateAdmin(admin?.id ?? '')
  const [form, setForm] = useState({ username: '', password: '', userRole: '', isPublic: false, publicTitle: '' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (admin) {
      setForm({
        username: admin.username,
        password: '',
        userRole: admin.rulesId,
        isPublic: admin.isPublic,
        publicTitle: admin.publicTitle ?? '',
      })
      setError(null)
    }
  }, [admin?.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const body: { username?: string; password?: string; rulesId?: string; isPublic?: boolean; publicTitle?: string | null } = {}
    if (form.username !== admin?.username) body.username = form.username
    if (form.password.trim()) body.password = form.password
    if (form.userRole !== admin?.rulesId) body.rulesId = form.userRole
    if (form.isPublic !== admin?.isPublic) body.isPublic = form.isPublic
    if (form.publicTitle !== (admin?.publicTitle ?? '')) body.publicTitle = form.publicTitle || null
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
            <Input id="edit-admin-password" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Deixar em branco para manter" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-admin-role">Regra de permissão *</Label>
            <select id="edit-admin-role" value={form.userRole} onChange={e => setForm(p => ({ ...p, userRole: e.target.value }))} required className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background">
              <option value="">Selecione uma regra</option>
              {regras.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-border p-3 flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={e => setForm(p => ({ ...p, isPublic: e.target.checked, publicTitle: e.target.checked ? p.publicTitle : '' }))}
                className="accent-primary"
              />
              <div className="flex items-center gap-1.5">
                <Globe className="size-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">Exibir como contato público</span>
              </div>
            </label>
            {form.isPublic && (
              <div className="flex flex-col gap-1.5 pl-5">
                <Label htmlFor="edit-admin-public-title" className="text-xs text-muted-foreground">Título público</Label>
                <Input
                  id="edit-admin-public-title"
                  value={form.publicTitle}
                  onChange={e => setForm(p => ({ ...p, publicTitle: e.target.value }))}
                  placeholder="ex: Presidente, Secretária..."
                  className="h-9"
                />
              </div>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={updateAdmin.isPending}>
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
  const { incomplete: incompleteParam } = Route.useSearch()
  const { can } = usePermissions()
  const [activeTab, setActiveTab] = useState<string>('associados')
  const [usersPage, setUsersPage] = useState(1)
  const [adminsPage, setAdminsPage] = useState(1)
  const [limit, setLimit] = useState<typeof USERS_LIMIT_OPTIONS[number]>(10)
  const [incompleteOnly, setIncompleteOnly] = useState(incompleteParam ?? false)
  const [usersSearch, setUsersSearch] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [genderFilter, setGenderFilter] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('')
  const [ethnicityFilter, setEthnicityFilter] = useState<'WHITE' | 'BLACK' | 'MIXED' | 'ASIAN' | 'INDIGENOUS' | ''>('')
  const [educationFilter, setEducationFilter] = useState('')
  const [memberTypeFilter, setMemberTypeFilter] = useState('')
  const [memberClassFilter, setMemberClassFilter] = useState('')
  const [rulesFilter, setRulesFilter] = useState('')
  const [isPublicFilter, setIsPublicFilter] = useState<'all' | 'true' | 'false'>('all')
  const [deleteAssociadoTarget, setDeleteAssociadoTarget] = useState<UserData | null>(null)
  const [editAdmin, setEditAdmin] = useState<UserAdmin | null>(null)
  const [deleteAdminTarget, setDeleteAdminTarget] = useState<UserAdmin | null>(null)

  const activeFiltersCount = [genderFilter, ethnicityFilter, educationFilter, memberTypeFilter, memberClassFilter].filter(Boolean).length

  function clearAdvancedFilters() {
    setGenderFilter('')
    setEthnicityFilter('')
    setEducationFilter('')
    setMemberTypeFilter('')
    setMemberClassFilter('')
    setUsersPage(1)
  }

  const { data: usuariosData, isLoading: loadingUsers } = useAdminUsers({
    page: usersPage,
    limit,
    search: usersSearch || undefined,
    incompleteRegistration: incompleteOnly ? true : undefined,
    gender: genderFilter || undefined,
    ethnicity: ethnicityFilter || undefined,
    educationLevel: (educationFilter || undefined) as 'NO_FORMAL_EDUCATION' | 'INCOMPLETE_PRIMARY' | 'COMPLETE_PRIMARY' | 'INCOMPLETE_SECONDARY' | 'COMPLETE_SECONDARY' | 'INCOMPLETE_HIGHER' | 'COMPLETE_HIGHER' | 'POSTGRADUATE' | undefined,
    memberType: memberTypeFilter || undefined,
    memberClassification: memberClassFilter || undefined,
  })
  const { data: regrasData } = useAdminRules()
  const { data: adminsData, isLoading: loadingAdmins } = useAdminAdmins({
    page: adminsPage,
    limit,
    rulesId: rulesFilter || undefined,
    isPublic: isPublicFilter === 'all' ? undefined : isPublicFilter === 'true',
  })
  const deleteWorker = useDeleteWorker()
  const deleteAdmin = useDeleteAdmin()

  const usuarios   = usuariosData?.data       ?? []
  const admins     = adminsData?.data         ?? []
  const userTotal  = usuariosData?.total      ?? 0
  const userPages  = usuariosData?.totalPages ?? 1
  const adminTotal = adminsData?.total        ?? 0
  const adminPages = adminsData?.totalPages   ?? 1

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    setUsersPage(1)
    setAdminsPage(1)
  }

  function handleRulesFilterChange(v: string) {
    setRulesFilter(v === 'all' ? '' : v)
    setAdminsPage(1)
  }

  function handleIsPublicFilterChange(v: string) {
    setIsPublicFilter(v as 'all' | 'true' | 'false')
    setAdminsPage(1)
  }

  async function handleDeleteAssociado() {
    if (!deleteAssociadoTarget) return
    try {
      await deleteWorker.mutateAsync(deleteAssociadoTarget.id)
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Usuários</h1>
            <p className="text-sm text-muted-foreground">Associados e administradores do sistema</p>
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
            {activeTab === 'administradores' && (
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
          <TabsTrigger value="administradores" className="flex items-center gap-1.5">
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
                <Input
                  className="h-8 text-xs w-32"
                  placeholder="Tipo..."
                  value={memberTypeFilter}
                  onChange={e => { setMemberTypeFilter(e.target.value); setUsersPage(1) }}
                />
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
          <div className="flex items-center gap-3 mb-4">
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
          {!loadingUsers && usuarios.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="size-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground">Nenhum associado cadastrado</p>
            </div>
          )}
          {!loadingUsers && usuarios.length > 0 && (
            <>
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                      <TableHead className="hidden lg:table-cell">CPF</TableHead>
                      <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                      <TableHead className="w-28 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map(u => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <AvatarCircle name={u.name} avatar={u.avatar} size="sm" />
                            <div>
                              <p className="font-medium text-sm text-foreground">{u.name}</p>
                              <p className="text-xs text-muted-foreground md:hidden">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{u.email}</TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">{u.phone}</TableCell>
                        <TableCell className="text-muted-foreground text-sm font-mono hidden lg:table-cell">{u.cpf ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                          {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="size-7" asChild>
                              <Link to="/admin/usuarios/$id" params={{ id: u.id }}>
                                <ExternalLink className="size-3.5" />
                              </Link>
                            </Button>
                            <PermissionButton
                              allowed={can('DELETE_USER')}
                              noPermissionMessage="Sem permissão para excluir usuários"
                              variant="ghost" size="icon"
                              className="size-7 text-destructive/60 hover:text-destructive"
                              onClick={() => setDeleteAssociadoTarget(u)}
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
                page={usersPage}
                totalPages={userPages}
                total={userTotal}
                limit={limit}
                onPageChange={setUsersPage}
                showLimitSelector={false}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="administradores">
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
            <Select value={isPublicFilter} onValueChange={handleIsPublicFilterChange}>
              <SelectTrigger className="h-9 w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Visibilidade</SelectItem>
                <SelectItem value="true">Público</SelectItem>
                <SelectItem value="false">Privado</SelectItem>
              </SelectContent>
            </Select>
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
          {!loadingAdmins && admins.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Shield className="size-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground">Nenhum administrador cadastrado</p>
              <p className="text-xs text-muted-foreground mt-1">Use o botão "Novo admin" para adicionar.</p>
            </div>
          )}
          {!loadingAdmins && admins.length > 0 && (
            <>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Administrador</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead>Regra</TableHead>
                    <TableHead className="w-20 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <AvatarCircle name={a.userData.name} avatar={a.userData.avatar} size="sm" />
                          <div>
                            <p className="font-medium text-sm text-foreground">{a.userData.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">@{a.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{a.userData.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Shield className="size-3.5 text-muted-foreground" />
                          <Badge variant="outline" className="text-xs">{a.rules.name}</Badge>
                          {a.isPublic && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Globe className="size-2.5" />
                              {a.publicTitle ?? 'Público'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <PermissionButton
                            allowed={can('UPDATE_USER_ADMIN')}
                            noPermissionMessage="Sem permissão para editar administradores"
                            variant="ghost" size="icon"
                            className="size-7"
                            onClick={() => setEditAdmin(a)}
                          >
                            <Pencil className="size-3.5" />
                          </PermissionButton>
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

      <EditarAdminDialog admin={editAdmin} onClose={() => setEditAdmin(null)} />

      <Dialog open={!!deleteAssociadoTarget} onOpenChange={open => !open && setDeleteAssociadoTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir associado</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <p className="text-sm font-medium">{deleteAssociadoTarget?.name}</p>
          <p className="text-xs text-muted-foreground">{deleteAssociadoTarget?.email}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAssociadoTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteAssociado} disabled={deleteWorker.isPending}>
              {deleteWorker.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteAdminTarget} onOpenChange={open => !open && setDeleteAdminTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir administrador</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <p className="text-sm font-medium">{deleteAdminTarget?.userData.name}</p>
          <p className="text-xs text-muted-foreground font-mono">@{deleteAdminTarget?.username}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAdminTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteAdmin} disabled={deleteAdmin.isPending}>
              {deleteAdmin.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
