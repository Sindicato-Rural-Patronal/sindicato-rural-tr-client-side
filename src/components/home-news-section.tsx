import { Link } from '@tanstack/react-router'
import { ArrowRight, Calendar, Newspaper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { useTranslation } from 'react-i18next'
import { useNews } from '@/hooks/useNews'
import { formatDateFromString } from '@/utils/format-data-from-string'

export function HomeNewsSection() {
  const { t } = useTranslation()
  const { data: news = [], isLoading, isError, isFetching, refetch } = useNews()

  return (
    <section className="border-t bg-muted/40 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">{t('home.newsTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('home.newsSubtitle')}</p>
          </div>
          <Button asChild variant="link" className="h-11 px-0 font-semibold text-primary sm:px-2">
            <Link to="/noticias">
              {t('home.seeMore')} <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
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

        {/* Falha da API não é "nenhuma notícia": avisa e deixa tentar de novo. */}
        {isError && (
          <LoadErrorRetry onRetry={() => void refetch()} retrying={isFetching} className="rounded-xl border bg-card" />
        )}

        {!isLoading && !isError && news.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Newspaper className="size-12 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">{t('newsPage.notFound')}</p>
          </div>
        )}

        {!isLoading && !isError && news.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {news.slice(0, 3).map((item) => (
              // O cartão inteiro é o link (não só o "Saiba mais"): mais fácil de tocar no celular.
              <Link key={item.id} to="/noticias/$id" params={{ id: item.id }} className="group block h-full rounded-xl">
                <Card className="flex h-full flex-col overflow-hidden transition-all group-hover:shadow-lg">
                  <div className="p-3 pb-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.publishedAt && (
                        <>
                          <Calendar className="size-3" />
                          <span>{formatDateFromString(item.publishedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="relative mx-3 mt-2 flex aspect-4/3 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {item.bannerUrl ? (
                      <img
                        src={item.bannerUrl}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <Newspaper className="size-10 text-muted-foreground/30" />
                    )}
                  </div>
                  <CardContent className="flex grow flex-col p-3">
                    <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</h3>
                    {item.summary && (
                      <p className="mt-1 line-clamp-2 grow text-xs text-muted-foreground">{item.summary}</p>
                    )}
                    <span className="mt-2 text-xs font-semibold text-primary group-hover:underline">
                      {t('home.learnMore')}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
