import { createFileRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { GraduationCap, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCourses } from '@/hooks/useCourse'
import type { Course } from '@/@types/course'
import { CourseCard } from '@/components/course-card'
import { getCourseSituation } from '@/utils/course-status'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { useSeo } from '@/hooks/useSeo'

const PAGE_SIZE = 12
type SortKey = 'soon' | 'recent' | 'price'
type PriceKey = 'all' | 'free' | 'paid'
type StatusKey = 'all' | 'open' | 'closed'

type CoursesSearch = {
  q?: string
  price?: PriceKey
  status?: StatusKey
  sort?: SortKey
  page?: number
}

const oneOf = <T extends string>(v: unknown, opts: readonly T[]): T | undefined =>
  typeof v === 'string' && (opts as readonly string[]).includes(v) ? (v as T) : undefined

// Lista vazia estável: evita recalcular o filtro a cada render enquanto carrega.
const NO_COURSES: Course[] = []

export const Route = createFileRoute('/_public/cursos/')({
  // Filtros vivem na URL: refresh-safe, compartilhável e respeita voltar/avançar.
  validateSearch: (s: Record<string, unknown>): CoursesSearch => {
    const page = Number(s.page)
    return {
      q: typeof s.q === 'string' && s.q.trim() ? s.q : undefined,
      price: oneOf<PriceKey>(s.price, ['all', 'free', 'paid']),
      status: oneOf<StatusKey>(s.status, ['all', 'open', 'closed']),
      sort: oneOf<SortKey>(s.sort, ['soon', 'recent', 'price']),
      page: Number.isFinite(page) && page > 1 ? Math.floor(page) : undefined,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  useSeo({ title: 'Cursos', description: 'Cursos agrícolas e capacitações do Sindicato Rural de Terra Roxa.' })
  const { t } = useTranslation()
  const navigate = Route.useNavigate()
  const sp = Route.useSearch()

  const search = sp.q ?? ''
  const priceFilter = sp.price ?? 'all'
  const statusFilter = sp.status ?? 'all'
  const sortBy = sp.sort ?? 'soon'
  const page = sp.page ?? 1

  // Puxa um lote amplo e faz busca/filtro/ordenação/paginação no cliente —
  // o backend de cursos não expõe busca e o volume total é pequeno.
  const { data: result, isLoading, isError, isFetching, refetch } = useCourses({ limit: 100 })
  const courses = result?.data ?? NO_COURSES

  // Merge na URL; muda filtro → volta pra página 1; remove defaults pra URL curta.
  function patchSearch(patch: Partial<CoursesSearch>, opts?: { replace?: boolean }) {
    navigate({
      search: (prev) => {
        const next: CoursesSearch = { ...prev, ...patch }
        if (!('page' in patch)) next.page = undefined
        if (!next.q || next.q.trim() === '') next.q = undefined
        if (next.price === 'all') next.price = undefined
        if (next.status === 'all') next.status = undefined
        if (next.sort === 'soon') next.sort = undefined
        if (!next.page || next.page <= 1) next.page = undefined
        return next
      },
      replace: opts?.replace ?? true,
    })
  }

  const hasFilters = search.trim() !== '' || priceFilter !== 'all' || statusFilter !== 'all'
  const clearFilters = () => navigate({ search: {}, replace: true })

  const processed = useMemo(() => {
    const term = search.trim().toLowerCase()
    const withSituation = courses.map((c) => ({ course: c, situation: getCourseSituation(c) }))

    const filtered = withSituation.filter(({ course, situation }) => {
      const matchSearch =
        !term ||
        course.title.toLowerCase().includes(term) ||
        course.location.toLowerCase().includes(term) ||
        course.instructorName.toLowerCase().includes(term)
      const matchPrice =
        priceFilter === 'all' ||
        (priceFilter === 'free' && course.price === 0) ||
        (priceFilter === 'paid' && course.price > 0)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'open' && situation === 'open') ||
        (statusFilter === 'closed' && situation === 'closed')
      return matchSearch && matchPrice && matchStatus
    })

    filtered.sort((a, b) => {
      // Encerrados sempre afundam pro fim.
      const ca = a.situation === 'closed' ? 1 : 0
      const cb = b.situation === 'closed' ? 1 : 0
      if (ca !== cb) return ca - cb
      if (sortBy === 'price') return a.course.price - b.course.price
      const cmp = a.course.startDate.localeCompare(b.course.startDate)
      return sortBy === 'recent' ? -cmp : cmp
    })

    return filtered.map((x) => x.course)
  }, [courses, search, priceFilter, statusFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = processed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <main>
      <div className="bg-background">
        {/* Hero */}
        <section className="bg-brand py-14">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold text-white md:text-4xl">{t('courses.pageTitle')}</h1>
            <p className="mt-2 max-w-2xl text-white/90 text-sm md:text-base">{t('courses.pageSubtitle')}</p>
          </div>
        </section>

        {/* Filters */}
        <section className="border-b bg-card py-4 sticky top-16 z-40">
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1 lg:max-w-md">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('courses.searchPlaceholder')}
                  value={search}
                  onChange={(e) => patchSearch({ q: e.target.value })}
                  className="pl-10 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Select value={priceFilter} onValueChange={(v) => patchSearch({ price: v as PriceKey })}>
                  <SelectTrigger className="w-full text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('courses.filterAll')}</SelectItem>
                    <SelectItem value="free">{t('courses.filterFree')}</SelectItem>
                    <SelectItem value="paid">{t('courses.filterPaid')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => patchSearch({ status: v as StatusKey })}>
                  <SelectTrigger className="w-full text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('courses.filterStatusAll')}</SelectItem>
                    <SelectItem value="open">{t('courses.filterOpen')}</SelectItem>
                    <SelectItem value="closed">{t('courses.filterClosed')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => patchSearch({ sort: v as SortKey })}>
                  <SelectTrigger className="w-full text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soon">{t('courses.sortSoon')}</SelectItem>
                    <SelectItem value="recent">{t('courses.sortRecent')}</SelectItem>
                    <SelectItem value="price">{t('courses.sortPriceAsc')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Course list */}
        <section className="py-10 md:py-12">
          <div className="container mx-auto px-4">
            {isLoading && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-xl border overflow-hidden bg-card">
                    <Skeleton className="aspect-video w-full rounded-none" />
                    <div className="flex flex-col gap-2 p-4">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="mt-2 h-9 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isError && (
              <LoadErrorRetry
                message={t('courses.error')}
                hint
                onRetry={() => void refetch()}
                retrying={isFetching}
                className="py-16"
              />
            )}
            {!isLoading && !isError && (
              processed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <GraduationCap className="size-16 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">{t('courses.notFound')}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t('courses.notFoundHint')}</p>
                  {hasFilters && (
                    <Button variant="outline" className="mt-4 h-11" onClick={clearFilters}>
                      {t('courses.clearFilters')}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      {t('courses.resultsCount', { count: processed.length })}
                    </p>
                    {hasFilters && (
                      <Button variant="ghost" size="sm" className="h-11 text-xs sm:h-auto" onClick={clearFilters}>
                        {t('courses.clearFilters')}
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pageItems.map((course) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <Pagination
                      page={safePage}
                      totalPages={totalPages}
                      total={processed.length}
                      limit={PAGE_SIZE}
                      onPageChange={(p) => patchSearch({ page: p }, { replace: false })}
                      showLimitSelector={false}
                      isLoading={isLoading}
                    />
                  )}
                </>
              )
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
