import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'
import { ArrowRight } from 'lucide-react'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel'
import { useTranslation } from 'react-i18next'
import { useCourses } from '@/hooks/useCourse'
import { CourseCard } from '@/components/course-card'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { Skeleton } from '@/components/ui/skeleton'

// Carrossel de cursos da home. Só anda quando a pessoa pede (setas ou arrastar):
// antes trocava sozinho a cada 4 s.
export function CoursesSection() {
  const { data: result, isLoading, isError, isFetching, refetch } = useCourses({ limit: 9, ended: 'exclude' })
  const courses = result?.data ?? []
  const { t } = useTranslation()

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{t('home.coursesTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('home.coursesSubtitle')}</p>
          </div>
          <Button asChild variant="link" className="h-11 px-0 text-primary sm:px-2">
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
          <Carousel opts={{ align: 'start', loop: true }} className="w-full" aria-label={t('home.coursesTitle')}>
            <CarouselContent>
              {courses.map((course) => (
                <CarouselItem key={course.id} className="md:basis-1/2 lg:basis-1/3">
                  <CourseCard course={course} />
                </CarouselItem>
              ))}
            </CarouselContent>
            {/* Celular: as setas (44 px) ficam embaixo do cartão, não por cima dele.
                Do tablet para cima elas voltam para as bordas (md:contents). */}
            <div className="mt-4 flex justify-end gap-2 md:contents">
              <CarouselPrevious className="max-md:static max-md:size-11 max-md:translate-y-0 md:-left-4 md:size-8" />
              <CarouselNext className="max-md:static max-md:size-11 max-md:translate-y-0 md:-right-4 md:size-8" />
            </div>
          </Carousel>
        ) : (
          <p className="text-center text-muted-foreground">{t('home.noCourses')}</p>
        )}
      </div>
    </section>
  )
}
