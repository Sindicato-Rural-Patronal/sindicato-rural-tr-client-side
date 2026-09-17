import { createFileRoute, Link } from '@tanstack/react-router'
import { apiErrorMessage } from '@/lib/api-error-message'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState, useId, Children, cloneElement, isValidElement } from 'react'
import { useTranslation } from 'react-i18next'
import type { Course } from '@/@types/course'
import { useCourse, useRegisterByCpf, useRegisterFull } from '@/hooks/useCourse'
import { useSeo } from '@/hooks/useSeo'
import { useOrgInfo } from '@/hooks/useSiteSettings'
import { apiFetch, ApiError } from '@/lib/api'
import {
  buildCourseIcs, googleCalendarUrl, icsFileName, whatsappShareUrl, type CourseEvent,
} from '@/lib/calendar-links'
import { phoneDigits } from '@/lib/org-contact'
import { cn } from '@/lib/utils'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { formatBRL } from '@/utils/format-currency'
import { maskCPF, maskPhone, maskCEP } from '@/utils/masks'
import { escapeHtml } from '@/utils/escape-html'
import { safeUrl } from '@/utils/safe-url'
import { isValidCpf } from '@/utils/cpf'
import { calcAge } from '@/utils/age'
import { saveBlob } from '@/utils/download'
import {
  deadlineTimeOf, getCourseSituation, getRegistrationBlock, isRegistrationDeadlinePassed, type RegistrationBlock,
} from '@/utils/course-status'
import { AgeHint } from '@/components/AgeHint'
import { ConfirmCloseDialog } from '@/components/confirm-close-dialog'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft, Calendar, CalendarPlus, CheckCircle2, Clock, FileDown, GraduationCap, MapPin, RefreshCw,
  User, Users, Search, UserCheck, WifiOff,
} from 'lucide-react'
import { FaLinkedin, FaInstagram, FaFacebook, FaWhatsapp } from 'react-icons/fa'

export const Route = createFileRoute('/_public/cursos/$id')({
  component: RouteComponent,
})

type Step = 'cpf' | 'confirm' | 'form' | 'success' | 'already'

const emptyFullForm = {
  name: '', rg: '', birthDate: '', phone: '', email: '',
  street: '', number: '', neighborhood: '', zipCode: '', city: '', terms: false,
}

// Campos do diálogo com pelo menos 44px de altura (toque no celular).
const inputCls = 'h-11'

// Mensagem do backend para inscrição repetida (CourseRegistrationAlreadyExistsError).
const ALREADY_REGISTERED = 'User already registered for this course'

function isAlreadyRegistered(e: unknown) {
  return e instanceof ApiError && e.status === 409 && e.message === ALREADY_REGISTERED
}

function Field({ label, optional, className, children }: {
  label: string
  optional?: boolean
  className?: string
  children: React.ReactNode
}) {
  const id = useId()
  const items = Children.toArray(children)
  const control = items[0]
  const rest = items.slice(1)
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        {label}
        {optional && <span className="font-normal"> (opcional)</span>}
      </Label>
      {isValidElement(control)
        ? cloneElement(control as React.ReactElement<{ id?: string }>, { id })
        : control}
      {rest}
    </div>
  )
}

