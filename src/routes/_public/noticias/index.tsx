import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { Newspaper, Search } from 'lucide-react'
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
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="relative h-44 bg-muted flex items-center justify-center overflow-hidden">
        {news.bannerUrl ? (
          <img
            src={news.bannerUrl}
            alt={news.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Newspaper className="size-12 text-muted-foreground/30" />
        )}
      </div>
      <div className="flex flex-col gap-2 p-4 flex-1">
        {date && <p className="text-xs text-muted-foreground">{t('newsPage.publishedAt')}{date}</p>}
        <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {news.title}
        </h3>
        {news.summary && (
          <p className="text-sm text-muted-foreground line-clamp-3">{news.summary}</p>
        )}
        <span className="mt-auto pt-2 text-sm font-medium text-primary">{t('newsPage.readMore')} →</span>
      </div>
    </Link>
  )
}

function RouteComponent() {
  useSeo({ title: 'Notícias', description: 'Notícias e comunicados do Sindicato Rural de Terra Roxa.' })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { t } = useTranslation()
  const { data: news = [], isLoading, isError } = useNews({ limit: FETCH_LIMIT })

  const filtered = news.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.summary ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <main>
      <div className="bg-background">
        {/* Hero */}
        <section className="bg-brand py-14">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold text-white md:text-4xl">{t('newsPage.pageTitle')}</h1>
            <p className="mt-2 max-w-2xl text-white/90 text-sm md:text-base">{t('newsPage.pageSubtitle')}</p>
          </div>
        </section>

        {/* Search */}
        <section className="border-b bg-card py-4 sticky top-16 z-40">
          <div className="container mx-auto px-4">
            <div className="relative max-w-xs md:max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('newsPage.searchPlaceholder')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-10 text-sm"
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
                  <div key={i} className="flex flex-col gap-3 rounded-xl border p-0 overflow-hidden">
                    <Skeleton className="h-44 w-full rounded-none" />
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
              <div className="flex justify-center py-16">
                <p className="text-destructive">{t('newsPage.error')}</p>
              </div>
            )}
            {!isLoading && !isError && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Newspaper className="size-16 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">{t('newsPage.notFound')}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t('newsPage.notFoundHint')}</p>
              </div>
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
