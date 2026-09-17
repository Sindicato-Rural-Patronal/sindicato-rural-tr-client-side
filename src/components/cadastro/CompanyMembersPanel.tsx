import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Check, Pencil, Plus, Trash2, UserRound, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { PersonPicker, type PickedPerson } from '@/components/PersonPicker'
import {
  useAddCompanyMember, useUpdateCompanyMember, useRemoveCompanyMember, useCompanyMemberTitles,
  memberTitleSuggestions, type CompanyMember,
} from '@/hooks/useCompanies'
import { apiErrorMessage } from '@/lib/api-error-message'
import { maskCPF } from '@/utils/masks'
import { upperNoAccents } from '@/utils/text-format'

// Pessoas vinculadas à empresa, cada uma com seu título (cargo) naquela empresa.

export function CompanyMembersPanel({ companyId, members, readOnly = false }: {
  companyId: string
  members: CompanyMember[]
  readOnly?: boolean
}) {
  const addM = useAddCompanyMember(companyId)
  const updateM = useUpdateCompanyMember(companyId)
  const removeM = useRemoveCompanyMember(companyId)
  const { data: usedTitles } = useCompanyMemberTitles()
  const suggestions = memberTitleSuggestions(usedTitles)

  const [adding, setAdding] = useState(false)
  const [person, setPerson] = useState<PickedPerson | null>(null)
  const [title, setTitle] = useState('')
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null)
  const [removeTarget, setRemoveTarget] = useState<CompanyMember | null>(null)

  const linkedIds = new Set(members.map(m => m.userDataId))

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!person) { toast.error('Escolha a pessoa.'); return }
    if (!title.trim()) { toast.error('Informe o título da pessoa na empresa.'); return }
    try {
      await addM.mutateAsync({ userDataId: person.id, title: title.trim() })
      toast.success(`${person.name} vinculada como ${title.trim()}.`)
      setPerson(null); setTitle(''); setAdding(false)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao vincular pessoa.'))
    }
  }

  async function handleSaveTitle() {
    if (!editing) return
    if (!editing.title.trim()) { toast.error('O título não pode ficar vazio.'); return }
    try {
      await updateM.mutateAsync({ memberId: editing.id, title: editing.title.trim() })
      setEditing(null)
      toast.success('Título atualizado.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao atualizar título.'))
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    try {
      await removeM.mutateAsync(removeTarget.id)
      toast.success('Pessoa desvinculada.')
      setRemoveTarget(null)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao desvincular.'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <datalist id="company-title-suggestions">
        {suggestions.map(t => <option key={t} value={t} />)}
      </datalist>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{members.length} pessoa(s) vinculada(s)</p>
        {!readOnly && !adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Vincular pessoa
          </Button>
        )}
      </div>

      {adding && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 md:grid-cols-5 md:items-end">
              <div className="flex flex-col gap-1.5 md:col-span-3">
                <Label htmlFor="member-person" className="text-xs font-medium text-muted-foreground">Pessoa *</Label>
                {person ? (
                  <div className="flex h-9 items-center justify-between rounded-md border bg-muted/40 px-3 text-sm">
                    <span className="truncate font-medium">{person.name}</span>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setPerson(null)}>
                      <X className="size-3.5" /> Trocar
                    </Button>
                  </div>
                ) : (
                  <PersonPicker id="member-person" onPick={setPerson} excludeIds={linkedIds} autoFocus />
                )}
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label htmlFor="member-title" className="text-xs font-medium text-muted-foreground">Título na empresa *</Label>
                <Input id="member-title" className="h-9" list="company-title-suggestions" maxLength={80}
                  placeholder="Ex.: SOCIO, GERENTE, CONTADOR" value={title}
                  onChange={e => setTitle(upperNoAccents(e.target.value))} />
              </div>
              <div className="flex justify-end gap-2 md:col-span-5">
                <Button type="button" variant="outline" size="sm" onClick={() => { setAdding(false); setPerson(null); setTitle('') }}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={addM.isPending}>
                  {addM.isPending ? 'Vinculando…' : 'Vincular'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {members.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 text-center">
          <Users className="mb-3 size-10 text-muted-foreground/30" />
          <p className="text-sm font-medium">Nenhuma pessoa vinculada</p>
          <p className="text-xs text-muted-foreground">Vincule sócios, responsáveis ou funcionários com o título de cada um.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map(m => (
            <div key={m.id} className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <UserRound className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <Link to="/admin/usuarios/$id" params={{ id: m.userData.id }} className="block truncate text-sm font-medium hover:underline">
                    {m.userData.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {[m.userData.cpf ? maskCPF(m.userData.cpf) : null, m.userData.email].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:shrink-0">
                {editing?.id === m.id ? (
                  <>
                    <Input className="h-8 w-48" list="company-title-suggestions" maxLength={80} autoFocus
                      aria-label={`Título de ${m.userData.name}`} value={editing.title}
                      onChange={e => setEditing({ id: m.id, title: upperNoAccents(e.target.value) })}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleSaveTitle() } if (e.key === 'Escape') setEditing(null) }} />
                    <Button size="icon" variant="ghost" className="size-8" onClick={handleSaveTitle} disabled={updateM.isPending} aria-label="Salvar título">
                      <Check className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(null)} aria-label="Cancelar edição">
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary">{m.title}</Badge>
                    {!readOnly && (
                      <>
                        <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing({ id: m.id, title: m.title })}
                          aria-label={`Editar título de ${m.userData.name}`} title="Editar título">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setRemoveTarget(m)} aria-label={`Desvincular ${m.userData.name}`} title="Desvincular">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!removeTarget}
        onOpenChange={open => { if (!open) setRemoveTarget(null) }}
        title="Desvincular pessoa"
        description={<>Desvincular <strong>{removeTarget?.userData.name}</strong> ({removeTarget?.title}) desta empresa? O cadastro da pessoa não é apagado.</>}
        onConfirm={handleRemove}
        pending={removeM.isPending}
        confirmLabel="Desvincular"
        pendingLabel="Desvinculando…"
      />
    </div>
  )
}
