import { apiErrorMessage } from '@/lib/api-error-message'
import { useState } from 'react'
import { toast } from 'sonner'
import { useDeleteGalleryPhoto } from '@/hooks/useCourse'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'

/** Confirmação + chamada para remover uma foto da galeria de um curso já criado. */
export function useConfirmDeletePhoto(courseId: string) {
  const deletePhoto = useDeleteGalleryPhoto(courseId)
  const [photoId, setPhotoId] = useState<string | null>(null)

  async function confirm() {
    if (!photoId) return
    try {
      await deletePhoto.mutateAsync(photoId)
      toast.success('Foto removida.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover foto.'))
    } finally {
      setPhotoId(null)
    }
  }

  const dialog = (
    <DeleteConfirmDialog
      open={!!photoId}
      onOpenChange={open => { if (!open) setPhotoId(null) }}
      title="Remover foto"
      description="Tem certeza que deseja remover esta foto da galeria? Esta ação não pode ser desfeita."
      onConfirm={confirm}
      pending={deletePhoto.isPending}
      confirmLabel="Remover"
      pendingLabel="Removendo..."
    />
  )
  return { ask: setPhotoId, pending: deletePhoto.isPending, dialog }
}

export function photoCountLabel(n: number) {
  return `${n} foto${n !== 1 ? 's' : ''}`
}
