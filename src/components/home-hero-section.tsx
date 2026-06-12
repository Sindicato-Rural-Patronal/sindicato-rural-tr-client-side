import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,
} from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type BannerAlign = 'left' | 'center' | 'right'

interface Banner {
  id: string
  image: string
  titleKey: string
  subtitleKey: string
  ctaKey?: string
  ctaLink: string
  ctaSecondaryKey?: string
  ctaSecondaryLink?: string
  align?: BannerAlign
  overlayGradient?: string
}

const banners: Banner[] = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1920&h=800&fit=crop',
    titleKey: 'hero.banner1Title',
    subtitleKey: 'hero.banner1Subtitle',
    ctaKey: 'hero.banner1Cta',
    ctaLink: '/contato',
    ctaSecondaryKey: 'hero.banner1CtaSecondary',
    ctaSecondaryLink: '/cursos',
    align: 'left',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1523348837708-15c4f09eeacf?w=1920&h=800&fit=crop',
    titleKey: 'hero.banner2Title',
    subtitleKey: 'hero.banner2Subtitle',
    ctaKey: 'hero.banner2Cta',
    ctaLink: '/cursos',
    align: 'center',
    overlayGradient: 'from-black/70 to-black/40',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1920&h=800&fit=crop',
    titleKey: 'hero.banner3Title',
    subtitleKey: 'hero.banner3Subtitle',
    ctaKey: 'hero.banner3Cta',
    ctaLink: '/sobre',
    align: 'right',
  },
]

function getTextAlignment(align: BannerAlign | undefined) {
  switch (align) {
    case 'center': return 'text-center items-center'
    case 'right': return 'text-right items-end'
    default: return 'text-left items-start'
  }
}

export function HeroSection() {
  const autoplayPlugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: true }))
  const { t } = useTranslation()

  return (
    <Carousel
      opts={{ loop: true, align: 'start' }}
      plugins={[autoplayPlugin.current]}
      className="relative w-full"
    >
      <CarouselContent>
        {banners.map((banner) => {
          const gradient = banner.overlayGradient || 'from-primary/85 via-primary/70 to-transparent'
          return (
            <CarouselItem key={banner.id}>
              <section className="relative h-100 w-full overflow-hidden md:h-125">
                <img
                  src={banner.image}
                  alt={t(banner.titleKey as never)}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className={`absolute inset-0 bg-linear-to-r ${gradient}`} />
                <div className="container relative z-10 mx-auto flex h-full flex-col justify-center px-4">
                  <div className={`max-w-2xl ${getTextAlignment(banner.align)}`}>
                    <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
                      {t(banner.titleKey as never)}
                    </h1>
                    <p className="mt-3 text-base text-white/90 md:text-lg">
                      {t(banner.subtitleKey as never)}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      {banner.ctaKey && (
                        <Link to={banner.ctaLink}>
                          <Button size="lg" className="bg-white font-semibold text-primary hover:bg-white/90">
                            {t(banner.ctaKey as never)}
                            <ArrowRight className="ml-2 size-4" />
                          </Button>
                        </Link>
                      )}
                      {banner.ctaSecondaryKey && banner.ctaSecondaryLink && (
                        <Link to={banner.ctaSecondaryLink}>
                          <Button
                            size="lg"
                            variant="outline"
                            className="border-2 border-white bg-transparent font-semibold text-white hover:bg-white hover:text-primary"
                          >
                            {t(banner.ctaSecondaryKey as never)}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </CarouselItem>
          )
        })}
      </CarouselContent>
      <CarouselPrevious className="left-4 md:left-8" />
      <CarouselNext className="right-4 md:right-8" />
    </Carousel>
  )
}
