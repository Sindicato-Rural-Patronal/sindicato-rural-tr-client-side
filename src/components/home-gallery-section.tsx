import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, ExternalLink, Images } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { usePublicGalleries, type GalleryAlbum } from '@/hooks/useGalleries'
import { safeUrl } from '@/utils/safe-url'

// Galerias de imagens da home (História do Sindicato, FAEP, Patrulha Rural…),
// geridas em /admin/galerias. Cada cartão abre as fotos em tela cheia.

function Lightbox({ album, index, onIndex, onClose }: {
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

export function HomeGallerySection() {
  const { t } = useTranslation()
  const { data: albums = [], isLoading } = usePublicGalleries()
  const [viewer, setViewer] = useState<{ album: GalleryAlbum; index: number } | null>(null)

  if (!isLoading && albums.length === 0) return null

  // Poucas galerias ocupam a largura sem deixar buraco na grade.
  const grid = albums.length === 1
    ? 'mx-auto max-w-2xl'
    : albums.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <section className="border-b bg-muted/40 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">{t('gallery.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('gallery.subtitle')}</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="aspect-4/3 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className={`grid gap-4 ${grid}`}>
            {albums.map(album => (
              <button
                key={album.id}
                type="button"
                onClick={() => setViewer({ album, index: 0 })}
                className="group relative aspect-4/3 w-full overflow-hidden rounded-xl bg-muted text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <img
                  src={album.photos[0].url}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 text-white">
                  <h3 className="text-lg font-semibold leading-tight">{album.title}</h3>
                  {album.description && <p className="line-clamp-2 text-sm text-white/85">{album.description}</p>}
                  <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-white/90">
                    <Images className="size-3.5" /> {t('gallery.photos', { count: album.photos.length })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {viewer && (
        <Lightbox
          album={viewer.album}
          index={viewer.index}
          onIndex={index => setViewer(v => (v ? { ...v, index } : v))}
          onClose={() => setViewer(null)}
        />
      )}
    </section>
  )
}
