import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'
import { ArrowRight } from 'lucide-react'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel'
import type { AutoplayType } from 'embla-carousel-autoplay'
import { useTranslation } from 'react-i18next'
import { useCourses } from '@/hooks/useCourse'
import { CourseCard } from '@/components/course-card'

export function CoursesSection({ autoplayPlugin }: { autoplayPlugin: React.RefObject<AutoplayType> }) {
  const { data: result } = useCourses({ limit: 9 })
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
          <Link to="/cursos">
            <Button variant="link" className="font-semibold text-primary">
              {t('home.seeMore')} <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        </div>

        {courses.length > 0 ? (
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
            <CarouselPrevious className="left-2 md:-left-4" />
            <CarouselNext className="right-2 md:-right-4" />
          </Carousel>
        ) : (
          <p className="text-center text-muted-foreground">{t('home.noCourses')}</p>
        )}
      </div>
    </section>
  )
}
