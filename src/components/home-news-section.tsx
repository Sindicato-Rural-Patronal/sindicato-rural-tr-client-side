import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { MapPin, ArrowRight, Calendar, Newspaper } from 'lucide-react'
import Autoplay from 'embla-carousel-autoplay'
import { Button } from '@/components/ui/button'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'
import { useNews } from '@/hooks/useNews'
import { formatDateFromString } from '@/utils/format-data-from-string'

export function HomeNewsSection() {
  const autoplayPlugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: true }))
  const { t } = useTranslation()
  const { data: news = [], isLoading } = useNews()

  return (
    <section className="border-t bg-muted/40 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">{t('home.newsTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('home.newsSubtitle')}</p>
          </div>
          <Link to="/noticias">
            <Button variant="link" className="font-semibold text-primary">
              {t('home.seeMore')} <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-xl border overflow-hidden bg-card">
                <Skeleton className="h-44 w-full rounded-none" />
                <div className="flex flex-col gap-2 p-3">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && news.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Newspaper className="size-12 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">{t('newsPage.notFound')}</p>
          </div>
        )}

        {!isLoading && news.length > 0 && (
          <Carousel opts={{ align: 'start', loop: true }} plugins={[autoplayPlugin.current]} className="w-full">
            <CarouselContent>
              {news.map((item) => (
                <CarouselItem key={item.id} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="h-full overflow-hidden transition-all hover:shadow-lg flex flex-col">
                    <div className="p-3 pb-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        <span className="truncate">Terra Roxa</span>
                        {item.publishedAt && (
                          <>
                            <span>|</span>
                            <Calendar className="size-3" />
                            <span>{formatDateFromString(item.publishedAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="relative mx-3 mt-2 aspect-4/3 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                      {item.bannerUrl ? (
                        <img
                          src={item.bannerUrl}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform hover:scale-105"
                        />
                      ) : (
                        <Newspaper className="size-10 text-muted-foreground/30" />
                      )}
                    </div>
                    <CardContent className="p-3 flex flex-col grow">
                      <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</h3>
                      {item.summary && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground grow">{item.summary}</p>
                      )}
                      <Link to="/noticias/$id" params={{ id: item.id }} className="mt-2">
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs font-semibold text-primary">
                          {t('home.learnMore')}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 md:-left-4" />
            <CarouselNext className="right-2 md:-right-4" />
          </Carousel>
        )}
      </div>
    </section>
  )
}
