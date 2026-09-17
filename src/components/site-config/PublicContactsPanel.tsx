import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { InitialsAvatar } from '@/components/InitialsAvatar'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { useAdminUsers, type UserData } from '@/hooks/useAdmin'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  useAddPublicContact, useAdminPublicContacts, useRemovePublicContact, useReorderPublicContacts,
  useUpdatePublicContact, type AdminPublicContact,
} from '@/hooks/usePublicContactsAdmin'
import { apiErrorMessage } from '@/lib/api-error-message'
import { maskCPF, maskPhone } from '@/utils/masks'

// Adicionar: busca a pessoa no cadastro e define o cargo exibido.
function AddContactDialog({ existingIds, pending, onClose, onSubmit }: {
  existingIds: Set<string>
  pending: boolean
  onClose: () => void
  onSubmit: (person: UserData, title: string) => void
}) {
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search, 300).trim()
  const { data, isFetching } = useAdminUsers({ page: 1, limit: 8, search: q || undefined })
  const [picked, setPicked] = useState<UserData | null>(null)
  const [title, setTitle] = useState('')
  const people = data?.data ?? []

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); if (picked) onSubmit(picked, title.trim()) }}>
          <DialogHeader>
            <DialogTitle>Adicionar contato público</DialogTitle>
            <DialogDescription>
              Qualquer pessoa do cadastro. Aparecem o nome, o cargo, o e-mail e o telefone dela.
            </DialogDescription>
          </DialogHeader>

          {picked ? (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <InitialsAvatar name={picked.name} avatar={picked.avatar} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{picked.name}</p>
                <p className="truncate text-xs text-muted-foreground">{picked.email} · {maskPhone(picked.phone)}</p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPicked(null)}>Trocar</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Buscar pessoa" className="h-9 pl-9" placeholder="Nome, CPF ou e-mail"
                  value={search} onChange={e => setSearch(e.target.value)} autoFocus />
              </div>
              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {people.map(p => {
                  const already = existingIds.has(p.id)
                  return (
                    <button key={p.id} type="button" disabled={already} onClick={() => setPicked(p)}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
                      <InitialsAvatar name={p.name} avatar={p.avatar} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {already ? 'Já é contato público' : [p.cpf ? maskCPF(p.cpf) : null, p.email].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </button>
                  )
                })}
                {!isFetching && people.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Ninguém encontrado. <Link to="/admin/usuarios/novo" className="text-primary hover:underline">Cadastrar pessoa</Link>
                  </p>
                )}
                {isFetching && people.length === 0 && <Loader2 className="mx-auto my-6 size-5 animate-spin text-muted-foreground" />}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-contact-title">Cargo exibido</Label>
            <Input id="new-contact-title" className="h-9" maxLength={80} placeholder="Ex.: Presidente, Secretária"
              value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!picked || pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditTitleDialog({ contact, pending, onClose, onSubmit }: {
  contact: AdminPublicContact
  pending: boolean
  onClose: () => void
  onSubmit: (title: string) => void
}) {
  const [title, setTitle] = useState(contact.title ?? '')
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); onSubmit(title.trim()) }}>
          <DialogHeader>
            <DialogTitle>{contact.userData.name}</DialogTitle>
            <DialogDescription>Cargo exibido em "Nossa Equipe", na página Contato.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-title">Cargo exibido</Label>
            <Input id="contact-title" className="h-9" maxLength={80} placeholder="Ex.: Presidente, Secretária"
              value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Quem aparece em "Nossa Equipe", na página Contato do site, e em que ordem.
export function PublicContactsPanel({ canEdit }: { canEdit: boolean }) {
  const { data, isLoading, isError } = useAdminPublicContacts()
  const add = useAddPublicContact()
  const update = useUpdatePublicContact()
  const remove = useRemovePublicContact()
  const reorder = useReorderPublicContacts()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<AdminPublicContact | null>(null)
  const [removing, setRemoving] = useState<AdminPublicContact | null>(null)

  const contacts = data ?? []

  async function handleAdd(person: UserData, title: string) {
    try {
      await add.mutateAsync({ userDataId: person.id, title: title || null })
      toast.success(`${person.name} agora aparece na página Contato.`)
      setAdding(false)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao adicionar o contato.'))
    }
  }

  async function handleTitle(title: string) {
    if (!editing) return
    try {
      await update.mutateAsync({ id: editing.id, title: title || null })
      toast.success('Contato salvo.')
      setEditing(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao salvar o contato.'))
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const ids = contacts.map(c => c.id)
    const [id] = ids.splice(index, 1)
    ids.splice(index + direction, 0, id)
    try {
      await reorder.mutateAsync(ids)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao reordenar.'))
    }
  }

  async function confirmRemove() {
    if (!removing) return
    try {
      await remove.mutateAsync(removing.id)
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
          Pessoas em "Nossa Equipe", na página Contato, nesta ordem.
        </p>
        {canEdit && (
          <Button className="shrink-0" onClick={() => setAdding(true)}>
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

        {contacts.map((c, i) => (
          <div key={c.id} className="flex flex-col gap-3 border-b border-border p-4 last:border-b-0 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="w-5 shrink-0 text-center text-sm tabular-nums text-muted-foreground">{i + 1}</span>
              <InitialsAvatar name={c.userData.name} avatar={c.userData.avatar} />
              <div className="min-w-0">
                <Link to="/admin/usuarios/$id" params={{ id: c.userData.id }} className="block truncate font-medium text-foreground hover:underline">
                  {c.userData.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="font-medium text-primary">{c.title || 'Sem cargo'}</span>
                  {' · '}{c.userData.email}{c.userData.phone && <> · {maskPhone(c.userData.phone)}</>}
                </p>
              </div>
            </div>
            {canEdit && (
              <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                <Button size="sm" variant="ghost" className="h-8 px-2" disabled={i === 0 || reorder.isPending}
                  onClick={() => move(i, -1)} aria-label={`Subir ${c.userData.name}`} title="Subir"><ArrowUp className="size-4" /></Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" disabled={i === contacts.length - 1 || reorder.isPending}
                  onClick={() => move(i, 1)} aria-label={`Descer ${c.userData.name}`} title="Descer"><ArrowDown className="size-4" /></Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditing(c)}
                  aria-label={`Editar cargo de ${c.userData.name}`} title="Editar cargo"><Pencil className="size-4" /></Button>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive"
                  onClick={() => setRemoving(c)} aria-label={`Tirar ${c.userData.name} do site`} title="Tirar do site">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding && (
        <AddContactDialog
          existingIds={new Set(contacts.map(c => c.userData.id))}
          pending={add.isPending}
          onClose={() => setAdding(false)}
          onSubmit={handleAdd}
        />
      )}
      {editing && (
        <EditTitleDialog key={editing.id} contact={editing} pending={update.isPending} onClose={() => setEditing(null)} onSubmit={handleTitle} />
      )}

      <DeleteConfirmDialog
        open={!!removing}
        onOpenChange={o => { if (!o) setRemoving(null) }}
        title="Tirar contato do site"
        description={<><strong>{removing?.userData.name}</strong> deixa de aparecer na página Contato. O cadastro continua.</>}
        confirmLabel="Tirar do site"
        pendingLabel="Removendo..."
        onConfirm={confirmRemove}
        pending={remove.isPending}
      />
    </div>
  )
}
