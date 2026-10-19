import { useState, useId, Children, cloneElement, isValidElement } from 'react'
import { useTranslation } from 'react-i18next'
import type { Course } from '@/@types/course'
import { useRegisterByCpf, useRegisterFull, useLookupCpf } from '@/hooks/useCourse'
import { useOrgInfo, usePublicSiteSettings } from '@/hooks/useSiteSettings'
import {
  buildCourseIcs, googleCalendarUrl, icsFileName, whatsappShareUrl, type CourseEvent,
} from '@/lib/calendar-links'
import { phoneDigits } from '@/lib/org-contact'
import { cn } from '@/lib/utils'
import { CPF_LABEL } from '@/lib/cin'
import {
  isAlreadyRegistered, isCannotConfirmRegistration, phoneEndOf, registrationErrorMessage,
} from '@/lib/registration-errors'
import { siteWhatsappHref } from '@/lib/site-whatsapp'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { maskCPF, maskPhone, maskCEP } from '@/utils/masks'
import { escapeHtml } from '@/utils/escape-html'
import { isValidCpf } from '@/utils/cpf'
import { calcAge } from '@/utils/age'
import { saveBlob } from '@/utils/download'
import { AgeHint } from '@/components/AgeHint'
import { ConfirmCloseDialog } from '@/components/confirm-close-dialog'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft, Calendar, CalendarPlus, CheckCircle2, Clock, FileDown, MapPin, Search, UserCheck,
} from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'

type Step = 'cpf' | 'confirm' | 'form' | 'success' | 'already'

const emptyFullForm = {
  name: '', rg: '', birthDate: '', phone: '', email: '',
  street: '', number: '', neighborhood: '', zipCode: '', city: '', terms: false,
}

// Campos do diálogo com pelo menos 44px de altura (toque no celular).
const inputCls = 'h-11'

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

