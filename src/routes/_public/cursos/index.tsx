import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { GraduationCap, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCourses } from '@/hooks/useCourse'
import { CourseCard } from '@/components/course-card'

export const Route = createFileRoute('/_public/cursos/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [search, setSearch] = useState('')
  const [priceFilter, setPriceFilter] = useState('all')
  const { t } = useTranslation()

  const { data: courses = [], isLoading, isError } = useCourses()

  const filtered = courses.filter((course) => {
    const matchSearch = course.title.toLowerCase().includes(search.toLowerCase())
    const matchPrice =
      priceFilter === 'all' ||
      (priceFilter === 'free' && course.price === 0) ||
      (priceFilter === 'paid' && course.price > 0)
    return matchSearch && matchPrice
  })

  return (
    <main>
      <div className="bg-background">
        {/* Hero */}
        <section className="bg-primary py-14">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold text-white md:text-4xl">{t('courses.pageTitle')}</h1>
            <p className="mt-2 max-w-2xl text-white/90 text-sm md:text-base">{t('courses.pageSubtitle')}</p>
          </div>
        </section>

        {/* Filters */}
        <section className="border-b bg-card py-4 sticky top-16 z-40">
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-xs md:max-w-md">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('courses.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="w-full sm:w-45 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('courses.filterAll')}</SelectItem>
                  <SelectItem value="free">{t('courses.filterFree')}</SelectItem>
                  <SelectItem value="paid">{t('courses.filterPaid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Course list */}
        <section className="py-10 md:py-12">
          <div className="container mx-auto px-4">
            {isLoading && (
              <div className="flex justify-center py-16">
                <p className="text-muted-foreground">{t('courses.loading')}</p>
              </div>
            )}
            {isError && (
              <div className="flex justify-center py-16">
                <p className="text-destructive">{t('courses.error')}</p>
              </div>
            )}
            {!isLoading && !isError && filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <GraduationCap className="size-16 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">{t('courses.notFound')}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t('courses.notFoundHint')}</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
