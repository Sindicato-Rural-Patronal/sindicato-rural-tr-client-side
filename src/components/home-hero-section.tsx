import { useCallback, useState, useSyncExternalStore } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'
import { useBanners } from '@/hooks/useBanner'
import type { BannerButton, PublicBanner } from '@/hooks/useBanner'
import { safeUrl } from '@/utils/safe-url'
import { cn } from '@/lib/utils'

// Os banners são cartazes que o próprio Sindicato faz, com o texto escrito na
// imagem. Eles aparecem inteiros, na proporção em que o painel recorta
// (1440 × 600), ao lado do título e de um botão de verdade; no celular o
// cartaz vem primeiro e o texto embaixo. Antes o cartaz era esticado e cortado
// na tela toda, com o título por cima dos textos dele.
const POSTER_ASPECT = 'aspect-[12/5]'

// Troca sozinho bem devagar e para quando o mouse passa, o foco entra ou a
// pessoa usa as setas. Com "reduzir movimento" só troca quando a pessoa pede.
const AUTOPLAY_DELAY = 9000
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia?.(REDUCED_MOTION)
  mql?.addEventListener('change', onChange)
  return () => mql?.removeEventListener('change', onChange)
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia?.(REDUCED_MOTION).matches ?? false,
    () => true,
  )
}

function BannerBtn({ btn, index }: { btn: BannerButton; index: number }) {
  // h-11: alvo de toque de 44px. asChild: o próprio link é o botão.
  const variant = index === 0 ? 'default' : 'outline'
  const inner = btn.external ? (
    <a href={safeUrl(btn.url)} target="_blank" rel="noopener noreferrer">{btn.label}</a>
  ) : (
    <Link to={safeUrl(btn.url) as never}>{btn.label}</Link>
  )
  return (
    <Button asChild size="lg" variant={variant} className="h-11 px-5">
      {inner}
    </Button>
  )
}

function BannerSlide({ banner, index }: { banner: PublicBanner; index: number }) {
  const Heading = index === 0 ? 'h1' : 'h2'
  return (
    <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      {banner.imageUrl && (
        <figure className={cn('overflow-hidden rounded-xl border border-border bg-muted lg:order-2', POSTER_ASPECT)}>
          <img
            src={banner.imageUrl}
            // O cartaz tem o próprio texto: o alt diz o que ele anuncia.
            alt={banner.subtitle ? `${banner.title}: ${banner.subtitle}` : banner.title}
            width={1440}
            height={600}
            decoding={index === 0 ? 'auto' : 'async'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            loading={index === 0 ? 'eager' : 'lazy'}
            className="h-full w-full object-contain"
          />
        </figure>
      )}
      {/* lg:pb-14 guarda o lugar das setas, que ficam no pé desta coluna. */}
      <div className={cn('flex flex-col items-start lg:pb-14', !banner.imageUrl && 'lg:col-span-2')}>
        <Heading className="text-3xl font-semibold leading-tight tracking-tight text-foreground text-balance wrap-break-word md:text-4xl lg:text-[2.75rem]">
          {banner.title}
        </Heading>
        {banner.subtitle && (
          <p className="mt-3 max-w-xl text-base text-muted-foreground md:text-lg">{banner.subtitle}</p>
        )}
        {banner.buttons.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {banner.buttons.map((btn, i) => (
              <BannerBtn key={i} btn={btn} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function HeroFrame({ children }: { children: React.ReactNode }) {
  return (
    <section className="border-b border-border">
      <div className="container mx-auto px-4 py-6 md:py-10 lg:py-12">{children}</div>
    </section>
  )
}

export function HeroSection() {
  const reduceMotion = usePrefersReducedMotion()
  // Uma instância só do plugin (inicialização preguiçosa), lida no render sem ref.
  const [autoplay] = useState(() => Autoplay({
    delay: AUTOPLAY_DELAY,
    stopOnInteraction: true,
    stopOnMouseEnter: true,
    stopOnFocusIn: true,
  }))
  const [api, setApi] = useState<CarouselApi>()
  const { data: banners, isLoading, isError, isFetching, refetch } = useBanners()

  // Qual cartaz está na tela (para o "1 de 2" e os pontos), lido direto do Embla.
  const subscribe = useCallback((onChange: () => void) => {
    if (!api) return () => {}
    api.on('select', onChange)
    api.on('reInit', onChange)
    return () => {
      api.off('select', onChange)
      api.off('reInit', onChange)
    }
  }, [api])
  const selected = useSyncExternalStore(subscribe, () => api?.selectedScrollSnap() ?? 0, () => 0)

  if (isLoading) {
    return (
      <HeroFrame>
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
          <Skeleton className={cn('w-full rounded-xl lg:order-2', POSTER_ASPECT)} />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-3 h-11 w-36" />
          </div>
        </div>
      </HeroFrame>
    )
  }

  if (isError && !banners) {
    return (
      <LoadErrorRetry variant="inline" className="container mx-auto justify-center px-4 py-8" onRetry={() => void refetch()} retrying={isFetching} />
    )
  }

  if (!banners || banners.length === 0) return null

  const many = banners.length > 1
  // Seta e ponto contam como "a pessoa pediu": o carrossel para de trocar sozinho.
  const goTo = (i: number) => {
    autoplay.stop()
    api?.scrollTo(i)
  }

  return (
    <HeroFrame>
      <Carousel
        opts={{ loop: true, align: 'start', duration: reduceMotion ? 1 : 30 }}
        plugins={many && !reduceMotion ? [autoplay] : []}
        setApi={setApi}
        aria-label="Avisos do Sindicato"
        className="relative"
      >
        <CarouselContent>
          {banners.map((banner, i) => (
            <CarouselItem key={banner.id} aria-label={`${i + 1} de ${banners.length}`}>
              <BannerSlide banner={banner} index={i} />
            </CarouselItem>
          ))}
        </CarouselContent>

        {many && (
          // Computador: no pé da coluna do texto, alinhadas com a base do cartaz.
          <div className="mt-5 flex items-center gap-3 lg:absolute lg:bottom-0 lg:left-0 lg:mt-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 rounded-full sm:size-9"
              onClick={() => goTo((selected - 1 + banners.length) % banners.length)}
              aria-label="Aviso anterior"
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 rounded-full sm:size-9"
              onClick={() => goTo((selected + 1) % banners.length)}
              aria-label="Próximo aviso"
            >
              <ChevronRight />
            </Button>
            <div className="ml-1 flex items-center gap-1" role="group" aria-label="Escolher aviso">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Aviso ${i + 1}: ${b.title}`}
                  aria-current={i === selected}
                  className="group/dot flex size-6 items-center justify-center rounded-full"
                >
                  <span
                    className={cn(
                      'h-1.5 rounded-full transition-colors',
                      i === selected ? 'w-5 bg-primary' : 'w-1.5 bg-foreground/25 group-hover/dot:bg-foreground/45',
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </Carousel>
    </HeroFrame>
  )
}
