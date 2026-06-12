import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAdminRules, useCreateRule, useUpdateRule } from '@/hooks/useAdmin'
import type { Rule } from '@/hooks/useAdmin'
import { Plus, Shield, ChevronDown, ChevronUp, Check, Pencil } from 'lucide-react'
import { ConfirmCloseDialog } from '@/components/confirm-close-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export const Route = createFileRoute('/_admin/admin/regras/')({
  component: RouteComponent,
})

const PERM_GROUPS = [
  { nome: 'Usuários', perms: ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'READ_USER'] },
  { nome: 'Cursos', perms: ['CREATE_COURSE', 'UPDATE_COURSE', 'DELETE_COURSE', 'READ_COURSE'] },
  { nome: 'Notícias', perms: ['CREATE_NEWS', 'UPDATE_NEWS', 'DELETE_NEWS', 'READ_NEWS'] },
  { nome: 'Regras', perms: ['CREATE_RULE', 'UPDATE_RULE', 'DELETE_RULE', 'READ_RULE'] },
  { nome: 'Administradores', perms: ['CREATE_USER_ADMIN', 'UPDATE_USER_ADMIN', 'DELETE_USER_ADMIN', 'READ_USER_ADMIN'] },
]

type FormState = { name: string; description: string; permitions: string[] }

function RuleFormDialog({
  open,
  onOpenChange,
  title,
  description,
  initialValues,
  onSubmit,
  isPending,
  submitLabel,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description: string
  initialValues: FormState
  onSubmit: (form: FormState) => Promise<void>
  isPending: boolean
  submitLabel: string
}) {
  const [form, setForm] = useState<FormState>(initialValues)
  const [expandidos, setExpandidos] = useState<string[]>(PERM_GROUPS.map(g => g.nome))
  const [error, setError] = useState<string | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)

  const hasContent = () => form.name.trim() !== '' || form.permitions.length > 0

  // Sync when dialog opens with new initialValues
  const handleOpen = (v: boolean) => {
    if (v) {
      setForm(initialValues)
      setExpandidos(PERM_GROUPS.map(g => g.nome))
      setError(null)
      setConfirmClose(false)
    } else {
      if (hasContent()) {
        setConfirmClose(true)
        return
      }
      onOpenChange(false)
    }
  }

  function forceClose() {
    setConfirmClose(false)
    onOpenChange(false)
  }

  function togglePerm(perm: string) {
    setForm(prev => ({
      ...prev,
      permitions: prev.permitions.includes(perm)
        ? prev.permitions.filter(p => p !== perm)
        : [...prev.permitions, perm],
    }))
  }

  function toggleGrupo(perms: string[]) {
    const allSelected = perms.every(p => form.permitions.includes(p))
    setForm(prev => ({
      ...prev,
      permitions: allSelected
        ? prev.permitions.filter(p => !perms.includes(p))
        : [...new Set([...prev.permitions, ...perms])],
    }))
  }

  function toggleExpandido(nome: string) {
    setExpandidos(prev => prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome])
  }

  async function handleSubmit() {
    setError(null)
    if (form.permitions.length === 0) { setError('Selecione ao menos uma permissão.'); return }
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    try {
      await onSubmit(form)
      onOpenChange(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar.'
      setError(msg)
      toast.error(msg)
    }
  }

  return (
    <>
    <ConfirmCloseDialog
      open={confirmClose}
      onConfirm={forceClose}
      onCancel={() => setConfirmClose(false)}
    />
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Nome *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Coordenador"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Breve descrição das responsabilidades"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Permissões *</Label>
              <span className="text-xs text-muted-foreground">{form.permitions.length} selecionadas</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border p-3">
              {PERM_GROUPS.map(grupo => {
                const allSelected = grupo.perms.every(p => form.permitions.includes(p))
                const someSelected = grupo.perms.some(p => form.permitions.includes(p)) && !allSelected
                const countSelected = grupo.perms.filter(p => form.permitions.includes(p)).length
                const expanded = expandidos.includes(grupo.nome)

                return (
                  <Collapsible key={grupo.nome} open={expanded} onOpenChange={() => toggleExpandido(grupo.nome)}>
                    <div className="flex items-center gap-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={el => { if (el) el.indeterminate = someSelected }}
                        onChange={() => toggleGrupo(grupo.perms)}
                        className="accent-primary"
                      />
                      <CollapsibleTrigger className="flex flex-1 items-center justify-between hover:underline">
                        <span className="text-sm font-medium">{grupo.nome}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{countSelected}/{grupo.perms.length}</Badge>
                          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </div>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="pl-6 pb-2 flex flex-col gap-1.5">
                      {grupo.perms.map(perm => (
                        <label key={perm} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.permitions.includes(perm)}
                            onChange={() => togglePerm(perm)}
                            className="accent-primary"
                          />
                          <span className="text-xs text-muted-foreground font-mono">{perm}</span>
                        </label>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.name || isPending}>
            {isPending ? 'Salvando...' : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

function EditRuleDialog({ regra, onClose }: { regra: Rule; onClose: () => void }) {
  const updateRule = useUpdateRule(regra.id)

  return (
    <RuleFormDialog
      open={true}
      onOpenChange={v => { if (!v) onClose() }}
      title={`Editar: ${regra.name}`}
      description="Altere as informações e permissões desta regra"
      initialValues={{ name: regra.name, description: regra.description ?? '', permitions: regra.permitions }}
      onSubmit={async form => { await updateRule.mutateAsync(form); toast.success('Regra atualizada!') }}
      isPending={updateRule.isPending}
      submitLabel="Salvar alterações"
    />
  )
}

function RouteComponent() {
  const { data: regras, isLoading } = useAdminRules()
  const createRule = useCreateRule()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cargos e Permissões</h1>
          <p className="text-sm text-muted-foreground">Configure as regras e permissões de acesso ao sistema</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="size-4" /> Nova Regra
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      )}

      {regras && regras.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
          <Shield className="size-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm font-medium text-foreground">Nenhuma regra cadastrada</p>
          <p className="text-xs text-muted-foreground mb-4">Crie a primeira regra para gerenciar permissões</p>
          <Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Nova Regra</Button>
        </div>
      )}

      {regras && regras.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {regras.map(regra => (
            <Card key={regra.id} className="overflow-hidden">
              <div className="h-1.5 bg-primary" />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                    <Shield className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{regra.name}</CardTitle>
                    {regra.description && (
                      <p className="text-sm text-muted-foreground truncate">{regra.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setEditingRule(regra)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Permissões ({regra.permitions.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {PERM_GROUPS.map(grupo => {
                    const count = grupo.perms.filter(p => regra.permitions.includes(p)).length
                    if (count === 0) return null
                    return (
                      <Badge key={grupo.nome} variant="outline" className="text-[10px] gap-1">
                        {count === grupo.perms.length
                          ? <Check className="size-2.5 text-emerald-500" />
                          : <span className="text-muted-foreground">{count}/{grupo.perms.length}</span>
                        }
                        {grupo.nome}
                      </Badge>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <RuleFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nova Regra"
        description="Defina as informações e permissões da nova regra de acesso"
        initialValues={{ name: '', description: '', permitions: [] }}
        onSubmit={async form => { await createRule.mutateAsync(form); toast.success('Regra criada!') }}
        isPending={createRule.isPending}
        submitLabel="Criar Regra"
      />

      {/* Edit dialog */}
      {editingRule && (
        <EditRuleDialog regra={editingRule} onClose={() => setEditingRule(null)} />
      )}
    </div>
  )
}
