import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useRooms, useCreateRoom } from '@/hooks/useRooms'
import { Plus, Search, DoorOpen } from 'lucide-react'
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

export const Route = createFileRoute('/_admin/admin/salas/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: salas, isLoading, isError } = useRooms()
  const createRoom = useCreateRoom()

  const [busca, setBusca] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', maxCapacity: '' })
  const [error, setError] = useState<string | null>(null)

  const salasFiltradas = (salas ?? []).filter(s =>
    s.name.toLowerCase().includes(busca.toLowerCase()) ||
    (s.description ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  function abrirNovo() {
    setForm({ name: '', description: '', maxCapacity: '' })
    setError(null)
    setDialogOpen(true)
  }

  async function handleSubmit() {
    setError(null)
    try {
      await createRoom.mutateAsync({
        name: form.name,
        description: form.description,
        maxCapacity: Number(form.maxCapacity),
      })
      toast.success('Sala criada com sucesso!')
      setDialogOpen(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar sala.'
      setError(msg)
      toast.error(msg)
    }
  }

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
              </TableRow>
            ))}
            {!isLoading && salasFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-16 text-center">
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Sala</DialogTitle>
            <DialogDescription>Preencha os dados para cadastrar uma nova sala</DialogDescription>
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
              disabled={!form.name || !form.maxCapacity || createRoom.isPending}
            >
              {createRoom.isPending ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
