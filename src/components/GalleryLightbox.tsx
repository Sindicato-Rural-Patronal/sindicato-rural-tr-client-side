import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { GalleryAlbum } from '@/hooks/useGalleries'
import { safeUrl } from '@/utils/safe-url'

// Fotos de uma galeria em tela cheia: setas (e ← →), legenda, contador,
// miniaturas e o link "Saiba mais" da galeria. Usado na home e no Sobre.
export function GalleryLightbox({ album, index, onIndex, onClose }: {
  album: GalleryAlbum
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const photos = album.photos
  const photo = photos[index]
  const go = (delta: number) => onIndex((index + delta + photos.length) % photos.length)

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent
        className="max-w-[calc(100%-1rem)] gap-3 p-3 sm:max-w-5xl sm:p-5"
        onKeyDown={e => {
          if (e.key === 'ArrowLeft') go(-1)
          if (e.key === 'ArrowRight') go(1)
        }}
      >
        <div className="pr-8">
          <DialogTitle className="text-lg">{album.title}</DialogTitle>
          <DialogDescription className={album.description ? '' : 'sr-only'}>
            {album.description ?? t('gallery.photos', { count: photos.length })}
          </DialogDescription>
        </div>

        <div className="relative flex items-center justify-center overflow-hidden rounded-lg bg-black">
          <img
            key={photo.id}
            src={photo.url}
            alt={photo.caption ?? `${album.title} — ${index + 1}`}
            className="max-h-[65vh] w-full object-contain"
          />
          {photos.length > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label={t('gallery.previous')}
                className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/80">
                <ChevronLeft className="size-6" />
              </button>
              <button type="button" onClick={() => go(1)} aria-label={t('gallery.next')}
                className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/80">
                <ChevronRight className="size-6" />
              </button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-foreground">{photo.caption}</p>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="tabular-nums">{index + 1} / {photos.length}</span>
            {album.linkUrl && (
              <a href={safeUrl(album.linkUrl)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                {t('gallery.learnMore')} <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        </div>

        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((p, i) => (
              <button key={p.id} type="button" onClick={() => onIndex(i)}
                aria-label={`${t('gallery.photo')} ${i + 1}`} aria-current={i === index}
                className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-opacity ${
                  i === index ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                }`}>
                <img src={p.url} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
