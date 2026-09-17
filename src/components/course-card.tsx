import { Clock, GraduationCap, MapPin, User } from 'lucide-react'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { formatBRL } from '@/utils/format-currency'
import { getCourseSituation, type CourseSituation } from '@/utils/course-status'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { Course } from '@/@types/course'
import { markdownToPlainText } from '@/lib/markdown-text'

const situationClass: Record<CourseSituation, string> = {
  open: 'bg-emerald-600 text-white',
  in_progress: 'bg-amber-500 text-white',
  closed: 'bg-neutral-500 text-white',
}

function SituationBadge({ situation }: { situation: CourseSituation }) {
  const { t } = useTranslation()
  const label =
    situation === 'open'
      ? t('courseCard.open')
      : situation === 'in_progress'
        ? t('courseCard.inProgress')
        : t('courseCard.closed')
  return <Badge className={`absolute right-2 top-2 shadow ${situationClass[situation]}`}>{label}</Badge>
}

export function CourseCard({ course }: { course: Course }) {
  const { t } = useTranslation()
  const situation = getCourseSituation(course)
  // Encerrado fica esmaecido pra os cursos ativos saltarem à vista; volta ao
  // normal no hover pra continuar legível.
  const dim = situation === 'closed' ? 'opacity-65 transition-opacity hover:opacity-100' : ''
  // Miniatura (~640px WebP) quando existe; cursos antigos só têm a capa inteira.
  const cover = course.coverImageThumb || course.coverImage
  return (
    <Link to="/cursos/$id" params={{ id: course.id }} className={`group block h-full ${dim}`}>
      <Card className="flex h-full flex-col overflow-hidden transition-all group-hover:shadow-lg">
        <div className="relative aspect-video overflow-hidden bg-muted">
          {cover ? (
            <img
              src={cover}
              alt={course.title}
              width={640}
              height={360}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <GraduationCap className="size-12 text-muted-foreground" />
            </div>
          )}
          <Badge className="absolute left-2 top-2 bg-white text-neutral-900 shadow">
            {course.price === 0 ? t('courseCard.free') : formatBRL(course.price)}
          </Badge>
          <SituationBadge situation={situation} />
        </div>
        <CardContent className="flex grow flex-col gap-2 p-4">
          <h3 className="line-clamp-2 font-semibold text-foreground">{course.title}</h3>
          {/* Descrição é markdown: no card vai só o texto, sem "##"/"**". */}
          <p className="line-clamp-2 grow text-xs text-muted-foreground">{markdownToPlainText(course.description)}</p>
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
          <span className="mt-1 inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors group-hover:bg-primary/90">
            {t('courseCard.learnMore')}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
