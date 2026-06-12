import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/auth-guard'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionButton } from '@/components/PermissionButton'
import {
  useAdminUsers, useAdminAdmins, useAdminRules,
  useCreateAdmin, useCreateRule, useCreateWorker,
  useUpdateWorker, useDeleteWorker,
  useUpdateAdmin, useDeleteAdmin,
  type UserData, type UserAdmin,
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
import { Plus, Shield, Users, Pencil, Trash2 } from 'lucide-react'
import { maskCPF, maskPhone } from '@/utils/masks'

export const Route = createFileRoute('/_admin/admin/usuarios')({
  beforeLoad: () => requirePermission('READ_USER'),
  component: RouteComponent,
})

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const PERM_GROUPS = [
  { label: 'Usuários', perms: ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'READ_USER'] },
  { label: 'Cursos', perms: ['CREATE_COURSE', 'UPDATE_COURSE', 'DELETE_COURSE', 'READ_COURSE'] },
  { label: 'Regras', perms: ['CREATE_RULE', 'UPDATE_RULE', 'DELETE_RULE', 'READ_RULE'] },
  { label: 'Administradores', perms: ['CREATE_USER_ADMIN', 'UPDATE_USER_ADMIN', 'DELETE_USER_ADMIN', 'READ_USER_ADMIN'] },
]

// ─── Avatar ───────────────────────────────────────────────────────────────────

