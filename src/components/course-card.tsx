import { Calendar, GraduationCap, MapPin, User } from 'lucide-react'
import { Badge, type BadgeTone } from './ui/badge'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { formatBRL } from '@/utils/format-currency'
import { getCourseSituation, type CourseSituation } from '@/utils/course-status'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { Course } from '@/@types/course'
import { markdownToPlainText } from '@/lib/markdown-text'
import { cn } from '@/lib/utils'

// Uma etiqueta só no cartão: a situação. O preço ("Gratuito" ou o valor) é texto.
const situationTone: Record<CourseSituation, BadgeTone> = {
  open: 'success',
  in_progress: 'warning',
  closed: 'neutral',
}

export function CourseCard({ course }: { course: Course }) {
  const { t } = useTranslation()
  const situation = getCourseSituation(course)
  const situationLabel =
    situation === 'open'
      ? t('courseCard.open')
      : situation === 'in_progress'
        ? t('courseCard.inProgress')
        : t('courseCard.closed')
  // Encerrado fica esmaecido pra os cursos ativos saltarem à vista; volta ao
  // normal no hover pra continuar legível.
  const dim = situation === 'closed' ? 'opacity-65 transition-opacity hover:opacity-100' : ''
  // Miniatura (~640px WebP) quando existe; cursos antigos só têm a capa inteira.
  const cover = course.coverImageThumb || course.coverImage
  const instructor = (course.instructorName ?? '').trim()
  const free = course.price === 0

  return (
    <Link to="/cursos/$id" params={{ id: course.id }} className={cn('group block h-full rounded-xl', dim)}>
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors group-hover:border-foreground/20">
        <div className="relative aspect-video overflow-hidden border-b border-border bg-muted">
          {cover ? (
            <img
              src={cover}
              alt={course.title}
              width={640}
              height={360}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <GraduationCap className="size-10 text-faint-foreground" aria-hidden />
            </div>
          )}
        </div>
        <div className="flex grow flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <Badge variant={situationTone[situation]}>{situationLabel}</Badge>
            <span className={cn('text-sm', free ? 'text-muted-foreground' : 'num font-medium text-foreground')}>
              {free ? t('courseCard.free') : formatBRL(course.price)}
            </span>
          </div>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">{course.title}</h3>
          {/* Descrição é markdown: no card vai só o texto, sem "##"/"**". É o texto
              como foi cadastrado (às vezes em caixa alta): não se transforma o dado. */}
          <p className="line-clamp-2 grow text-sm text-muted-foreground">{markdownToPlainText(course.description)}</p>
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Calendar className="size-4 shrink-0 text-faint-foreground" aria-hidden />
              <span className="num">
                {formatDateFromString(course.startDate)} – {formatDateFromString(course.endDate)}
              </span>
            </span>
            {course.location && (
              <span className="flex min-w-0 items-center gap-2">
                <MapPin className="size-4 shrink-0 text-faint-foreground" aria-hidden />
                <span className="truncate">{course.location}</span>
              </span>
            )}
            {instructor && (
              <span className="flex min-w-0 items-center gap-2">
                <User className="size-4 shrink-0 text-faint-foreground" aria-hidden />
                <span className="truncate">{instructor}</span>
              </span>
            )}
          </div>
          <span className="mt-1 inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors group-hover:bg-primary/90">
            {t('courseCard.learnMore')}
          </span>
        </div>
      </article>
    </Link>
  )
}
