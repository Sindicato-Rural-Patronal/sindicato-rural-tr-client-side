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
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'

export const Route = createFileRoute('/_admin/admin/salas/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: salas, isLoading, isError } = useRooms()
  const createRoom = useCreateRoom()
  const updateRoom = useUpdateRoom()
  const deleteRoom = useDeleteRoom()

  const [busca, setBusca] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', maxCapacity: '' })
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null)

  const salasFiltradas = (salas ?? []).filter(s =>
    s.name.toLowerCase().includes(busca.toLowerCase()) ||
    (s.description ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  function abrirNovo() {
    setEditId(null)
    setForm({ name: '', description: '', maxCapacity: '' })
    setError(null)
    setDialogOpen(true)
  }

  function abrirEditar(sala: Room) {
    setEditId(sala.id)
    setForm({ name: sala.name, description: sala.description ?? '', maxCapacity: String(sala.maxCapacity) })
    setError(null)
    setDialogOpen(true)
  }

  async function handleSubmit() {
    setError(null)
    const body = {
      name: form.name,
      description: form.description,
      maxCapacity: Number(form.maxCapacity),
    }
    try {
      if (editId) {
        await updateRoom.mutateAsync({ id: editId, body })
        toast.success('Sala atualizada com sucesso!')
      } else {
        await createRoom.mutateAsync(body)
        toast.success('Sala criada com sucesso!')
      }
      setDialogOpen(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar sala.'
      setError(msg)
      toast.error(msg)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteRoom.mutateAsync(deleteTarget.id)
      toast.success('Sala removida.')
      setDeleteTarget(null)
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
        <Button onClick={abrirNovo} className="shrink-0">
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

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Erro ao carregar salas.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
              <TableHead>Capacidade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
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
                    <Button className="mt-4" onClick={abrirNovo}>
                      <Plus className="size-4" /> Nova Sala
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
            {salasFiltradas.map(sala => (
              <TableRow key={sala.id}>
                <TableCell className="font-medium text-foreground">{sala.name}</TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {sala.description || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{sala.maxCapacity} lugares</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => abrirEditar(sala)}
                      title="Editar sala"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(sala)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Sala' : 'Nova Sala'}</DialogTitle>
            <DialogDescription>
              {editId ? 'Atualize os dados da sala' : 'Preencha os dados para cadastrar uma nova sala'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Laboratório 01"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Ex: Sala de treinamentos práticos"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Capacidade máxima *</Label>
              <Input
                type="number"
                min="1"
                value={form.maxCapacity}
                onChange={e => setForm(p => ({ ...p, maxCapacity: e.target.value }))}
                placeholder="30"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name || !form.maxCapacity || saving}
            >
              {saving ? 'Salvando...' : editId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sala</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a sala <strong>{deleteTarget?.name}</strong>? Esta ação
              não pode ser desfeita. Salas vinculadas a cursos não podem ser removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRoom.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => { e.preventDefault(); handleDelete() }}
              disabled={deleteRoom.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteRoom.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