function AvatarCircle({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
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
  return (
    <div className={`${cls} ${color} rounded-full flex items-center justify-center font-semibold shrink-0`}>
      {getInitials(name)}
    </div>
  )
}

// ─── Regras Sheet ─────────────────────────────────────────────────────────────

function RegrasSheet() {
  const { data: regras, isLoading } = useAdminRules()
  const createRule = useCreateRule()
  const [form, setForm] = useState({ name: '', description: '', permitions: [] as string[] })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function togglePerm(perm: string) {
    setForm(prev => ({
      ...prev,
      permitions: prev.permitions.includes(perm)
        ? prev.permitions.filter(p => p !== perm)
        : [...prev.permitions, perm],
    }))
  }

  function toggleGroup(perms: string[]) {
    const allSelected = perms.every(p => form.permitions.includes(p))
    setForm(prev => ({
      ...prev,
      permitions: allSelected
        ? prev.permitions.filter(p => !perms.includes(p))
        : [...new Set([...prev.permitions, ...perms])],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (form.permitions.length === 0) { setError('Selecione ao menos uma permissão.'); return }
    try {
      const res = await createRule.mutateAsync(form)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? 'Erro ao criar regra.')
        return
      }
      setForm({ name: '', description: '', permitions: [] })
      setSuccess(true)
      toast.success('Regra criada com sucesso!')
    } catch {
      setError('Erro ao criar regra.')
      toast.error('Erro ao criar regra.')
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Shield className="size-4" /> Gerenciar regras
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Regras de permissão</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 p-4">
          <div>
            <h3 className="text-sm font-semibold mb-3">Cadastradas</h3>
            {isLoading && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            )}
            {regras && (
              <div className="flex flex-col gap-2">
                {regras.map(r => (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Shield className="size-3.5 text-muted-foreground" />
                      <p className="font-medium text-sm">{r.name}</p>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mb-2">{r.description}</p>}
                    <div className="flex flex-wrap gap-1">
                      {r.permitions.map(p => (
                        <Badge key={p} variant="secondary" className="font-mono text-[10px] py-0">{p}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {regras.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma regra cadastrada.</p>
                )}
              </div>
            )}
          </div>
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-3">Nova regra</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="regra-nome">Nome *</Label>
                <Input id="regra-nome" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="regra-desc">Descrição</Label>
                <Input id="regra-desc" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Permissões *</Label>
                {PERM_GROUPS.map(group => {
                  const allSelected = group.perms.every(p => form.permitions.includes(p))
                  return (
                    <div key={group.label} className="rounded-lg border border-border p-3">
                      <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input type="checkbox" checked={allSelected} onChange={() => toggleGroup(group.perms)} className="accent-primary" />
                        <span className="text-xs font-semibold text-foreground">{group.label}</span>
                      </label>
                      <div className="grid grid-cols-2 gap-1 pl-5">
                        {group.perms.map(perm => (
                          <label key={perm} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={form.permitions.includes(perm)} onChange={() => togglePerm(perm)} className="accent-primary" />
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {perm.replace(/^(CREATE|UPDATE|DELETE|READ)_/, m => m.toLowerCase())}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-emerald-600">Regra criada com sucesso!</p>}
              <Button type="submit" disabled={createRule.isPending}>
                {createRule.isPending ? 'Salvando...' : 'Criar regra'}
              </Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Novo Trabalhador Sheet ───────────────────────────────────────────────────

function NovoTrabalhadorSheet() {
  const createWorker = useCreateWorker()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', cpf: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleOpen(v: boolean) {
    setOpen(v)
    if (v) { setForm({ name: '', email: '', phone: '', cpf: '' }); setError(null); setSuccess(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const cpfDigits = form.cpf.replace(/\D/g, '')
    const phoneDigits = form.phone.replace(/\D/g, '')
    if (cpfDigits.length !== 11) { setError('CPF inválido.'); return }
    if (![10, 11].includes(phoneDigits.length)) { setError('Telefone inválido.'); return }
    try {
      const res = await createWorker.mutateAsync({
        name: form.name,
        email: form.email,
        phone: form.phone,
        cpf: form.cpf,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? 'Erro ao criar trabalhador.')
        return
      }
      setForm({ name: '', email: '', phone: '', cpf: '' })
      setSuccess(true)
      toast.success('Trabalhador criado com sucesso!')
    } catch {
      setError('Erro ao criar trabalhador.')
      toast.error('Erro ao criar trabalhador.')
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="size-4" /> Novo trabalhador
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Novo trabalhador</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trab-nome">Nome *</Label>
              <Input id="trab-nome" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trab-email">E-mail *</Label>
              <Input id="trab-email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trab-phone">Telefone *</Label>
              <Input
                id="trab-phone"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: maskPhone(e.target.value) }))}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trab-cpf">CPF *</Label>
              <Input
                id="trab-cpf"
                value={form.cpf}
                onChange={e => setForm(p => ({ ...p, cpf: maskCPF(e.target.value) }))}
                placeholder="000.000.000-00"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">Trabalhador criado com sucesso!</p>}
            <Button type="submit" disabled={createWorker.isPending}>
              {createWorker.isPending ? 'Salvando...' : 'Criar trabalhador'}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Novo Admin Sheet ─────────────────────────────────────────────────────────

function NovoAdminSheet() {
  const { data: usuarios } = useAdminUsers()
  const { data: regras } = useAdminRules()
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
      const res = await createAdmin.mutateAsync(form)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? 'Erro ao criar administrador.')
        return
      }
      setForm({ username: '', password: '', userDataId: '', userRole: '' })
      setSuccess(true)
      toast.success('Administrador criado com sucesso!')
    } catch {
      setError('Erro ao criar administrador.')
      toast.error('Erro ao criar administrador.')
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>
          <Plus className="size-4" /> Novo admin
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Novo administrador</SheetTitle>
        </SheetHeader>
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
              <Label htmlFor="admin-user">Trabalhador vinculado *</Label>
              <select id="admin-user" name="userDataId" value={form.userDataId} onChange={handleChange} required className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background">
                <option value="">Selecione um trabalhador</option>
                {usuarios?.map(u => (
                  <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-role">Regra de permissão *</Label>
              <select id="admin-role" name="userRole" value={form.userRole} onChange={handleChange} required className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background">
                <option value="">Selecione uma regra</option>
                {regras?.map(r => (
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

// ─── Editar Trabalhador Dialog ────────────────────────────────────────────────

function EditarTrabalhadorDialog({
  user,
  onClose,
}: {
  user: UserData | null
  onClose: () => void
}) {
  const updateWorker = useUpdateWorker(user?.id ?? '')
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    cpf: user?.cpf ?? '',
  })
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cpfDigits = form.cpf.replace(/\D/g, '')
    const phoneDigits = form.phone.replace(/\D/g, '')
    if (cpfDigits.length !== 11) { setError('CPF inválido.'); return }
    if (![10, 11].includes(phoneDigits.length)) { setError('Telefone inválido.'); return }
    try {
      const res = await updateWorker.mutateAsync({
        name: form.name,
        email: form.email,
        phone: form.phone,
        cpf: form.cpf,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? 'Erro ao atualizar.')
        toast.error(data?.error ?? 'Erro ao atualizar trabalhador.')
        return
      }
      toast.success('Trabalhador atualizado com sucesso!')
      onClose()
    } catch {
      setError('Erro ao atualizar trabalhador.')
      toast.error('Erro ao atualizar trabalhador.')
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar trabalhador</DialogTitle>
          <DialogDescription>Atualize os dados de {user?.name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-trab-nome">Nome *</Label>
            <Input id="edit-trab-nome" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-trab-email">E-mail *</Label>
            <Input id="edit-trab-email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-trab-phone">Telefone *</Label>
            <Input
              id="edit-trab-phone"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: maskPhone(e.target.value) }))}
              placeholder="(00) 00000-0000"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-trab-cpf">CPF *</Label>
            <Input
              id="edit-trab-cpf"
              value={form.cpf}
              onChange={e => setForm(p => ({ ...p, cpf: maskCPF(e.target.value) }))}
              placeholder="000.000.000-00"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={updateWorker.isPending}>
              {updateWorker.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Editar Admin Dialog ──────────────────────────────────────────────────────

function EditarAdminDialog({
  admin,
  onClose,
}: {
  admin: UserAdmin | null
  onClose: () => void
}) {
  const { data: regras } = useAdminRules()
  const updateAdmin = useUpdateAdmin(admin?.id ?? '')
  const [form, setForm] = useState({ username: '', password: '', userRole: '' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (admin) {
      setForm({ username: admin.username, password: '', userRole: admin.rulesId })
      setError(null)
    }
  }, [admin?.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const body: { username?: string; password?: string; rulesId?: string } = {}
    if (form.username !== admin?.username) body.username = form.username
    if (form.password.trim()) body.password = form.password
    if (form.userRole !== admin?.rulesId) body.rulesId = form.userRole
    if (Object.keys(body).length === 0) { onClose(); return }
    try {
      const res = await updateAdmin.mutateAsync(body)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? 'Erro ao atualizar.')
        toast.error(data?.error ?? 'Erro ao atualizar administrador.')
        return
      }
      toast.success('Administrador atualizado com sucesso!')
      onClose()
    } catch {
      setError('Erro ao atualizar administrador.')
      toast.error('Erro ao atualizar administrador.')
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
            <Input
              id="edit-admin-username"
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-admin-password">Nova senha</Label>
            <Input
              id="edit-admin-password"
              type="password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="Deixar em branco para manter"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-admin-role">Regra de permissão *</Label>
            <select
              id="edit-admin-role"
              value={form.userRole}
              onChange={e => setForm(p => ({ ...p, userRole: e.target.value }))}
              required
              className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            >
              <option value="">Selecione uma regra</option>
              {regras?.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
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

// ─── Route component ──────────────────────────────────────────────────────────

function RouteComponent() {
  const { data: usuarios, isLoading: loadingUsers } = useAdminUsers()
  const { data: admins, isLoading: loadingAdmins } = useAdminAdmins()
  const deleteWorker = useDeleteWorker()
  const deleteAdmin = useDeleteAdmin()

  const { can } = usePermissions()
  const [activeTab, setActiveTab] = useState<string>('trabalhadores')
  const [editWorker, setEditWorker] = useState<UserData | null>(null)
  const [deleteWorkerTarget, setDeleteWorkerTarget] = useState<UserData | null>(null)
  const [editAdmin, setEditAdmin] = useState<UserAdmin | null>(null)
  const [deleteAdminTarget, setDeleteAdminTarget] = useState<UserAdmin | null>(null)

  async function handleDeleteWorker() {
    if (!deleteWorkerTarget) return
    try {
      await deleteWorker.mutateAsync(deleteWorkerTarget.id)
      toast.success(`Trabalhador "${deleteWorkerTarget.name}" excluído.`)
      setDeleteWorkerTarget(null)
    } catch {
      toast.error('Erro ao excluir trabalhador.')
    }
  }

  async function handleDeleteAdmin() {
    if (!deleteAdminTarget) return
    try {
      await deleteAdmin.mutateAsync(deleteAdminTarget.id)
      toast.success(`Administrador "${deleteAdminTarget.userData.name}" excluído.`)
      setDeleteAdminTarget(null)
    } catch {
      toast.error('Erro ao excluir administrador.')
    }
  }

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Usuários</h1>
            <p className="text-sm text-muted-foreground">Trabalhadores e administradores do sistema</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'trabalhadores' && can('CREATE_USER') && <NovoTrabalhadorSheet />}
            {activeTab === 'administradores' && (
              <>
                {can('READ_RULE') && <RegrasSheet />}
                {can('CREATE_USER_ADMIN') && <NovoAdminSheet />}
              </>
            )}
          </div>
        </div>

        <TabsList className="mb-6">
          <TabsTrigger value="trabalhadores" className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            Trabalhadores
            {usuarios && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {usuarios.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="administradores" className="flex items-center gap-1.5">
            <Shield className="size-3.5" />
            Administradores
            {admins && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {admins.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Trabalhadores ── */}
        <TabsContent value="trabalhadores">
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
          {usuarios && usuarios.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="size-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground">Nenhum trabalhador cadastrado</p>
            </div>
          )}
          {usuarios && usuarios.length > 0 && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                    <TableHead className="hidden lg:table-cell">CPF</TableHead>
                    <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                    <TableHead className="w-20 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <AvatarCircle name={u.name} size="sm" />
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
                          <PermissionButton
                            allowed={can('UPDATE_USER')}
                            noPermissionMessage="Sem permissão para editar usuários"
                            variant="ghost" size="icon"
                            className="size-7"
                            onClick={() => setEditWorker(u)}
                          >
                            <Pencil className="size-3.5" />
                          </PermissionButton>
                          <PermissionButton
                            allowed={can('DELETE_USER')}
                            noPermissionMessage="Sem permissão para excluir usuários"
                            variant="ghost" size="icon"
                            className="size-7 text-destructive/60 hover:text-destructive"
                            onClick={() => setDeleteWorkerTarget(u)}
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
          )}
        </TabsContent>

        {/* ── Administradores ── */}
        <TabsContent value="administradores">
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
          {admins && admins.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Shield className="size-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground">Nenhum administrador cadastrado</p>
              <p className="text-xs text-muted-foreground mt-1">Use o botão "Novo admin" para adicionar.</p>
            </div>
          )}
          {admins && admins.length > 0 && (
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
                          <AvatarCircle name={a.userData.name} size="sm" />
                          <div>
                            <p className="font-medium text-sm text-foreground">{a.userData.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">@{a.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{a.userData.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Shield className="size-3.5 text-muted-foreground" />
                          <Badge variant="outline" className="text-xs">{a.rules.name}</Badge>
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
          )}
        </TabsContent>
      </Tabs>

      {/* ── Edit dialogs ── */}
      <EditarTrabalhadorDialog user={editWorker} onClose={() => setEditWorker(null)} />
      <EditarAdminDialog admin={editAdmin} onClose={() => setEditAdmin(null)} />

      {/* ── Delete worker confirm ── */}
      <Dialog open={!!deleteWorkerTarget} onOpenChange={open => !open && setDeleteWorkerTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir trabalhador</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O trabalhador será removido permanentemente.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm font-medium">{deleteWorkerTarget?.name}</p>
          <p className="text-xs text-muted-foreground">{deleteWorkerTarget?.email}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteWorkerTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteWorker} disabled={deleteWorker.isPending}>
              {deleteWorker.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete admin confirm ── */}
      <Dialog open={!!deleteAdminTarget} onOpenChange={open => !open && setDeleteAdminTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir administrador</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O acesso de administrador será removido permanentemente.
            </DialogDescription>
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
