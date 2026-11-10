import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Search, DoorOpen, Pencil, Trash2 } from 'lucide-react'
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom, type Room } from '@/hooks/useRooms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { EmptyState } from '@/components/EmptyState'
import { RowActions } from '@/components/RowActions'
import { NativeSelect } from '@/components/ui/native-select'
import { useCrudDialog } from '@/hooks/useCrudDialog'
import { upperNoAccents } from '@/utils/text-format'
import { roomNameOptions } from '@/lib/room-names'
import { STICKY_ACTIONS_CELL, STICKY_ACTIONS_ROW } from '@/lib/table-sticky-actions'

// Salas do sindicato (aba de Configurações). São seis, de lista fixa, e quase
// nunca mudam — por isso deixaram de ter tela própria e vieram para cá, junto
// dos outros ajustes. Quem marca curso, evento ou reunião escolhe a sala pelo
// nome, e a capacidade aparece no formulário do curso.

export function RoomsPanel({ canCreate, canEdit, canDelete }: {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}) {
  const { data: salas, isLoading, isError, isFetching, refetch } = useRooms()
  const createRoom = useCreateRoom()
  const updateRoom = useUpdateRoom()
  const deleteRoom = useDeleteRoom()

  const [busca, setBusca] = useState('')
  const crud = useCrudDialog<{ name: string; description: string; maxCapacity: string }, Room>({
    empty: () => ({ name: '', description: '', maxCapacity: '' }),
    toForm: sala => ({ name: sala.name, description: sala.description ?? '', maxCapacity: String(sala.maxCapacity) }),
  })

  const termo = busca.trim().toLowerCase()
  const salasFiltradas = (salas ?? []).filter(s =>
    s.name.toLowerCase().includes(termo) || (s.description ?? '').toLowerCase().includes(termo)
  )

  async function handleSubmit() {
    crud.setError(null)
    const body = {
      name: crud.form.name,
      description: crud.form.description,
      maxCapacity: Number(crud.form.maxCapacity),
    }
    try {
      if (crud.editing) {
        await updateRoom.mutateAsync({ id: crud.editing.id, body })
        toast.success('Sala atualizada.')
      } else {
        await createRoom.mutateAsync(body)
        toast.success('Sala cadastrada.')
      }
      crud.forceClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar sala.'
      crud.setError(msg)
      toast.error(msg)
    }
  }

  async function handleDelete() {
    if (!crud.deleteTarget) return
    try {
      await deleteRoom.mutateAsync(crud.deleteTarget.id)
      toast.success('Sala removida.')
      crud.setDeleteTarget(null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao remover sala.'
      toast.error(msg)
    }
  }

  const saving = createRoom.isPending || updateRoom.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {salas
            ? `${salas.length} sala${salas.length !== 1 ? 's' : ''} cadastrada${salas.length !== 1 ? 's' : ''}. A capacidade aparece ao escolher a sala do curso.`
            : 'Salas onde acontecem cursos, eventos e reuniões.'}
        </p>
        {canCreate && (
          <Button onClick={crud.openCreate} className="shrink-0">
            <Plus className="size-4" /> Nova sala
          </Button>
        )}
      </div>

      <div className="relative sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id="salas-busca"
          placeholder="Buscar por nome ou descrição..."
          aria-label="Buscar sala por nome ou descrição"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {isError && !salas && (
        <LoadErrorRetry className="rounded-xl border border-border bg-card" message="Não foi possível carregar as salas." onRetry={() => void refetch()} retrying={isFetching} />
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Descrição</TableHead>
                <TableHead>Capacidade</TableHead>
                {(canEdit || canDelete) && (
                  <TableHead className={`text-right ${STICKY_ACTIONS_CELL}`}>Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  {(canEdit || canDelete) && <TableCell><Skeleton className="ml-auto h-7 w-16" /></TableCell>}
                </TableRow>
              ))}
              {!isLoading && !isError && salasFiltradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="p-0 whitespace-normal">
                    <EmptyState
                      icon={DoorOpen}
                      title={busca ? 'Nenhuma sala encontrada' : 'Nenhuma sala cadastrada'}
                      description={busca ? 'Tente outro termo de busca.' : 'Clique em "Nova sala" para começar.'}
                      action={!busca && canCreate ? (
                        <Button onClick={crud.openCreate}>
                          <Plus className="size-4" /> Nova sala
                        </Button>
                      ) : undefined}
                    />
                  </TableCell>
                </TableRow>
              )}
              {salasFiltradas.map(sala => (
                <TableRow key={sala.id} className={STICKY_ACTIONS_ROW}>
                  <TableCell className="font-medium text-foreground">{sala.name}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {sala.description || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral" className="tabular-nums">{sala.maxCapacity} lugares</Badge>
                  </TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell className={`text-right ${STICKY_ACTIONS_CELL}`}>
                      <RowActions
                        label={`Ações da sala ${sala.name}`}
                        actions={[
                          { label: 'Editar sala', icon: Pencil, hidden: !canEdit, onClick: () => crud.openEdit(sala) },
                          { label: 'Excluir sala', icon: Trash2, destructive: true, hidden: !canDelete, onClick: () => crud.setDeleteTarget(sala) },
                        ]}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={crud.open} onOpenChange={open => { if (!open) crud.forceClose() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{crud.editing ? 'Editar sala' : 'Nova sala'}</DialogTitle>
            <DialogDescription>
              {crud.editing ? 'Atualize os dados da sala.' : 'Escolha a sala e informe quantas pessoas cabem nela.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sala-nome">Sala *</Label>
              <NativeSelect
                id="sala-nome"
                value={crud.form.name}
                onChange={e => crud.setForm(p => ({ ...p, name: e.target.value }))}
              >
                <option value="">Selecione a sala</option>
                {roomNameOptions((salas ?? []).map(s => s.name), crud.editing?.name).map(o => (
                  <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sala-descricao">Descrição</Label>
              <Input
                id="sala-descricao"
                value={crud.form.description}
                onChange={e => crud.setForm(p => ({ ...p, description: upperNoAccents(e.target.value) }))}
                placeholder="Ex: Sala de treinamentos práticos"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sala-capacidade">Capacidade máxima *</Label>
              <Input
                id="sala-capacidade"
                type="number"
                min="1"
                value={crud.form.maxCapacity}
                onChange={e => crud.setForm(p => ({ ...p, maxCapacity: e.target.value }))}
                placeholder="30"
              />
            </div>
            {crud.error && <p className="text-sm text-destructive">{crud.error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={crud.forceClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!crud.form.name || !crud.form.maxCapacity || saving}>
              {saving ? 'Salvando...' : crud.editing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={open => { if (!open) crud.setDeleteTarget(null) }}
        title="Excluir sala"
        description={
          <>
            Tem certeza que deseja excluir a sala <strong>{crud.deleteTarget?.name}</strong>? Esta ação
            não pode ser desfeita. Salas vinculadas a cursos não podem ser removidas.
          </>
        }
        onConfirm={handleDelete}
        pending={deleteRoom.isPending}
      />
    </div>
  )
}
