import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,
} from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'
import { useBanners } from '@/hooks/useBanner'
import type { BannerButton } from '@/hooks/useBanner'
import { safeUrl } from '@/utils/safe-url'

function BannerBtn({ btn, index }: { btn: BannerButton; index: number }) {
  const isPrimary = index === 0
  // h-11 + px-5: alvo de toque de 44px no celular. asChild: o próprio link é o
  // botão (antes era <button> dentro de <a>).
  const cls = isPrimary
    ? 'h-11 px-5 bg-white font-semibold text-primary hover:bg-white/90'
    : 'h-11 px-5 border-2 border-white bg-transparent font-semibold text-white hover:bg-white hover:text-primary'

  if (btn.external) {
    return (
      <Button asChild size="lg" variant={isPrimary ? 'default' : 'outline'} className={cls}>
        <a href={safeUrl(btn.url)} target="_blank" rel="noopener noreferrer">
          {btn.label}
        </a>
      </Button>
    )
  }

  return (
    <Button asChild size="lg" variant={isPrimary ? 'default' : 'outline'} className={cls}>
      <Link to={safeUrl(btn.url) as never}>
        {btn.label}
      </Link>
    </Button>
  )
}

export function HeroSection() {
  // Uma instância só do plugin (inicialização preguiçosa), lida no render sem ref.
  const [autoplayPlugin] = useState(() => Autoplay({ delay: 5000, stopOnInteraction: true }))
  const { data: banners, isLoading } = useBanners()

  if (isLoading) {
    return <Skeleton className="w-full h-100 md:h-125 rounded-none" />
  }

  if (!banners || banners.length === 0) return null

  return (
    <Carousel
      opts={{ loop: true, align: 'start' }}
      plugins={[autoplayPlugin]}
      className="relative w-full"
    >
      <CarouselContent>
        {banners.map((banner, i) => (
          <CarouselItem key={banner.id}>
            <section className="relative h-100 w-full overflow-hidden md:h-125">
              {banner.imageUrl ? (
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  decoding={i === 0 ? 'auto' : 'async'}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-neutral-800" />
              )}
              <div className="absolute inset-0 bg-linear-to-r from-black/70 via-black/50 to-transparent" />
              <div className="container relative z-10 mx-auto flex h-full flex-col justify-center px-4">
                <div className="max-w-2xl">
                  <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
                    {banner.title}
                  </h1>
                  {banner.subtitle && (
                    <p className="mt-3 text-base text-white/90 md:text-lg">
                      {banner.subtitle}
                    </p>
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
            </section>
          </CarouselItem>
        ))}
      </CarouselContent>
      {banners.length > 1 && (
        <>
          <CarouselPrevious className="left-4 size-11 md:left-8 md:size-7" />
          <CarouselNext className="right-4 size-11 md:right-8 md:size-7" />
        </>
      )}
    </Carousel>
  )
}
