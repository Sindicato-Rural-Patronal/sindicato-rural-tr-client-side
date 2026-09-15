import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom, type Room } from '@/hooks/useRooms'
import { Plus, Search, DoorOpen, Pencil, Trash2 } from 'lucide-react'
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
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { useCrudDialog } from '@/hooks/useCrudDialog'
import { upperNoAccents } from '@/utils/text-format'
import { STICKY_ACTIONS_CELL, STICKY_ACTIONS_ROW } from '@/lib/table-sticky-actions'

export const Route = createFileRoute('/_admin/admin/salas/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: salas, isLoading, isError } = useRooms()
  const createRoom = useCreateRoom()
  const updateRoom = useUpdateRoom()
  const deleteRoom = useDeleteRoom()

  const [busca, setBusca] = useState('')
  const crud = useCrudDialog<{ name: string; description: string; maxCapacity: string }, Room>({
    empty: () => ({ name: '', description: '', maxCapacity: '' }),
    toForm: sala => ({ name: sala.name, description: sala.description ?? '', maxCapacity: String(sala.maxCapacity) }),
  })

  const salasFiltradas = (salas ?? []).filter(s =>
    s.name.toLowerCase().includes(busca.toLowerCase()) ||
    (s.description ?? '').toLowerCase().includes(busca.toLowerCase())
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
        toast.success('Sala atualizada com sucesso!')
      } else {
        await createRoom.mutateAsync(body)
        toast.success('Sala criada com sucesso!')
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
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestão de Salas</h1>
          <p className="text-sm text-muted-foreground">
            {salas
              ? `${salas.length} sala${salas.length !== 1 ? 's' : ''} cadastrada${salas.length !== 1 ? 's' : ''}`
              : 'Cadastre e gerencie as salas e laboratórios'}
          </p>
        </div>
        <Button onClick={crud.openCreate} className="shrink-0">
          <Plus className="size-4" /> Nova Sala
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou descrição..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar salas." />}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
              <TableHead>Capacidade</TableHead>
              <TableHead className={`text-right ${STICKY_ACTIONS_CELL}`}>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
              </TableRow>
            ))}
            {!isLoading && salasFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center">
                  <DoorOpen className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    {busca ? 'Nenhuma sala encontrada' : 'Nenhuma sala cadastrada'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {busca ? 'Tente outro termo de busca.' : 'Clique em "Nova Sala" para começar.'}
                  </p>
                  {!busca && (
                    <Button className="mt-4" onClick={crud.openCreate}>
                      <Plus className="size-4" /> Nova Sala
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
            {salasFiltradas.map(sala => (
              <TableRow key={sala.id} className={STICKY_ACTIONS_ROW}>
                <TableCell className="font-medium text-foreground">{sala.name}</TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {sala.description || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{sala.maxCapacity} lugares</Badge>
                </TableCell>
                <TableCell className={`text-right ${STICKY_ACTIONS_CELL}`}>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => crud.openEdit(sala)}
                      title="Editar sala"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-muted-foreground hover:text-destructive"
                      onClick={() => crud.setDeleteTarget(sala)}
                      title="Excluir sala"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>

      <Dialog open={crud.open} onOpenChange={open => { if (!open) crud.forceClose() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{crud.editing ? 'Editar Sala' : 'Nova Sala'}</DialogTitle>
            <DialogDescription>
              {crud.editing ? 'Atualize os dados da sala' : 'Preencha os dados para cadastrar uma nova sala'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nome *</Label>
              <Input
                value={crud.form.name}
                onChange={e => crud.setForm(p => ({ ...p, name: upperNoAccents(e.target.value) }))}
                placeholder="Ex: Laboratório 01"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Descrição</Label>
              <Input
                value={crud.form.description}
                onChange={e => crud.setForm(p => ({ ...p, description: upperNoAccents(e.target.value) }))}
                placeholder="Ex: Sala de treinamentos práticos"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Capacidade máxima *</Label>
              <Input
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
            <Button
              onClick={handleSubmit}
              disabled={!crud.form.name || !crud.form.maxCapacity || saving}
            >
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
