import { createFileRoute, Link } from '@tanstack/react-router'
import { apiErrorMessage } from '@/lib/api-error-message'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useCourse, useRegisterCourse } from '@/hooks/useCourse'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { maskCPF, maskPhone } from '@/utils/masks'
import { pessoaSchema } from '@/lib/schemas'
import type { PessoaFormData } from '@/lib/schemas'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import {
  ArrowLeft, Calendar, CheckCircle2, Clock, GraduationCap, MapPin, User, Users,
} from 'lucide-react'
import { FaLinkedin, FaInstagram, FaFacebook } from 'react-icons/fa'

export const Route = createFileRoute('/_public/cursos/$id')({
  component: RouteComponent,
})

type Step = 'form' | 'success'

function RegistrationDialog({
  open,
  courseId,
  courseName,
  onClose,
}: {
  open: boolean
  courseId: string
  courseName: string
  onClose: () => void
}) {
  const register = useRegisterCourse(courseId)
  const [step, setStep] = useState<Step>('form')
  const { t } = useTranslation()

  const form = useForm<PessoaFormData>({
    resolver: zodResolver(pessoaSchema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', phone: '', cpf: '' },
  })

  async function onSubmit(data: PessoaFormData) {
    try {
      await register.mutateAsync({ name: data.name, email: data.email, phone: data.phone, cpf: data.cpf })
      setStep('success')
    } catch (e: unknown) {
      form.setError('root', { message: apiErrorMessage(e, t('registration.errorDefault')) })
    }
  }

  function handleClose() {
    form.reset()
    setStep('form')
    onClose()
  }

  const nameValue = form.watch('name')

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        {step === 'success' ? (
          <>
            <div className="flex flex-col items-center text-center py-4 gap-3">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="size-8 text-emerald-600" />
              </div>
              <DialogTitle className="text-xl">{t('registration.successTitle')}</DialogTitle>
              <p
                className="text-sm text-muted-foreground"
                dangerouslySetInnerHTML={{
                  __html: t('registration.successMessage', { courseName }),
                }}
              />
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={handleClose}>{t('registration.close')}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('registration.title')}</DialogTitle>
              <DialogDescription
                dangerouslySetInnerHTML={{
                  __html: t('registration.description', { courseName }),
                }}
              />
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('registration.fullName')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Maria da Silva" maxLength={50} autoFocus />
                    </FormControl>
                    {nameValue.length > 40 && (
                      <span className="text-xs text-muted-foreground text-right">{nameValue.length}/50</span>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('registration.email')}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} placeholder="maria@email.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('registration.phone')}</FormLabel>
                    <FormControl>
                      <Input
                        value={field.value}
                        onChange={e => field.onChange(maskPhone(e.target.value))}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        placeholder="(44) 99999-9999"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cpf" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('registration.cpf')}</FormLabel>
                    <FormControl>
                      <Input
                        value={field.value}
                        onChange={e => field.onChange(maskCPF(e.target.value))}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        placeholder="000.000.000-00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {form.formState.errors.root && <ErrorAlert message={form.formState.errors.root.message ?? null} />}

                <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={handleClose} className="sm:flex-none">
                    {t('registration.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={!form.formState.isValid || register.isPending}
                  >
                    {register.isPending ? t('registration.submitting') : t('registration.confirm')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: course, isLoading, isError } = useCourse(id)
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-muted-foreground">{t('courseDetail.loading')}</p>
      </div>
    )
  }

  if (isError || !course) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <GraduationCap className="size-16 text-muted-foreground/50" />
        <h2 className="mt-4 text-xl font-semibold">{t('courseDetail.notFound')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('courseDetail.notFoundDesc')}</p>
        <Link to="/cursos" className="mt-6">
          <Button variant="outline">
            <ArrowLeft className="mr-2 size-4" /> {t('courseDetail.viewAll')}
          </Button>
        </Link>
      </div>
    )
  }

  const spotsLeft = course.maxStudents - course.enrolled
  const occupancyPercent = Math.round((course.enrolled / course.maxStudents) * 100)
  const isFull = spotsLeft <= 0

  const registrationClosed = course.registrationDeadline
    ? new Date(course.registrationDeadline) < new Date()
    : false

  const enrollDisabled = isFull || registrationClosed

  function enrollBtnLabel() {
    if (isFull) return t('courseDetail.spotsFull')
    if (registrationClosed) return t('courseDetail.registrationClosed2')
    return t('courseDetail.enroll')
  }

  return (
    <div className="bg-background">
      {/* Hero */}
      <div className="relative h-64 w-full overflow-hidden bg-muted md:h-80">
        {course.coverImage ? (
          <img src={course.coverImage} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/10">
            <GraduationCap className="size-20 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6">
          <Badge className="mb-2 bg-white text-foreground">
            {course.price === 0 ? t('courseDetail.free') : `R$ ${course.price.toFixed(2)}`}
          </Badge>
          <h1 className="text-2xl font-bold text-white md:text-3xl">{course.title}</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Link to="/cursos" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {t('courseDetail.backToCourses')}
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('courseDetail.about')}</h2>
              <div className="mt-2 prose prose-sm max-w-none text-muted-foreground prose-headings:text-foreground prose-headings:font-semibold prose-strong:text-foreground prose-a:text-primary">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {course.description ?? ''}
                </ReactMarkdown>
              </div>
            </div>

            {(course.photoGallery?.length ?? 0) > 0 && (
              <div>
                <h2 className="mb-3 text-lg font-semibold text-foreground">{t('courseDetail.gallery')}</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {course.photoGallery.map((photo, i) => (
                    <div key={i} className="overflow-hidden rounded-lg aspect-video bg-muted">
                      <img
                        src={photo.url}
                        alt={photo.caption}
                        className="h-full w-full object-cover transition-transform hover:scale-105"
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
                    <div key={instructor.id} className="flex items-start gap-4 rounded-xl border bg-card p-4">
                      {instructor.avatar
                        ? <img src={instructor.avatar} alt={instructor.name} className="size-14 rounded-full object-cover border-2 border-border shrink-0" />
                        : <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User className="size-6 text-primary/40" /></div>
                      }
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{instructor.name}</p>
                        {instructor.title && <p className="text-xs font-medium text-primary">{instructor.title}</p>}
                        {instructor.bio && <p className="text-sm text-muted-foreground mt-0.5">{instructor.bio}</p>}
                        {(instructor.linkedin || instructor.instagram || instructor.facebook) && (
                          <div className="flex items-center gap-3 mt-1.5">
                            {instructor.linkedin && (
                              <a href={instructor.linkedin} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <FaLinkedin className="size-4" />
                              </a>
                            )}
                            {instructor.instagram && (
                              <a href={instructor.instagram} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <FaInstagram className="size-4" />
                              </a>
                            )}
                            {instructor.facebook && (
                              <a href={instructor.facebook} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
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
            <div className="rounded-xl border bg-card p-5 flex flex-col gap-4">
              <h3 className="font-semibold text-foreground">{t('courseDetail.info')}</h3>

              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">{t('courseDetail.period')}</p>
                    <p className="text-muted-foreground">
                      {formatDateFromString(course.startDate)} {t('courseDetail.until')} {formatDateFromString(course.endDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">{t('courseDetail.schedule')}</p>
                    <p className="text-muted-foreground">{course.startTime} – {course.endTime}</p>
                    <p className="text-muted-foreground">{t('courseDetail.workload', { hours: course.workloadHours })}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">{t('courseDetail.location')}</p>
                    <p className="text-muted-foreground">{course.location}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <User className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">{t('courseDetail.instructor')}</p>
                    {(course.instructors?.length ?? 0) > 0
                      ? <p className="text-muted-foreground">{course.instructors.map(i => i.name).join(', ')}</p>
                      : <p className="text-muted-foreground">{course.instructorName}</p>
                    }
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Users className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">{t('courseDetail.spots')}</p>
                    <p className="text-muted-foreground">
                      {t('courseDetail.spotsCount', { enrolled: course.enrolled, max: course.maxStudents })}
                    </p>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isFull ? 'bg-destructive' : 'bg-primary'}`}
                        style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                      />
                    </div>
                    <p className={`mt-1 text-xs ${isFull ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {isFull
                        ? t('courseDetail.spotsFull')
                        : t('courseDetail.spotsLeft', { count: spotsLeft })}
                    </p>
                  </div>
                </div>

                {course.registrationDeadline && (
                  <div className={`rounded-lg px-3 py-2 text-xs ${registrationClosed ? 'border border-destructive/20 bg-destructive/5 text-destructive' : 'bg-muted/60 text-muted-foreground'}`}>
                    {registrationClosed
                      ? t('courseDetail.registrationClosed')
                      : t('courseDetail.registrationUntil')}
                    {formatDateFromString(course.registrationDeadline)}
                  </div>
                )}

                {course.observations && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                    {course.observations}
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={enrollDisabled}
                onClick={() => setRegistrationOpen(true)}
              >
                {enrollBtnLabel()}
              </Button>

              {!enrollDisabled && (
                <p className="text-center text-xs text-muted-foreground -mt-2">
                  {t('courseDetail.noFees')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <RegistrationDialog
        open={registrationOpen}
        courseId={id}
        courseName={course.title}
        onClose={() => setRegistrationOpen(false)}
      />
    </div>
  )
}
