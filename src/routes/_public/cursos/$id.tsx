import { createFileRoute, Link } from '@tanstack/react-router'
import { apiErrorMessage } from '@/lib/api-error-message'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCourse } from '@/hooks/useCourse'
import { API_BASE } from '@/lib/api'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { maskCPF, maskPhone, maskCEP } from '@/utils/masks'
import { ageLabel } from '@/utils/age'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft, Calendar, CheckCircle2, Clock, GraduationCap, MapPin, User, Users, Search, UserCheck,
} from 'lucide-react'
import { FaLinkedin, FaInstagram, FaFacebook } from 'react-icons/fa'

export const Route = createFileRoute('/_public/cursos/$id')({
  component: RouteComponent,
})

type Step = 'cpf' | 'confirm' | 'form' | 'success'

const emptyFullForm = {
  name: '', rg: '', birthDate: '', phone: '', email: '',
  street: '', number: '', neighborhood: '', zipCode: '', city: '', terms: false,
}

async function postJson(url: string, body: unknown): Promise<void> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const d = await r.json().catch(() => null)
    throw new Error(d?.error ?? d?.message ?? `HTTP ${r.status}`)
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

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
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('cpf')
  const [cpf, setCpf] = useState('')
  const [lookupName, setLookupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState(emptyFullForm)

  const cpfDigits = cpf.replace(/\D/g, '')

  function handleClose() {
    setStep('cpf'); setCpf(''); setLookupName(''); setError(null); setF(emptyFullForm)
    onClose()
  }

  // Etapa 1: busca por CPF
  async function handleLookup() {
    if (cpfDigits.length !== 11) { setError('CPF inválido.'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${API_BASE}/users/lookup-cpf/${cpfDigits}`).then(r => r.json())
      if (res.found) { setLookupName(res.name ?? ''); setStep('confirm') }
      else { setF({ ...emptyFullForm }); setStep('form') }
    } catch (e) {
      setError(apiErrorMessage(e, t('registration.errorDefault')))
    } finally { setLoading(false) }
  }

  // Etapa 2a: já existe → confirma e inscreve
  async function confirmExisting() {
    setLoading(true); setError(null)
    try {
      await postJson(`${API_BASE}/courses/${courseId}/register-by-cpf`, { cpf: cpfDigits })
      setStep('success')
    } catch (e) {
      setError(apiErrorMessage(e, t('registration.errorDefault')))
    } finally { setLoading(false) }
  }

  // Etapa 2b: não existe → cadastro simples + inscrição
  async function submitFull() {
    const phoneDigits = f.phone.replace(/\D/g, '')
    if (!f.name.trim()) { setError('Informe o nome.'); return }
    if (!f.email.trim()) { setError('Informe o e-mail.'); return }
    if (![10, 11].includes(phoneDigits.length)) { setError('Telefone inválido.'); return }
    if (!f.terms) { setError('É preciso aceitar os termos.'); return }
    setLoading(true); setError(null)
    try {
      await postJson(`${API_BASE}/courses/${courseId}/register-full`, {
        name: f.name.trim(),
        phone: phoneDigits,
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
      setError(apiErrorMessage(e, t('registration.errorDefault')))
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {step === 'success' && (
          <>
            <div className="flex flex-col items-center text-center py-4 gap-3">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="size-8 text-emerald-600" />
              </div>
              <DialogTitle className="text-xl">{t('registration.successTitle')}</DialogTitle>
              <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('registration.successMessage', { courseName }) }} />
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={handleClose}>{t('registration.close')}</Button>
            </DialogFooter>
          </>
        )}

        {step === 'cpf' && (
          <>
            <DialogHeader>
              <DialogTitle>{t('registration.title')}</DialogTitle>
              <DialogDescription dangerouslySetInnerHTML={{ __html: t('registration.description', { courseName }) }} />
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Field label="CPF">
                <Input
                  value={cpf}
                  onChange={e => { setCpf(maskCPF(e.target.value)); setError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') handleLookup() }}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  autoFocus
                />
              </Field>
              <p className="text-xs text-muted-foreground">Informe seu CPF para começar a inscrição.</p>
              {error && <ErrorAlert message={error} />}
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={handleClose} className="sm:flex-none">
                  {t('registration.cancel')}
                </Button>
                <Button className="flex-1 gap-2" disabled={loading || cpfDigits.length !== 11} onClick={handleLookup}>
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
                <Button type="button" variant="outline" onClick={() => { setError(null); setStep('cpf') }} className="sm:flex-none">
                  Não sou eu
                </Button>
                <Button className="flex-1" disabled={loading} onClick={confirmExisting}>
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
                <Input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Maria da Silva" autoFocus />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CPF">
                  <Input value={cpf} disabled className="font-mono" />
                </Field>
                <Field label="RG">
                  <Input value={f.rg} onChange={e => setF(p => ({ ...p, rg: e.target.value }))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Data de nascimento${ageLabel(f.birthDate) ? ` — ${ageLabel(f.birthDate)}` : ''}`}>
                  <Input type="date" value={f.birthDate} onChange={e => setF(p => ({ ...p, birthDate: e.target.value }))} />
                </Field>
                <Field label="Telefone">
                  <Input value={f.phone} onChange={e => setF(p => ({ ...p, phone: maskPhone(e.target.value) }))} placeholder="(44) 99999-9999" />
                </Field>
              </div>
              <Field label="E-mail">
                <Input type="email" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} placeholder="maria@email.com" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="Endereço">
                    <Input value={f.street} onChange={e => setF(p => ({ ...p, street: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Nº / KM">
                  <Input value={f.number} onChange={e => setF(p => ({ ...p, number: e.target.value }))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bairro">
                  <Input value={f.neighborhood} onChange={e => setF(p => ({ ...p, neighborhood: e.target.value }))} />
                </Field>
                <Field label="CEP">
                  <Input value={f.zipCode} onChange={e => setF(p => ({ ...p, zipCode: maskCEP(e.target.value) }))} placeholder="00000-000" />
                </Field>
              </div>
              <Field label="Cidade">
                <Input value={f.city} onChange={e => setF(p => ({ ...p, city: e.target.value }))} />
              </Field>
              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input type="checkbox" checked={f.terms} onChange={e => setF(p => ({ ...p, terms: e.target.checked }))} className="accent-primary mt-0.5" />
                <span className="text-xs text-muted-foreground">Li e aceito os termos de participação e o uso dos meus dados para a realização do curso.</span>
              </label>
              {error && <ErrorAlert message={error} />}
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => { setError(null); setStep('cpf') }} className="sm:flex-none">
                  {t('registration.cancel')}
                </Button>
                <Button className="flex-1" disabled={loading} onClick={submitFull}>
                  {loading ? t('registration.submitting') : t('registration.confirm')}
                </Button>
              </DialogFooter>
            </div>
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
