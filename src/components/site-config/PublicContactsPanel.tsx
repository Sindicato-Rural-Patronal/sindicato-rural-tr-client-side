import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { InitialsAvatar } from '@/components/InitialsAvatar'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { useAdminAdmins, useSetPublicContact, type UserAdmin } from '@/hooks/useAdmin'
import { apiErrorMessage } from '@/lib/api-error-message'

// Diálogo único para adicionar (escolhe o administrador) ou editar o título.
function ContactDialog({ target, candidates, pending, onClose, onSubmit }: {
  target: UserAdmin | 'new'
  candidates: UserAdmin[]
  pending: boolean
  onClose: () => void
  onSubmit: (adminId: string, title: string) => void
}) {
  const isNew = target === 'new'
  const [adminId, setAdminId] = useState(isNew ? '' : target.id)
  const [title, setTitle] = useState(isNew ? '' : target.publicTitle ?? '')

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <form
          className="flex flex-col gap-4"
          onSubmit={e => { e.preventDefault(); if (adminId) onSubmit(adminId, title.trim()) }}
        >
          <DialogHeader>
            <DialogTitle>{isNew ? 'Adicionar contato público' : target.userData.name}</DialogTitle>
            <DialogDescription>Aparece em "Nossa Equipe", na página Contato, com nome, e-mail e telefone.</DialogDescription>
          </DialogHeader>
          {isNew && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-admin">Pessoa *</Label>
              <NativeSelect id="contact-admin" className="h-9" value={adminId} onChange={e => setAdminId(e.target.value)}>
                <option value="">Selecione</option>
                {candidates.map(a => <option key={a.id} value={a.id}>{a.userData.name}</option>)}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">Só quem tem acesso ao painel (administradores) pode ser contato público.</p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-title">Cargo exibido</Label>
            <Input id="contact-title" className="h-9" maxLength={80} placeholder="Ex.: Presidente, Secretária"
              value={title} onChange={e => setTitle(e.target.value)} autoFocus={!isNew} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!adminId || pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} {isNew ? 'Adicionar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Quem aparece como contato na página Contato do site.
export function PublicContactsPanel({ canEdit }: { canEdit: boolean }) {
  const { data, isLoading, isError } = useAdminAdmins({ limit: 100 })
  const setContact = useSetPublicContact()
  const [dialog, setDialog] = useState<UserAdmin | 'new' | null>(null)
  const [removing, setRemoving] = useState<UserAdmin | null>(null)

  const admins = data?.data ?? []
  const byName = (a: UserAdmin, b: UserAdmin) => a.userData.name.localeCompare(b.userData.name)
  const contacts = admins.filter(a => a.isPublic).sort(byName)
  const candidates = admins.filter(a => !a.isPublic).sort(byName)

  async function save(adminId: string, title: string) {
    const isNew = dialog === 'new'
    try {
      await setContact.mutateAsync({ adminId, isPublic: true, publicTitle: title || null })
      toast.success(isNew ? 'Contato adicionado ao site.' : 'Contato salvo.')
      setDialog(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao salvar o contato.'))
    }
  }

  async function confirmRemove() {
    if (!removing) return
    try {
      await setContact.mutateAsync({ adminId: removing.id, isPublic: false, publicTitle: null })
      toast.success(`${removing.userData.name} saiu dos contatos do site.`)
      setRemoving(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover o contato.'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Pessoas em "Nossa Equipe", na página Contato, em ordem alfabética.
        </p>
        {canEdit && (
          <Button className="shrink-0" onClick={() => setDialog('new')} disabled={!isLoading && candidates.length === 0}>
            <Plus className="size-4" /> Adicionar contato
          </Button>
        )}
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar os contatos." />}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {isLoading && Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border p-4 last:border-b-0">
            <Skeleton className="size-10 rounded-full" /><Skeleton className="h-4 w-48" />
          </div>
        ))}

        {!isLoading && contacts.length === 0 && (
          <EmptyState icon={Users} title="Nenhum contato público" description='Clique em "Adicionar contato" para escolher quem aparece no site.' />
        )}

        {contacts.map(a => (
          <div key={a.id} className="flex items-center gap-3 border-b border-border p-4 last:border-b-0">
            <InitialsAvatar name={a.userData.name} avatar={a.userData.avatar} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{a.userData.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                <span className="font-medium text-primary">{a.publicTitle || 'Sem cargo'}</span>
                {a.userData.email && <> · {a.userData.email}</>}
              </p>
            </div>
            {canEdit && (
              <div className="flex shrink-0 items-center gap-1">
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setDialog(a)}
                  aria-label={`Editar cargo de ${a.userData.name}`} title="Editar cargo"><Pencil className="size-4" /></Button>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive"
                  onClick={() => setRemoving(a)} aria-label={`Tirar ${a.userData.name} do site`} title="Tirar do site">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {dialog && (
        <ContactDialog
          key={dialog === 'new' ? 'new' : dialog.id}
          target={dialog}
          candidates={candidates}
          pending={setContact.isPending}
          onClose={() => setDialog(null)}
          onSubmit={save}
        />
      )}

      <DeleteConfirmDialog
        open={!!removing}
        onOpenChange={o => { if (!o) setRemoving(null) }}
        title="Tirar contato do site"
        description={<><strong>{removing?.userData.name}</strong> deixa de aparecer na página Contato. O acesso ao painel continua.</>}
        confirmLabel="Tirar do site"
        pendingLabel="Removendo..."
        onConfirm={confirmRemove}
        pending={setContact.isPending}
      />
    </div>
  )
}
