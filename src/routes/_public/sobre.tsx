import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Clock, ExternalLink, MapPin, Phone } from 'lucide-react'
import { GalleryLightbox } from '@/components/GalleryLightbox'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { PublicPageHeader } from '@/components/PublicPageHeader'
import { usePublicGalleries, type GalleryAlbum } from '@/hooks/useGalleries'
import { useOrgInfo, usePublicSiteSettings } from '@/hooks/useSiteSettings'
import { useSeo } from '@/hooks/useSeo'
import { orgAddressLines, phoneDigits } from '@/lib/org-contact'
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
  const { data: settings, isLoading, isError, isFetching, refetch } = usePublicSiteSettings()
  const org = useOrgInfo()
  const address = orgAddressLines(org)
  const text = paragraphs(settings?.aboutText ?? '')
  // Linha de contexto: a cidade da sede e quantas fotos a galeria tem (mesma consulta da galeria).
  const { data: albums, isLoading: albumsLoading } = usePublicGalleries()
  const photoCount = (albums ?? []).reduce((n, a) => n + a.photos.length, 0)
  const city = [org.city, org.state].filter(Boolean).join(' – ')

  return (
    <main>
      <PublicPageHeader
        width="max-w-5xl"
        title={t('aboutPage.title')}
        description={t('aboutPage.subtitle')}
        context={isLoading || albumsLoading ? null : (
          <>
            {city && <>Sede em {city}</>}
            {city && photoCount > 0 && ' · '}
            {photoCount > 0 && (
              <a href="#galeria" className="text-foreground underline-offset-4 hover:underline">
                <span className="font-medium tabular-nums">{photoCount}</span> {photoCount > 1 ? 'fotos' : 'foto'} na galeria
              </a>
            )}
          </>
        )}
      />

      <section className="py-12 md:py-16">
        <div className="container mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t('aboutPage.whoWeAre')}</h2>
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            ) : isError && !settings ? (
              // Sem os dados, o texto genérico pareceria o texto de verdade.
              <LoadErrorRetry className="rounded-xl border border-border bg-card" onRetry={() => void refetch()} retrying={isFetching} />
            ) : (
              (text.length ? text : [t('aboutPage.fallback')]).map((p, i) => (
                <p key={i} className="whitespace-pre-line text-base leading-relaxed text-foreground/85">{p}</p>
              ))
            )}
          </div>

          <aside className="flex h-fit flex-col gap-4 rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">{t('aboutPage.visit')}</h2>
            {address.length > 0 && (
              <div className="flex gap-3 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0 text-faint-foreground" />
                <div className="text-muted-foreground">
                  {address.map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </div>
            )}
            {org.phone && (
              <div className="flex gap-3 text-sm">
                <Phone className="mt-0.5 size-4 shrink-0 text-faint-foreground" />
                <a href={`tel:${phoneDigits(org.phone)}`} className="text-muted-foreground hover:text-foreground">{org.phone}</a>
              </div>
            )}
            {org.hours.length > 0 && (
              <div className="flex gap-3 text-sm">
                <Clock className="mt-0.5 size-4 shrink-0 text-faint-foreground" />
                <div className="flex flex-col gap-0.5 text-muted-foreground">
                  {org.hours.map(h => (
                    <p key={h.label}>{h.label}{h.time && <>: <span className="text-foreground">{h.time}</span></>}</p>
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

// Todas as fotos de todas as galerias ativas (âncora #galeria).
function AboutGallery() {
  const { t } = useTranslation()
  const { data: albums = [], isLoading, isError, isFetching, refetch } = usePublicGalleries()
  const [viewer, setViewer] = useState<{ album: GalleryAlbum; index: number } | null>(null)

  // As fotos chegam depois da navegação: rola até a seção quando ela existir.
  useEffect(() => {
    if (isLoading || window.location.hash !== '#galeria') return
    document.getElementById('galeria')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [isLoading])

  // Sem galeria nenhuma a seção não existe; falha ao carregar é aviso (o link
  // #galeria leva até aqui e não pode cair no nada).
  if (!isLoading && !isError && albums.length === 0) return null

  return (
    <section id="galeria" className="scroll-mt-20 border-t border-border py-12 md:py-16">
      <div className="container mx-auto flex max-w-5xl flex-col gap-10 px-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{t('gallery.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('gallery.subtitle')}</p>
        </div>

        {isError && albums.length === 0 && (
          <LoadErrorRetry className="rounded-xl border border-border bg-card" onRetry={() => void refetch()} retrying={isFetching} />
        )}

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
                  {/* Hover escurece de leve a foto (não cresce). */}
                  <img src={photo.url} alt="" loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-opacity group-hover:opacity-90" />
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
