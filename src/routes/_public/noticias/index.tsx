import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { EmptyState } from '@/components/EmptyState'
import { ContextFigure, PublicPageHeader } from '@/components/PublicPageHeader'
import { ArrowRight, Newspaper, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNews } from '@/hooks/useNews'
import { useSeo } from '@/hooks/useSeo'
import type { News } from '@/@types/news'
import { formatDateFromString } from '@/utils/format-data-from-string'

export const Route = createFileRoute('/_public/noticias/')({
  component: RouteComponent,
})

// useNews devolve um array plano (sem metadados de total), então buscamos um
// lote amplo e paginamos no cliente — assim itens além dos 20 mais recentes
// ficam acessíveis e pesquisáveis.
const FETCH_LIMIT = 100
const PAGE_SIZE = 9

function NewsCard({ news }: { news: News }) {
  const { t } = useTranslation()
  const date = news.publishedAt ? formatDateFromString(news.publishedAt) : null

  return (
    <Link
      to="/noticias/$id"
      params={{ id: news.id }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/20"
    >
      {/* A imagem da notícia é recortada no painel em 1440 × 600: aparece inteira. */}
      <div className="flex aspect-[12/5] items-center justify-center overflow-hidden border-b border-border bg-muted">
        {news.bannerUrl ? (
          <img
            src={news.bannerUrl}
            alt={news.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <Newspaper className="size-10 text-faint-foreground" aria-hidden />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {date && <p className="text-sm text-muted-foreground">{t('newsPage.publishedAt')}<span className="num">{date}</span></p>}
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {news.title}
        </h3>
        {news.summary && (
          <p className="line-clamp-3 text-sm text-muted-foreground">{news.summary}</p>
        )}
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-primary">
          {t('newsPage.readMore')} <ArrowRight className="size-4" aria-hidden />
        </span>
      </div>
    </Link>
  )
}

function RouteComponent() {
  useSeo({ title: 'Notícias', description: 'Notícias e comunicados do Sindicato Rural de Terra Roxa.' })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { t } = useTranslation()
  const { data: news = [], isLoading, isError, isFetching, refetch } = useNews({ limit: FETCH_LIMIT })

  const filtered = news.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.summary ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  // Linha de contexto: quantas há e a data da mais recente.
  const latest = news.map(n => n.publishedAt).filter(Boolean).sort().at(-1)

  return (
    <main>
      <div className="bg-background">
        <PublicPageHeader
          title={t('newsPage.pageTitle')}
          description={t('newsPage.pageSubtitle')}
          context={isLoading || isError ? null : news.length > 0
            ? <>
                <ContextFigure>{news.length}</ContextFigure> {t('newsPage.publishedCount', { count: news.length })}
                {latest && <> · {t('newsPage.latestAt')} <span className="num font-medium text-foreground">{formatDateFromString(latest)}</span></>}
              </>
            : ''}
        />

        {/* Busca: presa sob o menu ao rolar */}
        <section className="sticky top-16 z-40 border-b border-border bg-background py-3">
          <div className="container mx-auto px-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint-foreground" aria-hidden />
              <Input
                aria-label={t('newsPage.searchPlaceholder')}
                placeholder={t('newsPage.searchPlaceholder')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
          </div>
        </section>

        {/* News list */}
        <section className="py-10 md:py-12">
          <div className="container mx-auto px-4">
            {isLoading && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-3 overflow-hidden rounded-xl border border-border">
                    <Skeleton className="aspect-[12/5] w-full rounded-none" />
                    <div className="flex flex-col gap-2 p-4">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isError && (
              <LoadErrorRetry
                message={t('newsPage.error')}
                hint
                onRetry={() => void refetch()}
                retrying={isFetching}
                className="py-16"
              />
            )}
            {!isLoading && !isError && filtered.length === 0 && (
              <EmptyState framed icon={Newspaper} title={t('newsPage.notFound')} description={t('newsPage.notFoundHint')} />
            )}
            {!isLoading && !isError && filtered.length > 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {paginated.map(n => <NewsCard key={n.id} news={n} />)}
                </div>
                {totalPages > 1 && (
                  <Pagination
                    page={currentPage}
                    totalPages={totalPages}
                    total={filtered.length}
                    limit={PAGE_SIZE}
                    onPageChange={setPage}
                    showLimitSelector={false}
                  />
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
