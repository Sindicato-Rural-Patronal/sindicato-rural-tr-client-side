import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import type { GalleryAlbum, GalleryAlbumInput } from '@/hooks/useGalleries'

// Criar/editar os dados de uma galeria (as fotos são geridas no cartão).
// Montado com `key` pela página, então o estado inicial vem sempre do álbum atual.
export function GalleryAlbumDialog({ open, album, saving, onClose, onSubmit }: {
  open: boolean
  album: GalleryAlbum | null
  saving: boolean
  onClose: () => void
  onSubmit: (input: GalleryAlbumInput) => Promise<boolean>
}) {
  const [title, setTitle] = useState(album?.title ?? '')
  const [description, setDescription] = useState(album?.description ?? '')
  const [linkUrl, setLinkUrl] = useState(album?.linkUrl ?? '')
  const [isActive, setIsActive] = useState(album?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const link = linkUrl.trim()
    if (!title.trim()) return setError('Informe o título.')
    if (link && !/^https?:\/\//i.test(link)) return setError('Link: comece com https://')
    setError(null)
    const ok = await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      linkUrl: link || null,
      isActive,
    })
    if (ok) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{album ? 'Editar galeria' : 'Nova galeria'}</DialogTitle>
            <DialogDescription>
              Aparece na página Sobre assim que tiver pelo menos uma foto e estiver visível.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gallery-title">Título *</Label>
            <Input id="gallery-title" maxLength={120} value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Ex.: Patrulha Rural" autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gallery-description">Descrição</Label>
            <Textarea id="gallery-description" rows={3} maxLength={500} value={description}
              onChange={e => setDescription(e.target.value)} placeholder="Uma frase sobre as fotos" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gallery-link">Link "Saiba mais"</Label>
            <Input id="gallery-link" maxLength={500} value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://" inputMode="url" />
          </div>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="accent-primary" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            Visível no site
          </label>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {album ? 'Salvar' : 'Criar galeria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
