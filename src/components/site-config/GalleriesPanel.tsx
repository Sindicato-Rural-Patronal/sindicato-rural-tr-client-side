import { useState } from 'react'
import { toast } from 'sonner'
import { Images, Plus } from 'lucide-react'
import { apiErrorMessage } from '@/lib/api-error-message'
import {
  useAdminGalleries, useCreateGallery, useDeleteGallery, useReorderGalleries, useUpdateGallery,
  type GalleryAlbum, type GalleryAlbumInput,
} from '@/hooks/useGalleries'
import { GalleryAlbumCard } from '@/components/galerias/GalleryAlbumCard'
import { GalleryAlbumDialog } from '@/components/galerias/GalleryAlbumDialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

// Galerias de fotos da página inicial (História do Sindicato, FAEP, Patrulha Rural…).
export function GalleriesPanel({ canCreate, canEdit, canDelete }: {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}) {
  const { data: albums, isLoading, isError } = useAdminGalleries()
  const create = useCreateGallery()
  const update = useUpdateGallery()
  const remove = useDeleteGallery()
  const reorder = useReorderGalleries()
  // null = fechado; 'new' = criar; álbum = editar.
  const [dialog, setDialog] = useState<GalleryAlbum | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GalleryAlbum | null>(null)

  const list = albums ?? []

  async function handleSubmit(input: GalleryAlbumInput): Promise<boolean> {
    try {
      if (dialog === 'new') {
        await create.mutateAsync(input)
        toast.success('Galeria criada. Agora adicione as fotos.')
      } else if (dialog) {
        await update.mutateAsync({ id: dialog.id, body: input })
        toast.success('Galeria salva.')
      }
      return true
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao salvar a galeria.'))
      return false
    }
  }

  async function toggleActive(album: GalleryAlbum) {
    try {
      await update.mutateAsync({ id: album.id, body: { isActive: !album.isActive } })
      toast.success(album.isActive ? 'Galeria ocultada da home.' : 'Galeria visível na home.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao alterar a visibilidade.'))
    }
  }

  async function moveAlbum(index: number, direction: -1 | 1) {
    const order = list.map(a => a.id)
    const [id] = order.splice(index, 1)
    order.splice(index + direction, 0, id)
    try {
      await reorder.mutateAsync(order)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao reordenar.'))
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await remove.mutateAsync(deleteTarget.id)
      toast.success('Galeria excluída.')
      setDeleteTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao excluir a galeria.'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Seção "O Sindicato em imagens" da página inicial, na ordem abaixo. Galeria sem foto ou oculta não aparece.
        </p>
        {canCreate && (
          <Button className="shrink-0" onClick={() => setDialog('new')}>
            <Plus className="size-4" /> Nova galeria
          </Button>
        )}
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar as galerias." />}

      {isLoading && Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}

      {!isLoading && !isError && list.length === 0 && (
        <EmptyState icon={Images} title="Nenhuma galeria" description='Clique em "Nova galeria" para começar.' />
      )}

      {list.map((album, i) => (
        <GalleryAlbumCard
          key={album.id}
          album={album}
          index={i}
          total={list.length}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => setDialog(album)}
          onToggleActive={() => toggleActive(album)}
          onMove={direction => moveAlbum(i, direction)}
          onDelete={() => setDeleteTarget(album)}
        />
      ))}

      <GalleryAlbumDialog
        key={dialog === 'new' ? 'new' : dialog?.id ?? 'closed'}
        open={dialog !== null}
        album={dialog === 'new' ? null : dialog}
        saving={create.isPending || update.isPending}
        onClose={() => setDialog(null)}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => { if (!o) setDeleteTarget(null) }}
        title="Excluir galeria"
        description={<>Excluir <strong>{deleteTarget?.title}</strong> e todas as {deleteTarget?.photos.length ?? 0} fotos? Não dá para desfazer.</>}
        onConfirm={confirmDelete}
        pending={remove.isPending}
      />
    </div>
  )
}
