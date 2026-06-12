import { Clock, GraduationCap, MapPin, User } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { Course } from '@/@types/course'
import { CarouselItem } from './ui/carousel'

export type SimpleCourse = {
  id: string
  title: string
  descriptionSimple: string
  date: string
  imageUrl: string
  price: number
}

export function CourseCard({ course }: { course: Course }) {
  const { t } = useTranslation()
  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg flex flex-col">
      <div className="relative aspect-video overflow-hidden bg-muted">
        {course.coverImage ? (
          <img
            src={course.coverImage}
            alt={course.title}
            className="h-full w-full object-cover transition-transform hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <GraduationCap className="size-12 text-muted-foreground" />
          </div>
        )}
        <Badge className="absolute left-2 top-2 bg-white text-foreground shadow">
          {course.price === 0 ? t('courseCard.free') : `R$ ${course.price.toFixed(2)}`}
        </Badge>
      </div>
      <CardContent className="p-4 flex flex-col grow gap-2">
        <h3 className="line-clamp-2 font-semibold text-foreground">{course.title}</h3>
        <p className="line-clamp-2 text-xs text-muted-foreground grow">{course.description}</p>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3 shrink-0" />
            {course.location}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3 shrink-0" />
            {formatDateFromString(course.startDate)} – {formatDateFromString(course.endDate)}
          </span>
          <span className="flex items-center gap-1.5">
            <User className="size-3 shrink-0" />
            {course.instructorName}
          </span>
        </div>
        <Link to="/cursos/$id" params={{ id: course.id }} className="mt-1">
          <Button size="sm" className="w-full">{t('courseCard.learnMore')}</Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export function CourseCardSimple({ course }: { course: SimpleCourse }) {
  const { t } = useTranslation()
  return (
    <CarouselItem className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
      <Card className="h-full overflow-hidden transition-all hover:shadow-lg flex flex-col">
        <div className="relative aspect-4/3 overflow-hidden bg-muted">
          {course.imageUrl ? (
            <img
              src={course.imageUrl}
              alt={course.title}
              className="h-full w-full object-cover transition-transform hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <GraduationCap className="size-12 text-muted-foreground" />
            </div>
          )}
          <Badge className="absolute right-2 top-2 bg-white text-foreground shadow">
            {formatDateFromString(course.date)}
          </Badge>
        </div>
        <CardContent className="p-4 flex flex-col grow">
          <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{course.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground grow">
            {course.descriptionSimple}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-primary">
              {course.price === 0 ? t('courseCard.free') : `R$ ${course.price.toFixed(2)}`}
            </span>
            <Link to="/cursos/$id" params={{ id: course.id }}>
              <Button size="sm" className="h-8 text-xs">
                {t('courseCard.learnMore')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </CarouselItem>
  )
}
