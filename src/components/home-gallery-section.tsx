import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Images } from 'lucide-react'
import { GalleryLightbox } from '@/components/GalleryLightbox'
import { Skeleton } from '@/components/ui/skeleton'
import { usePublicGalleries, type GalleryAlbum } from '@/hooks/useGalleries'

// Galerias de imagens da home (História do Sindicato, FAEP, Patrulha Rural…),
// geridas em Configurações do site › Galerias. Cada cartão abre as fotos em tela cheia.

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
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">{t('gallery.title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('gallery.subtitle')}</p>
          </div>
          <Link to="/sobre" hash="galeria" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {t('gallery.seeAll')} <ArrowRight className="size-4" />
          </Link>
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
        <GalleryLightbox
          album={viewer.album}
          index={viewer.index}
          onIndex={index => setViewer(v => (v ? { ...v, index } : v))}
          onClose={() => setViewer(null)}
        />
      )}
    </section>
  )
}
