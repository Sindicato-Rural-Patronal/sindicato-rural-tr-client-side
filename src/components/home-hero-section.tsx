import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,
} from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'
import { useBanners } from '@/hooks/useBanner'
import type { BannerButton } from '@/hooks/useBanner'

function BannerBtn({ btn, index }: { btn: BannerButton; index: number }) {
  const isPrimary = index === 0
  const cls = isPrimary
    ? 'bg-white font-semibold text-primary hover:bg-white/90'
    : 'border-2 border-white bg-transparent font-semibold text-white hover:bg-white hover:text-primary'

  if (btn.external) {
    return (
      <a href={btn.url} target="_blank" rel="noopener noreferrer">
        <Button size="lg" variant={isPrimary ? 'default' : 'outline'} className={cls}>
          {btn.label}
        </Button>
      </a>
    )
  }

  return (
    <Link to={btn.url as never}>
      <Button size="lg" variant={isPrimary ? 'default' : 'outline'} className={cls}>
        {btn.label}
      </Button>
    </Link>
  )
}

export function HeroSection() {
  const autoplayPlugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: true }))
  const { data: banners, isLoading } = useBanners()

  if (isLoading) {
    return <Skeleton className="w-full h-100 md:h-125 rounded-none" />
  }

  if (!banners || banners.length === 0) return null

  return (
    <Carousel
      opts={{ loop: true, align: 'start' }}
      plugins={[autoplayPlugin.current]}
      className="relative w-full"
    >
      <CarouselContent>
        {banners.map((banner) => (
          <CarouselItem key={banner.id}>
            <section className="relative h-100 w-full overflow-hidden md:h-125">
              {banner.imageUrl ? (
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
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
          <CarouselPrevious className="left-4 md:left-8" />
          <CarouselNext className="right-4 md:right-8" />
        </>
      )}
    </Carousel>
  )
}
