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
import { bannerHasContent, bannerTitle, hasBannerTitle, isPosterOnly } from '@/lib/banner-layout'
import { cn } from '@/lib/utils'

// Os banners são cartazes que o próprio Sindicato faz, com o texto escrito na
// imagem. Eles aparecem inteiros, na proporção em que o painel recorta
// (1440 × 600). Antes o cartaz era esticado e cortado na tela toda, com o
// título por cima dos textos dele. Dois jeitos (SR-155):
// - só o cartaz (sem subtítulo e sem botões, o caso mais comum): grande e no
//   meio; o título fica só para o leitor de tela, porque às vezes é um "."
//   posto só porque o campo é obrigatório;
// - com subtítulo ou botões: o título, o subtítulo e os botões à esquerda e o
//   cartaz à direita; no celular o cartaz vem primeiro e o texto embaixo.
const POSTER_ASPECT = 'aspect-[12/5]'
// Só o cartaz: até 1152 px de largura (480 de altura), para não virar uma
// parede em tela larga e caber inteiro na primeira tela de um notebook.
const POSTER_ONLY_WIDTH = 'max-w-6xl'

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

function PosterImage({ src, alt, index }: { src: string; alt: string; index: number }) {
  return (
    <img
      src={src}
      alt={alt}
      width={1440}
      height={600}
      decoding={index === 0 ? 'auto' : 'async'}
      fetchPriority={index === 0 ? 'high' : 'auto'}
      loading={index === 0 ? 'eager' : 'lazy'}
      className="h-full w-full object-contain"
    />
  )
}

function BannerSlide({ banner, index }: { banner: PublicBanner; index: number }) {
  const Heading = index === 0 ? 'h1' : 'h2'
  // Título sem letra nem número ("." "-" "…") nunca aparece nem é lido.
  const title = bannerTitle(banner.title)

  if (banner.imageUrl && isPosterOnly(banner)) {
    // O cartaz tem o próprio texto: o título é o que o leitor de tela lê.
    return (
      <div data-layout="cartaz" className="w-full">
        <Heading className="sr-only">{title}</Heading>
        <figure className={cn('mx-auto w-full overflow-hidden rounded-xl border border-border bg-muted', POSTER_ONLY_WIDTH, POSTER_ASPECT)}>
          <PosterImage src={banner.imageUrl} alt={title} index={index} />
        </figure>
      </div>
    )
  }

  const showTitle = hasBannerTitle(banner.title)
  const subtitle = banner.subtitle?.trim()
  return (
    <div data-layout="texto" className="grid w-full items-center gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      {banner.imageUrl && (
        <figure className={cn('overflow-hidden rounded-xl border border-border bg-muted lg:order-2', POSTER_ASPECT)}>
          {/* O alt diz o que o cartaz anuncia. */}
          <PosterImage src={banner.imageUrl} alt={subtitle ? `${title}: ${subtitle}` : title} index={index} />
        </figure>
      )}
      <div className={cn('flex flex-col items-start', !banner.imageUrl && 'lg:col-span-2')}>
        <Heading
          className={showTitle
            ? 'text-3xl font-semibold leading-tight tracking-tight text-foreground text-balance wrap-break-word md:text-4xl xl:text-[2.75rem]'
            : 'sr-only'}
        >
          {title}
        </Heading>
        {subtitle && (
          <p className={cn('max-w-xl text-base text-muted-foreground md:text-lg', showTitle && 'mt-3')}>{subtitle}</p>
        )}
        {banner.buttons.length > 0 && (
          <div className={cn('flex flex-wrap gap-3', (showTitle || subtitle) && 'mt-6')}>
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
    // O formato do caso mais comum (só o cartaz): a página não pula quando chega.
    return (
      <HeroFrame>
        <Skeleton className={cn('mx-auto w-full rounded-xl', POSTER_ONLY_WIDTH, POSTER_ASPECT)} />
      </HeroFrame>
    )
  }

  if (isError && !banners) {
    return (
      <LoadErrorRetry variant="inline" className="container mx-auto justify-center px-4 py-8" onRetry={() => void refetch()} retrying={isFetching} />
    )
  }

  const visible = banners?.filter(bannerHasContent) ?? []
  if (visible.length === 0) return null

  const many = visible.length > 1
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
      >
        <CarouselContent>
          {visible.map((banner, i) => (
            // Os slides têm a altura do maior. No computador cada um fica no meio
            // dessa altura; no celular fica em cima, com o cartaz no mesmo lugar
            // nos dois jeitos.
            <CarouselItem key={banner.id} aria-label={`${i + 1} de ${visible.length}`} className="flex flex-col lg:justify-center">
              <BannerSlide banner={banner} index={i} />
            </CarouselItem>
          ))}
        </CarouselContent>

        {many && (
          // Embaixo do carrossel e no meio, no mesmo lugar em qualquer slide
          // (só o cartaz ou com texto).
          <div className="mt-5 flex items-center justify-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 rounded-full sm:size-9"
              onClick={() => goTo((selected - 1 + visible.length) % visible.length)}
              aria-label="Aviso anterior"
            >
              <ChevronLeft />
            </Button>
            <div className="flex items-center gap-1" role="group" aria-label="Escolher aviso">
              {visible.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => goTo(i)}
                  // Sem título de verdade, só o número ("Aviso 1"), nunca "Aviso 1: .".
                  aria-label={hasBannerTitle(b.title) ? `Aviso ${i + 1}: ${bannerTitle(b.title)}` : `Aviso ${i + 1}`}
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 rounded-full sm:size-9"
              onClick={() => goTo((selected + 1) % visible.length)}
              aria-label="Próximo aviso"
            >
              <ChevronRight />
            </Button>
          </div>
        )}
      </Carousel>
    </HeroFrame>
  )
}
