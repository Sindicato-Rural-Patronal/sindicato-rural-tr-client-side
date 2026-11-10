import { createFileRoute, Link } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCourse } from '@/hooks/useCourse'
import { useSeo } from '@/hooks/useSeo'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { formatBRL } from '@/utils/format-currency'
import { safeUrl } from '@/utils/safe-url'
import {
  deadlineTimeOf, getCourseSituation, getRegistrationBlock, isRegistrationDeadlinePassed, type RegistrationBlock,
} from '@/utils/course-status'
import { RegistrationDialog } from '@/components/courses/RegistrationDialog'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Calendar, Clock, GraduationCap, MapPin, RefreshCw, User, WifiOff, ArrowLeft,
} from 'lucide-react'
import { FaLinkedin, FaInstagram, FaFacebook } from 'react-icons/fa'

export const Route = createFileRoute('/_public/cursos/$id')({
  component: RouteComponent,
})

const situationTone: Record<ReturnType<typeof getCourseSituation>, BadgeTone> = {
  open: 'success',
  in_progress: 'warning',
  closed: 'neutral',
}

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: course, isLoading, isError, error, refetch, isFetching } = useCourse(id)
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const { t } = useTranslation()

  useSeo({
    title: course?.title,
    description: course?.description,
    image: course?.coverImage ?? undefined,
  })

  if (isLoading) {
    return (
      <div className="bg-background">
        <section className="border-b border-border">
          <div className="container mx-auto px-4 pb-8 pt-6 md:pb-10 md:pt-8">
            <Skeleton className="mb-6 h-4 w-32" />
            <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
              <Skeleton className="aspect-video w-full rounded-xl lg:order-2" />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            </div>
          </div>
        </section>
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main content */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            {/* Info sidebar */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-5 w-32" />
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-11 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    // "Não existe" só quando a API respondeu 404; outra falha (rede, servidor) pede nova tentativa.
    const notFound = !isError || (error instanceof ApiError && error.status === 404)
    if (!notFound) {
      return (
        <div className="flex flex-col items-center justify-center px-4 py-32 text-center">
          <WifiOff className="size-12 text-faint-foreground" aria-hidden />
          <h2 className="mt-4 text-xl font-semibold">{t('courseDetail.loadError')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('courseDetail.loadErrorDesc')}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button className="h-11 gap-2" disabled={isFetching} onClick={() => refetch()}>
              <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} /> {t('courseDetail.tryAgain')}
            </Button>
            <Button asChild variant="outline" className="h-11 gap-2">
              <Link to="/cursos"><ArrowLeft className="size-4" /> {t('courseDetail.viewAll')}</Link>
            </Button>
          </div>
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center justify-center px-4 py-32 text-center">
        <GraduationCap className="size-12 text-faint-foreground" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold">{t('courseDetail.notFound')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('courseDetail.notFoundDesc')}</p>
        <Button asChild variant="outline" className="mt-6 h-11 gap-2">
          <Link to="/cursos"><ArrowLeft className="size-4" /> {t('courseDetail.viewAll')}</Link>
        </Button>
      </div>
    )
  }

  // Prazo: até o fim do dia em Brasília, ou até a hora quando o painel informou;
  // o curso aceita inscrição até o último dia (mesma regra do backend).
  const registrationClosed = isRegistrationDeadlinePassed(course.registrationDeadline, course.registrationDeadlineTime)
  const deadlineTime = deadlineTimeOf(course.registrationDeadlineTime)
  const deadlineLabel = course.registrationDeadline
    ? deadlineTime
      ? t('courseDetail.deadlineAt', { date: formatDateFromString(course.registrationDeadline), time: deadlineTime })
      : formatDateFromString(course.registrationDeadline)
    : ''
  const block = getRegistrationBlock(course)
  const situation = getCourseSituation(course)
  const enrollDisabled = block !== null

  const blockLabels: Record<NonNullable<RegistrationBlock>, string> = {
    ended: t('courseDetail.courseEnded'),
    in_progress: t('courseDetail.courseInProgress'),
    deadline: t('courseDetail.registrationClosed2'),
    full: t('courseDetail.spotsFull'),
  }
  const enrollLabel = block ? blockLabels[block] : t('courseDetail.enroll')
  // Prazo e lotação já aparecem no card; encerrado/em andamento ganham uma frase.
  const blockReason = block === 'ended'
    ? t('courseDetail.reasonEnded')
    : block === 'in_progress' ? t('courseDetail.reasonInProgress') : null
  const priceLabel = course.price === 0 ? t('courseDetail.free') : formatBRL(course.price)
  const instructorNames = (course.instructors?.length ?? 0) > 0
    ? course.instructors.map(i => i.name).filter(Boolean).join(', ')
    : (course.instructorName ?? '').trim()

  return (
    <div className="bg-background">
      {/* Topo: a capa inteira (16:9, sem corte e sem texto por cima) ao lado do
          título; no celular a capa vem primeiro. */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 pb-8 pt-6 md:pb-10 md:pt-8">
          <Link to="/cursos" className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0">
            <ArrowLeft className="size-4" aria-hidden /> {t('courseDetail.backToCourses')}
          </Link>
          <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
            <div className="aspect-video overflow-hidden rounded-xl border border-border bg-muted lg:order-2">
              {course.coverImage ? (
                <img src={course.coverImage} alt={course.title} width={1920} height={1080} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <GraduationCap className="size-12 text-faint-foreground" aria-hidden />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-col items-start gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={situationTone[situation]}>
                  {situation === 'open' ? t('courseCard.open') : situation === 'in_progress' ? t('courseCard.inProgress') : t('courseCard.closed')}
                </Badge>
                <span className={course.price === 0 ? 'text-sm text-muted-foreground' : 'num text-sm font-medium text-foreground'}>{priceLabel}</span>
              </div>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground text-balance wrap-break-word md:text-4xl">{course.title}</h1>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4 shrink-0 text-faint-foreground" aria-hidden />
                  <span className="num">{formatDateFromString(course.startDate)} – {formatDateFromString(course.endDate)}</span>
                </span>
                {course.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4 shrink-0 text-faint-foreground" aria-hidden />
                    {course.location}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 md:py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('courseDetail.about')}</h2>
              <div className="mt-2 prose prose-sm dark:prose-invert max-w-none text-muted-foreground prose-headings:text-foreground prose-headings:font-semibold prose-strong:text-foreground prose-a:text-primary">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {course.description ?? ''}
                </ReactMarkdown>
              </div>
            </div>

            {(course.photoGallery?.length ?? 0) > 0 && (
              <div>
                <h2 className="mb-3 text-lg font-semibold text-foreground">{t('courseDetail.gallery')}</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {course.photoGallery.map(photo => (
                    <div key={photo.url} className="aspect-video overflow-hidden rounded-lg border border-border bg-muted">
                      <img
                        src={photo.url}
                        alt={photo.caption}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(course.instructors?.length ?? 0) > 0 && (
              <div>
                <h2 className="mb-3 text-lg font-semibold text-foreground">{t('courseDetail.instructors')}</h2>
                <div className="flex flex-col gap-3">
                  {course.instructors.map(instructor => (
                    <div key={instructor.id} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
                      {instructor.avatar
                        ? <img src={instructor.avatar} alt={instructor.name} className="size-14 shrink-0 rounded-full border border-border object-cover" />
                        : <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted"><User className="size-6 text-faint-foreground" aria-hidden /></div>
                      }
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{instructor.name}</p>
                        {instructor.title && <p className="text-sm text-muted-foreground">{instructor.title}</p>}
                        {instructor.bio && <p className="text-sm text-muted-foreground mt-0.5">{instructor.bio}</p>}
                        {(instructor.linkedin || instructor.instagram || instructor.facebook) && (
                          <div className="flex items-center gap-3 mt-1.5">
                            {instructor.linkedin && (
                              <a href={safeUrl(instructor.linkedin)} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <FaLinkedin className="size-4" />
                              </a>
                            )}
                            {instructor.instagram && (
                              <a href={safeUrl(instructor.instagram)} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <FaInstagram className="size-4" />
                              </a>
                            )}
                            {instructor.facebook && (
                              <a href={safeUrl(instructor.facebook)} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <FaFacebook className="size-4" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info sidebar */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
              <h2 className="text-base font-semibold text-foreground">{t('courseDetail.info')}</h2>

              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-faint-foreground" aria-hidden />
                  <div>
                    <p className="font-medium">{t('courseDetail.period')}</p>
                    <p className="text-muted-foreground">
                      <span className="num">{formatDateFromString(course.startDate)}</span> {t('courseDetail.until')} <span className="num">{formatDateFromString(course.endDate)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 size-4 shrink-0 text-faint-foreground" aria-hidden />
                  <div>
                    <p className="font-medium">{t('courseDetail.schedule')}</p>
                    <p className="num text-muted-foreground">{course.startTime} – {course.endTime}</p>
                    <p className="text-muted-foreground">{t('courseDetail.workload', { hours: course.workloadHours })}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-faint-foreground" aria-hidden />
                  <div>
                    <p className="font-medium">{t('courseDetail.location')}</p>
                    <p className="text-muted-foreground">{course.location}</p>
                  </div>
                </div>

                {instructorNames && (
                  <div className="flex items-start gap-2.5">
                    <User className="mt-0.5 size-4 shrink-0 text-faint-foreground" aria-hidden />
                    <div>
                      <p className="font-medium">{t('courseDetail.instructor')}</p>
                      <p className="text-muted-foreground">{instructorNames}</p>
                    </div>
                  </div>
                )}

                {course.registrationDeadline && (
                  <div className={cn('rounded-lg px-3 py-2 text-sm', registrationClosed ? 'border border-destructive/30 bg-destructive-soft text-destructive' : 'bg-muted text-muted-foreground')}>
                    {registrationClosed
                      ? t('courseDetail.registrationClosed')
                      : t('courseDetail.registrationUntil')}
                    <span className="num">{deadlineLabel}</span>
                  </div>
                )}

                {course.observations && (
                  <div className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
                    {course.observations}
                  </div>
                )}
              </div>

              <Button
                className="h-11 w-full text-base"
                disabled={enrollDisabled}
                onClick={() => setRegistrationOpen(true)}
              >
                {enrollLabel}
              </Button>

              {blockReason && (
                <p className="text-center text-sm text-muted-foreground -mt-2">{blockReason}</p>
              )}

              {!enrollDisabled && course.price === 0 && (
                <p className="text-center text-xs text-muted-foreground -mt-2">
                  {t('courseDetail.noFees')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Celular: o card com "Inscrever-se" fica depois da descrição, então a ação
          fica numa barra presa ao pé da tela. É sticky no fim da página (não fixed):
          ao chegar no final ela volta ao seu lugar, sem cobrir o conteúdo nem o rodapé. */}
      <div
        className="sticky bottom-0 z-30 border-t border-border bg-background lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className={cn('truncate font-semibold text-foreground', course.price !== 0 && 'num')}>{priceLabel}</p>
            {/* Bloqueado: o próprio botão diz o motivo. */}
            {!block && (
              <p className="truncate text-xs text-muted-foreground">
                {situation === 'in_progress' ? t('courseCard.inProgress') : t('courseCard.open')}
              </p>
            )}
          </div>
          <Button
            className="h-11 shrink-0 px-5 text-base"
            disabled={enrollDisabled}
            onClick={() => setRegistrationOpen(true)}
          >
            {enrollLabel}
          </Button>
        </div>
      </div>

      <RegistrationDialog
        open={registrationOpen}
        course={course}
        onClose={() => setRegistrationOpen(false)}
      />
    </div>
  )
}
