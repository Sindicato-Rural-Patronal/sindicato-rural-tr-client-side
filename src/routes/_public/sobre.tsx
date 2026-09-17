import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Clock, ExternalLink, MapPin, Phone } from 'lucide-react'
import { GalleryLightbox } from '@/components/GalleryLightbox'
import { Skeleton } from '@/components/ui/skeleton'
import { usePublicGalleries, type GalleryAlbum } from '@/hooks/useGalleries'
import { useOrgInfo, usePublicSiteSettings } from '@/hooks/useSiteSettings'
import { useSeo } from '@/hooks/useSeo'
import { phoneDigits } from '@/lib/org-contact'
import { safeUrl } from '@/utils/safe-url'

export const Route = createFileRoute('/_public/sobre')({
  component: AboutPage,
})

// Texto da página vem de Configurações do site › Dados do sindicato;
// parágrafos separados por linha em branco.
function paragraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
}

function AboutPage() {
  const { t } = useTranslation()
  useSeo({ title: t('aboutPage.title'), description: t('aboutPage.seo') })
  const { data: settings, isLoading } = usePublicSiteSettings()
  const org = useOrgInfo()
  const text = paragraphs(settings?.aboutText ?? '')

  return (
    <main>
      <section className="bg-primary py-14 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">{t('aboutPage.title')}</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-primary-foreground/80">{t('aboutPage.subtitle')}</p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <h2 className="text-2xl font-bold text-foreground">{t('aboutPage.whoWeAre')}</h2>
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            ) : (
              (text.length ? text : [t('aboutPage.fallback')]).map((p, i) => (
                <p key={i} className="whitespace-pre-line leading-relaxed text-muted-foreground">{p}</p>
              ))
            )}
          </div>

          <aside className="flex h-fit flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold text-foreground">{t('aboutPage.visit')}</h2>
            <div className="flex gap-3 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="text-muted-foreground">
                <p>{org.street}, {org.district}</p>
                <p>{org.city} – {org.state}, {org.zip}</p>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
              <a href={`tel:${phoneDigits(org.phone)}`} className="text-muted-foreground hover:text-foreground">{org.phone}</a>
            </div>
            {org.hours.length > 0 && (
              <div className="flex gap-3 text-sm">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="flex flex-col gap-0.5 text-muted-foreground">
                  {org.hours.map(h => (
                    <p key={h.label}>{h.label}{h.time && <>: <span className="tabular-nums text-foreground">{h.time}</span></>}</p>
                  ))}
                </div>
              </div>
            )}
            <Link to="/contato" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline">
              {t('aboutPage.contact')} <ArrowRight className="size-4" />
            </Link>
          </aside>
        </div>
      </section>

      <AboutGallery />
    </main>
  )
}

// Todas as fotos de todas as galerias ativas. A home linka para cá com #galeria.
function AboutGallery() {
  const { t } = useTranslation()
  const { data: albums = [], isLoading } = usePublicGalleries()
  const [viewer, setViewer] = useState<{ album: GalleryAlbum; index: number } | null>(null)

  // As fotos chegam depois da navegação: rola até a seção quando ela existir.
  useEffect(() => {
    if (isLoading || window.location.hash !== '#galeria') return
    document.getElementById('galeria')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [isLoading])

  if (!isLoading && albums.length === 0) return null

  return (
    <section id="galeria" className="scroll-mt-20 border-t bg-muted/40 py-12 md:py-16">
      <div className="container mx-auto flex max-w-5xl flex-col gap-10 px-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">{t('gallery.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('gallery.subtitle')}</p>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square w-full rounded-lg" />)}
          </div>
        )}

        {albums.map(album => (
          <div key={album.id} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-xl font-semibold text-foreground">{album.title}</h3>
                {album.description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{album.description}</p>}
              </div>
              {album.linkUrl && (
                <a href={safeUrl(album.linkUrl)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  {t('gallery.learnMore')} <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {album.photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setViewer({ album, index })}
                  aria-label={photo.caption ?? `${album.title} — ${t('gallery.photo')} ${index + 1}`}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <img src={photo.url} alt="" loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  {photo.caption && (
                    <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-linear-to-t from-black/75 to-transparent px-2 pb-1.5 pt-6 text-left text-xs text-white">
                      {photo.caption}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
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