/** Tela final: inscrição feita (ou já existente) com resumo, agenda, WhatsApp e telefone. */
function RegisteredView({ course, already, onClose }: { course: Course; already: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const org = useOrgInfo()

  const event: CourseEvent = {
    id: course.id,
    title: course.title,
    startDate: course.startDate,
    endDate: course.endDate,
    startTime: course.startTime,
    endTime: course.endTime,
    location: course.location,
    url: `${window.location.origin}/cursos/${course.id}`,
  }
  const googleUrl = googleCalendarUrl(event)
  const days = course.startDate === course.endDate
    ? formatDateFromString(course.startDate)
    : `${formatDateFromString(course.startDate)} ${t('courseDetail.until')} ${formatDateFromString(course.endDate)}`

  function downloadIcs() {
    const ics = buildCourseIcs(event)
    if (ics) saveBlob(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), icsFileName(course.title))
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <div className={cn(
          'flex size-16 items-center justify-center rounded-full',
          already ? 'bg-primary/10' : 'bg-emerald-100 dark:bg-emerald-950/40',
        )}>
          {already
            ? <UserCheck className="size-8 text-primary" />
            : <CheckCircle2 className="size-8 text-emerald-600" />}
        </div>
        <DialogTitle className="text-xl">
          {already ? t('registration.alreadyTitle') : t('registration.successTitle')}
        </DialogTitle>
        {already
          ? <DialogDescription className="sr-only">{course.title}</DialogDescription>
          : <DialogDescription dangerouslySetInnerHTML={{ __html: t('registration.successMessage', { courseName: escapeHtml(course.title) }) }} />}
      </div>

      <div className="flex flex-col gap-2.5 rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="font-semibold text-foreground">{course.title}</p>
        <div className="flex items-start gap-2.5">
          <Calendar className="mt-0.5 size-4 shrink-0 text-primary" />
          <p><span className="text-muted-foreground">{t('courseDetail.period')}: </span>{days}</p>
        </div>
        <div className="flex items-start gap-2.5">
          <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
          <p><span className="text-muted-foreground">{t('courseDetail.schedule')}: </span>{course.startTime} – {course.endTime}</p>
        </div>
        {course.location && (
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <p><span className="text-muted-foreground">{t('courseDetail.location')}: </span>{course.location}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {googleUrl && (
          <>
            <Button type="button" variant="outline" className="h-11 w-full gap-2 text-base" onClick={downloadIcs}>
              <CalendarPlus className="size-5" /> {t('registration.addToCalendar')}
            </Button>
            <a
              href={googleUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-primary underline underline-offset-4"
            >
              {t('registration.googleCalendar')}
            </a>
          </>
        )}
        <Button asChild variant="outline" className="h-11 w-full gap-2 text-base">
          <a href={whatsappShareUrl(event)} target="_blank" rel="noreferrer">
            <FaWhatsapp className="size-5 text-[#25D366]" /> {t('registration.sendWhatsapp')}
          </a>
        </Button>
        {org.phone && (
          <p className="pt-1 text-center text-sm text-muted-foreground">
            {t('registration.callUs')}{' '}
            <a
              href={`tel:${phoneDigits(org.phone)}`}
              className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
            >
              {org.phone}
            </a>
          </p>
        )}
      </div>

      <DialogFooter>
        <Button className="h-11 w-full text-base" onClick={onClose}>{t('registration.close')}</Button>
      </DialogFooter>
    </>
  )
}

function RegistrationDialog({
  open,
  course,
  onClose,
}: {
  open: boolean
  course: Course
  onClose: () => void
}) {
  const { t } = useTranslation()
  const registerByCpf = useRegisterByCpf(course.id)
  const registerFull = useRegisterFull(course.id)
  const [step, setStep] = useState<Step>('cpf')
  const [cpf, setCpf] = useState('')
  const [lookupName, setLookupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState(emptyFullForm)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const cpfDigits = cpf.replace(/\D/g, '')
  const cpfOk = isValidCpf(cpfDigits)
  // Só acusa depois dos 11 números — enquanto digita não aparece erro.
  const cpfInvalid = cpfDigits.length === 11 && !cpfOk

  const age = calcAge(f.birthDate)
  const isMinor = age !== null && age < 18

  // Formulário com algo digitado (mesmo se voltou para o CPF): toque fora/Esc não
  // fecham, e o X/Cancelar pedem confirmação antes de apagar.
  const formDirty = step !== 'success' && step !== 'already' && (
    f.terms || Object.values(f).some(v => typeof v === 'string' && v.trim() !== '')
  )

  function handleClose() {
    setStep('cpf'); setCpf(''); setLookupName(''); setError(null); setF(emptyFullForm); setConfirmDiscard(false)
    onClose()
  }

  function requestClose() {
    if (formDirty) setConfirmDiscard(true)
    else handleClose()
  }

  // Etapa 1: busca por CPF
  async function handleLookup() {
    if (cpfDigits.length !== 11) { setError('Digite os 11 números do CPF.'); return }
    if (!cpfOk) return // a mensagem já aparece embaixo do campo
    setLoading(true); setError(null)
    try {
      const res = await apiFetch(`/users/lookup-cpf/${cpfDigits}`).then(r => r.json())
      if (res.found) { setLookupName(res.name ?? ''); setStep('confirm') }
      else setStep('form') // mantém o que já tinha sido digitado se a pessoa voltou para corrigir o CPF
    } catch (e) {
      setError(apiErrorMessage(e, t('registration.errorDefault')))
    } finally { setLoading(false) }
  }

  // Etapa 2a: já existe → confirma e inscreve
  async function confirmExisting() {
    setLoading(true); setError(null)
    try {
      await registerByCpf.mutateAsync(cpfDigits)
      setStep('success')
    } catch (e) {
      if (isAlreadyRegistered(e)) setStep('already')
      else setError(apiErrorMessage(e, t('registration.errorDefault')))
    } finally { setLoading(false) }
  }

  // Etapa 2b: não existe → cadastro simples + inscrição
  async function submitFull() {
    const phoneDigitsValue = f.phone.replace(/\D/g, '')
    if (!f.name.trim()) { setError('Informe o nome.'); return }
    if (![10, 11].includes(phoneDigitsValue.length)) { setError('Telefone inválido.'); return }
    if (!f.email.trim()) { setError('Informe o e-mail.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setError('Informe um e-mail válido.'); return }
    if (!f.terms) { setError('É preciso aceitar os termos.'); return }
    setLoading(true); setError(null)
    try {
      await registerFull.mutateAsync({
        name: f.name.trim(),
        phone: phoneDigitsValue,
        email: f.email.trim(),
        cpf: cpfDigits,
        rg: f.rg || undefined,
        birthDate: f.birthDate || undefined,
        address: {
          type: 'URBAN',
          zipCode: f.zipCode.replace(/\D/g, '') || undefined,
          street: f.street || undefined,
          number: f.number || undefined,
          neighborhood: f.neighborhood || undefined,
          city: f.city || undefined,
        },
      })
      setStep('success')
    } catch (e) {
      if (isAlreadyRegistered(e)) setStep('already')
      else setError(apiErrorMessage(e, t('registration.errorDefault')))
    } finally { setLoading(false) }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={o => { if (!o) requestClose() }}>
        <DialogContent
          className="sm:max-w-md max-h-[90vh] overflow-y-auto"
          onInteractOutside={e => { if (formDirty) e.preventDefault() }}
          onEscapeKeyDown={e => { if (formDirty) e.preventDefault() }}
        >
          {(step === 'success' || step === 'already') && (
            <RegisteredView course={course} already={step === 'already'} onClose={handleClose} />
          )}

          {step === 'cpf' && (
            <>
              <DialogHeader>
                <DialogTitle>{t('registration.title')}</DialogTitle>
                <DialogDescription dangerouslySetInnerHTML={{ __html: t('registration.description', { courseName: escapeHtml(course.title) }) }} />
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <Field label="CPF">
                  <Input
                    value={cpf}
                    onChange={e => { setCpf(maskCPF(e.target.value)); setError(null) }}
                    onKeyDown={e => { if (e.key === 'Enter' && !loading) handleLookup() }}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    aria-invalid={cpfInvalid || undefined}
                    className={cn(inputCls, 'text-base')}
                    autoFocus
                  />
                  {cpfInvalid && (
                    <p className="text-sm text-destructive" role="alert">CPF inválido. Confira os números digitados.</p>
                  )}
                </Field>
                <p className="text-sm text-muted-foreground">Informe seu CPF para começar a inscrição.</p>
                {error && <ErrorAlert message={error} />}
                <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={requestClose} className="h-11 sm:flex-none">
                    {t('registration.cancel')}
                  </Button>
                  <Button className="h-11 flex-1 gap-2" disabled={loading || !cpfOk} onClick={handleLookup}>
                    <Search className="size-4" />
                    {loading ? 'Buscando...' : 'Continuar'}
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              <DialogHeader>
                <DialogTitle>Confirmar identidade</DialogTitle>
                <DialogDescription>Encontramos um cadastro com esse CPF. É você?</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserCheck className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{lookupName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{cpf}</p>
                  </div>
                </div>
                {error && <ErrorAlert message={error} />}
                <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={() => { setError(null); setStep('cpf') }} className="h-11 sm:flex-none">
                    Não sou eu
                  </Button>
                  <Button className="h-11 flex-1" disabled={loading} onClick={confirmExisting}>
                    {loading ? t('registration.submitting') : 'Sim, confirmar inscrição'}
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}

          {step === 'form' && (
            <>
              <DialogHeader>
                <DialogTitle>Cadastro do participante</DialogTitle>
                <DialogDescription>Não encontramos esse CPF. Preencha seus dados para se inscrever.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <Field label="Nome completo">
                  <Input
                    className={inputCls}
                    value={f.name}
                    onChange={e => setF(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Maria da Silva"
                    autoComplete="name"
                    autoCapitalize="words"
                    autoFocus
                  />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="CPF">
                    <Input value={cpf} disabled className={cn(inputCls, 'font-mono')} />
                  </Field>
                  <Field label="RG" optional>
                    <Input className={inputCls} value={f.rg} onChange={e => setF(p => ({ ...p, rg: e.target.value }))} autoComplete="off" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Data de nascimento" optional>
                    <Input
                      type="date"
                      className={inputCls}
                      value={f.birthDate}
                      onChange={e => setF(p => ({ ...p, birthDate: e.target.value }))}
                      autoComplete="bday"
                    />
                    <AgeHint birthDate={f.birthDate} />
                    {isMinor && (
                      <a
                        href="/termo-autorizacao-menor.pdf"
                        download
                        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
                      >
                        <FileDown className="size-4" /> Baixar termo de autorização
                      </a>
                    )}
                  </Field>
                  <Field label="Telefone">
                    <Input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      className={inputCls}
                      value={f.phone}
                      onChange={e => setF(p => ({ ...p, phone: maskPhone(e.target.value) }))}
                      placeholder="(44) 99999-9999"
                    />
                  </Field>
                </div>
                <Field label="E-mail">
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    className={inputCls}
                    value={f.email}
                    onChange={e => setF(p => ({ ...p, email: e.target.value }))}
                    placeholder="maria@email.com"
                  />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Endereço" optional className="sm:col-span-2">
                    <Input className={inputCls} value={f.street} onChange={e => setF(p => ({ ...p, street: e.target.value }))} autoComplete="address-line1" />
                  </Field>
                  <Field label="Nº / KM" optional>
                    <Input className={inputCls} value={f.number} onChange={e => setF(p => ({ ...p, number: e.target.value }))} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Bairro" optional>
                    <Input className={inputCls} value={f.neighborhood} onChange={e => setF(p => ({ ...p, neighborhood: e.target.value }))} autoComplete="address-level3" />
                  </Field>
                  <Field label="CEP" optional>
                    <Input
                      className={inputCls}
                      value={f.zipCode}
                      onChange={e => setF(p => ({ ...p, zipCode: maskCEP(e.target.value) }))}
                      placeholder="00000-000"
                      inputMode="numeric"
                      autoComplete="postal-code"
                    />
                  </Field>
                </div>
                <Field label="Cidade" optional>
                  <Input className={inputCls} value={f.city} onChange={e => setF(p => ({ ...p, city: e.target.value }))} autoComplete="address-level2" />
                </Field>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 pt-1">
                  <input
                    type="checkbox"
                    checked={f.terms}
                    onChange={e => setF(p => ({ ...p, terms: e.target.checked }))}
                    className="mt-0.5 size-5 shrink-0 accent-primary"
                  />
                  <span className="text-sm text-muted-foreground">Li e aceito os termos de participação e o uso dos meus dados para a realização do curso.</span>
                </label>
                {error && <ErrorAlert message={error} />}
                <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={() => { setError(null); setStep('cpf') }} className="h-11 gap-1.5 sm:flex-none">
                    <ArrowLeft className="size-4" /> {t('registration.back')}
                  </Button>
                  <Button className="h-11 flex-1" disabled={loading} onClick={submitFull}>
                    {loading ? t('registration.submitting') : t('registration.confirm')}
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmCloseDialog
        open={confirmDiscard}
        onConfirm={handleClose}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  )
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
        {/* Hero */}
        <Skeleton className="h-64 w-full rounded-none md:h-80" />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="mb-6 h-4 w-32" />
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
              <div className="rounded-xl border bg-card p-5 flex flex-col gap-4">
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
          <WifiOff className="size-16 text-muted-foreground/50" />
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
        <GraduationCap className="size-16 text-muted-foreground/50" />
        <h2 className="mt-4 text-xl font-semibold">{t('courseDetail.notFound')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('courseDetail.notFoundDesc')}</p>
        <Button asChild variant="outline" className="mt-6 h-11 gap-2">
          <Link to="/cursos"><ArrowLeft className="size-4" /> {t('courseDetail.viewAll')}</Link>
        </Button>
      </div>
    )
  }

  const spotsLeft = Math.max(0, course.maxStudents - course.enrolled)
  const occupancyPercent = course.maxStudents > 0
    ? Math.min(100, Math.round((course.enrolled / course.maxStudents) * 100))
    : 100
  const isFull = spotsLeft <= 0

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
          <Badge className="mb-2 bg-white text-neutral-900">{priceLabel}</Badge>
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
                    <div key={photo.url} className="overflow-hidden rounded-lg aspect-video bg-muted">
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

                {instructorNames && (
                  <div className="flex items-start gap-2.5">
                    <User className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">{t('courseDetail.instructor')}</p>
                      <p className="text-muted-foreground">{instructorNames}</p>
                    </div>
                  </div>
                )}

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
                        style={{ width: `${occupancyPercent}%` }}
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
                    {deadlineLabel}
                  </div>
                )}

                {course.observations && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-950/30 dark:text-yellow-300">
                    {course.observations}
                  </div>
                )}
              </div>

              <Button
                className="h-11 w-full text-base"
                size="lg"
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
        className="sticky bottom-0 z-30 border-t bg-background/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">{priceLabel}</p>
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
