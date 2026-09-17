import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ExternalLink, Eye, EyeOff, ImagePlus, Loader2,
  MessageSquareText, Pencil, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { apiErrorMessage } from '@/lib/api-error-message'
import { safeUrl } from '@/utils/safe-url'
import {
  useDeleteGalleryPhoto, useReorderGalleryPhotos, useUpdateGalleryPhoto, useUploadGalleryPhoto,
  type GalleryAlbum, type GalleryPhoto,
} from '@/hooks/useGalleries'

const MAX_PHOTOS = 60

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

// Uma galeria no painel: dados, ordem, visibilidade e as fotos.
export function GalleryAlbumCard({
  album, index, total, canEdit, canDelete, onEdit, onToggleActive, onMove, onDelete,
}: {
  album: GalleryAlbum
  index: number
  total: number
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
  onToggleActive: () => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
}) {
  const upload = useUploadGalleryPhoto()
  const updatePhoto = useUpdateGalleryPhoto()
  const deletePhoto = useDeleteGalleryPhoto()
  const reorderPhotos = useReorderGalleryPhotos()
  const fileRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [captionTarget, setCaptionTarget] = useState<GalleryPhoto | null>(null)
  const [caption, setCaption] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<GalleryPhoto | null>(null)

  const photos = album.photos
  const hidden = !album.isActive || photos.length === 0

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    const room = MAX_PHOTOS - photos.length
    const list = Array.from(files).slice(0, room)
    if (files.length > room) toast.warning(`Cabem só mais ${room} foto${room === 1 ? '' : 's'} nesta galeria.`)
    let failed = 0
    setProgress({ done: 0, total: list.length })
    // Uma por vez: fotos de celular são pesadas e o servidor reduz cada uma.
    for (const [i, file] of list.entries()) {
      try {
        await upload.mutateAsync({ albumId: album.id, file })
      } catch (e) {
        failed++
        toast.error(`${file.name}: ${apiErrorMessage(e, 'não foi possível enviar.')}`)
      }
      setProgress({ done: i + 1, total: list.length })
    }
    setProgress(null)
    if (fileRef.current) fileRef.current.value = ''
    const sent = list.length - failed
    if (sent > 0) toast.success(`${sent} foto${sent === 1 ? '' : 's'} adicionada${sent === 1 ? '' : 's'}.`)
  }

  async function handleMovePhoto(from: number, to: number) {
    try {
      await reorderPhotos.mutateAsync({ albumId: album.id, order: move(photos, from, to).map(p => p.id) })
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao reordenar as fotos.'))
    }
  }

  async function saveCaption(e: React.FormEvent) {
    e.preventDefault()
    if (!captionTarget) return
    try {
      await updatePhoto.mutateAsync({ albumId: album.id, photoId: captionTarget.id, caption: caption.trim() || null })
      setCaptionTarget(null)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao salvar a legenda.'))
    }
  }

  async function confirmDeletePhoto() {
    if (!deleteTarget) return
    try {
      await deletePhoto.mutateAsync({ albumId: album.id, photoId: deleteTarget.id })
      setDeleteTarget(null)
      toast.success('Foto excluída.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao excluir a foto.'))
    }
  }

  return (
    <Card className={hidden ? 'border-dashed' : ''}>
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{album.title}</h2>
            <Badge variant="secondary">{photos.length} foto{photos.length === 1 ? '' : 's'}</Badge>
            {!album.isActive
              ? <Badge variant="outline" className="gap-1"><EyeOff className="size-3" /> Oculta</Badge>
              : photos.length === 0
                ? <Badge variant="outline">Sem fotos: não aparece no site</Badge>
                : <Badge className="gap-1"><Eye className="size-3" /> No site</Badge>}
          </div>
          {album.description && <p className="mt-1 text-sm text-muted-foreground">{album.description}</p>}
          {album.linkUrl && (
            <a href={safeUrl(album.linkUrl)} target="_blank" rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLink className="size-3" /> {album.linkUrl}
            </a>
          )}
        </div>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-1">
            <Button size="sm" variant="ghost" className="h-8 px-2" disabled={index === 0} onClick={() => onMove(-1)}
              aria-label={`Subir ${album.title}`} title="Subir"><ArrowUp className="size-4" /></Button>
            <Button size="sm" variant="ghost" className="h-8 px-2" disabled={index === total - 1} onClick={() => onMove(1)}
              aria-label={`Descer ${album.title}`} title="Descer"><ArrowDown className="size-4" /></Button>
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={onToggleActive}
              aria-label={album.isActive ? `Ocultar ${album.title}` : `Mostrar ${album.title}`}
              title={album.isActive ? 'Ocultar do site' : 'Mostrar no site'}>
              {album.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={onEdit}
              aria-label={`Editar ${album.title}`} title="Editar"><Pencil className="size-4" /></Button>
            {canDelete && (
              <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={onDelete}
                aria-label={`Excluir ${album.title}`} title="Excluir galeria"><Trash2 className="size-4" /></Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {photos.map((p, i) => (
            <figure key={p.id} className="group flex flex-col overflow-hidden rounded-lg border border-border bg-muted/30">
              <div className="relative aspect-4/3 bg-muted">
                <img src={p.url} alt={p.caption ?? `Foto ${i + 1} de ${album.title}`} loading="lazy"
                  className="absolute inset-0 size-full object-cover" />
                <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 text-[10px] font-medium text-white">{i + 1}</span>
              </div>
              <figcaption className="flex min-h-8 items-center px-2 py-1 text-xs text-muted-foreground">
                <span className="line-clamp-2">{p.caption || <em className="opacity-60">Sem legenda</em>}</span>
              </figcaption>
              {canEdit && (
                <div className="flex items-center justify-between border-t border-border px-1 py-0.5">
                  <div className="flex">
                    <Button size="sm" variant="ghost" className="h-7 px-1.5" disabled={i === 0 || reorderPhotos.isPending}
                      onClick={() => handleMovePhoto(i, i - 1)} aria-label={`Mover foto ${i + 1} para trás`} title="Mover para trás">
                      <ArrowLeft className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-1.5" disabled={i === photos.length - 1 || reorderPhotos.isPending}
                      onClick={() => handleMovePhoto(i, i + 1)} aria-label={`Mover foto ${i + 1} para frente`} title="Mover para frente">
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                  <div className="flex">
                    <Button size="sm" variant="ghost" className="h-7 px-1.5"
                      onClick={() => { setCaptionTarget(p); setCaption(p.caption ?? '') }}
                      aria-label={`Legenda da foto ${i + 1}`} title="Legenda">
                      <MessageSquareText className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-1.5 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(p)} aria-label={`Excluir foto ${i + 1}`} title="Excluir foto">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </figure>
          ))}

          {canEdit && photos.length < MAX_PHOTOS && (
            <button
              type="button"
              disabled={!!progress}
              onClick={() => fileRef.current?.click()}
              className="flex aspect-4/3 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-wait"
            >
              {progress
                ? <><Loader2 className="size-5 animate-spin" /> Enviando {Math.min(progress.done + 1, progress.total)} de {progress.total}…</>
                : <><ImagePlus className="size-5" /> Adicionar fotos</>}
            </button>
          )}
        </div>
        {photos.length === 0 && !canEdit && <p className="text-sm text-muted-foreground">Nenhuma foto ainda.</p>}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden"
          aria-label={`Enviar fotos para ${album.title}`} onChange={e => handleFiles(e.target.files)} />
      </CardContent>

      <Dialog open={!!captionTarget} onOpenChange={o => { if (!o) setCaptionTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={saveCaption} className="flex flex-col gap-4">
            <DialogHeader><DialogTitle>Legenda da foto</DialogTitle></DialogHeader>
            {captionTarget && <img src={captionTarget.url} alt="" className="max-h-56 w-full rounded-md object-contain bg-muted" />}
            <Input aria-label="Legenda" maxLength={200} value={caption} onChange={e => setCaption(e.target.value)}
              placeholder="Ex.: Fundação do sindicato, 1986" autoFocus />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCaptionTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={updatePhoto.isPending}>Salvar legenda</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => { if (!o) setDeleteTarget(null) }}
        title="Excluir foto"
        description="A foto sai da galeria e da página Sobre. Não dá para desfazer."
        onConfirm={confirmDeletePhoto}
        pending={deletePhoto.isPending}
      />
    </Card>
  )
}