export function RegistrationDialog({
  open,
  course,
  onClose,
}: {
  open: boolean
  course: Course
  onClose: () => void
}) {
  const { t } = useTranslation()
  const lookupCpf = useLookupCpf()
  const registerByCpf = useRegisterByCpf(course.id)
  const registerFull = useRegisterFull(course.id)
  const [step, setStep] = useState<Step>('cpf')
  const [cpf, setCpf] = useState('')
  const [phoneEnd, setPhoneEnd] = useState('')
  const [lookupName, setLookupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 409 "Procure o Sindicato": a mensagem ganha o link do WhatsApp.
  const [askSindicato, setAskSindicato] = useState(false)
  const [f, setF] = useState(emptyFullForm)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const cpfDigits = cpf.replace(/\D/g, '')
  const cpfOk = isValidCpf(cpfDigits)
  // Só acusa depois dos 11 números — enquanto digita não aparece erro.
  const cpfInvalid = cpfDigits.length === 11 && !cpfOk
  const phoneEndOk = phoneEnd.length === 4
  const { data: site } = usePublicSiteSettings()
  const whatsappHref = siteWhatsappHref(site?.whatsapp)

  const age = calcAge(f.birthDate)
  const isMinor = age !== null && age < 18

  // Formulário com algo digitado (mesmo se voltou para o CPF): toque fora/Esc não
  // fecham, e o X/Cancelar pedem confirmação antes de apagar.
  const formDirty = step !== 'success' && step !== 'already' && (
    f.terms || Object.values(f).some(v => typeof v === 'string' && v.trim() !== '')
  )

  function handleClose() {
    setStep('cpf'); setCpf(''); setPhoneEnd(''); setLookupName(''); setError(null); setAskSindicato(false)
    setF(emptyFullForm); setConfirmDiscard(false)
    onClose()
  }

  function requestClose() {
    if (formDirty) setConfirmDiscard(true)
    else handleClose()
  }

  // Etapa 1: o CPF e os 4 últimos dígitos do telefone do cadastro
  async function handleLookup() {
    if (cpfDigits.length !== 11) { setError('Digite os 11 números do CPF.'); return }
    if (!cpfOk) return // a mensagem já aparece embaixo do campo
    if (!phoneEndOk) { setError('Digite os 4 últimos números do telefone do seu cadastro.'); return }
    setLoading(true); setError(null); setAskSindicato(false)
    try {
      const res = await lookupCpf.mutateAsync({ cpf: cpfDigits, phoneEnd })
      if (res.found) { setLookupName(res.name ?? ''); setStep('confirm') }
      else setStep('form') // mantém o que já tinha sido digitado se a pessoa voltou para corrigir o CPF
    } catch (e) {
      setError(registrationErrorMessage(e, t('registration.errorDefault')))
    } finally { setLoading(false) }
  }

  // Etapa 2a: já existe → confirma e inscreve
  async function confirmExisting() {
    setLoading(true); setError(null)
    try {
      await registerByCpf.mutateAsync({ cpf: cpfDigits, phoneEnd })
      setStep('success')
    } catch (e) {
      if (isAlreadyRegistered(e)) setStep('already')
      else setError(registrationErrorMessage(e, t('registration.errorDefault')))
    } finally { setLoading(false) }
  }

  // Etapa 2b: não existe → cadastro simples + inscrição
  async function submitFull() {
    const phoneDigitsValue = f.phone.replace(/\D/g, '')
    if (!f.name.trim()) { setError('Informe o nome.'); return }
    if (![10, 11].includes(phoneDigitsValue.length)) { setError('Telefone inválido.'); return }
    // E-mail é opcional (muita gente não tem); se preencher, precisa ser válido.
    const email = f.email.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Informe um e-mail válido ou deixe o campo em branco.'); return }
    if (!f.terms) { setError('É preciso aceitar os termos.'); return }
    setLoading(true); setError(null); setAskSindicato(false)
    try {
      await registerFull.mutateAsync({
        name: f.name.trim(),
        phone: phoneDigitsValue,
        email: email || undefined,
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
      else {
        setError(registrationErrorMessage(e, t('registration.errorDefault')))
        setAskSindicato(isCannotConfirmRegistration(e))
      }
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
                <Field label={CPF_LABEL}>
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
                <Field label="4 últimos números do seu telefone">
                  <Input
                    value={phoneEnd}
                    onChange={e => { setPhoneEnd(phoneEndOf(e.target.value)); setError(null) }}
                    onKeyDown={e => { if (e.key === 'Enter' && !loading) handleLookup() }}
                    placeholder="0000"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="off"
                    className={cn(inputCls, 'text-base')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use o telefone do seu cadastro no Sindicato. Se for sua primeira vez, digite o telefone que você vai informar no cadastro.
                  </p>
                </Field>
                <p className="text-sm text-muted-foreground">Informe seu CPF e telefone para começar a inscrição. É para proteger os dados de quem já tem cadastro.</p>
                {error && <ErrorAlert message={error} />}
                <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={requestClose} className="h-11 sm:flex-none">
                    {t('registration.cancel')}
                  </Button>
                  <Button className="h-11 flex-1 gap-2" disabled={loading || !cpfOk || !phoneEndOk} onClick={handleLookup}>
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
                <DialogDescription>Encontramos um cadastro com esse CPF e telefone. É você?</DialogDescription>
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
                <DialogDescription>Não encontramos cadastro com esse CPF e telefone. Preencha seus dados para se inscrever.</DialogDescription>
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
                <Field label="E-mail" optional>
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
                {askSindicato && whatsappHref && (
                  <Button asChild variant="outline" className="h-11 w-full gap-2 text-base">
                    <a href={whatsappHref} target="_blank" rel="noreferrer">
                      <FaWhatsapp className="size-5 text-[#25D366]" /> Falar com o Sindicato no WhatsApp
                    </a>
                  </Button>
                )}
                <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={() => { setError(null); setAskSindicato(false); setStep('cpf') }} className="h-11 gap-1.5 sm:flex-none">
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
