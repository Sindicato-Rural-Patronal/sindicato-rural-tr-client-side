import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'
import { ArrowRight } from 'lucide-react'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel'
import type { AutoplayType } from 'embla-carousel-autoplay'
import { useTranslation } from 'react-i18next'
import { useCourses } from '@/hooks/useCourse'
import { CourseCard } from '@/components/course-card'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { Skeleton } from '@/components/ui/skeleton'

export function CoursesSection({ autoplayPlugin }: { autoplayPlugin: React.RefObject<AutoplayType> }) {
  const { data: result, isLoading, isError, isFetching, refetch } = useCourses({ limit: 9 })
  const courses = result?.data ?? []
  const { t } = useTranslation()

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">{t('home.coursesTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('home.coursesSubtitle')}</p>
          </div>
          <Button asChild variant="link" className="h-11 px-0 font-semibold text-primary sm:px-2">
            <Link to="/cursos">
              {t('home.seeMore')} <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-xl border overflow-hidden bg-card">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="flex flex-col gap-2 p-3">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          // Falha da API não é "nenhum curso": avisa e deixa tentar de novo.
          <LoadErrorRetry onRetry={() => void refetch()} retrying={isFetching} className="rounded-xl border bg-card" />
        ) : courses.length > 0 ? (
          <Carousel
            opts={{ align: 'start', loop: true }}
            plugins={[autoplayPlugin.current]}
            className="w-full"
          >
            <CarouselContent>
              {courses.map((course) => (
                <CarouselItem key={course.id} className="md:basis-1/2 lg:basis-1/3">
                  <CourseCard course={course} />
                </CarouselItem>
              ))}
            </CarouselContent>
            {/* Setas maiores no celular (alvo de toque de 44px). */}
            <CarouselPrevious className="left-2 size-11 md:-left-4 md:size-7" />
            <CarouselNext className="right-2 size-11 md:-right-4 md:size-7" />
          </Carousel>
        ) : (
          <p className="text-center text-muted-foreground">{t('home.noCourses')}</p>
        )}
      </div>
    </section>
  )
}
