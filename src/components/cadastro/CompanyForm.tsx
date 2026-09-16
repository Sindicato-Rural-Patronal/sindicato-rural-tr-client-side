import { useMemo, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect } from '@/components/ui/native-select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { maskCNPJ, maskPhone } from '@/utils/masks'
import { isValidCnpj } from '@/utils/cnpj'
import { upperNoAccents } from '@/utils/text-format'
import { COMPANY_TYPE_LABEL, type Company, type CompanyInput, type CompanyType } from '@/hooks/useCompanies'

// Dados cadastrais da empresa — usado para criar e para editar.

type FormState = {
  name: string
  cnpj: string
  stateRegistration: string
  type: CompanyType
  phone: string
  phone2: string
  phone3: string
  email: string
  website: string
  notes: string
}

function fromCompany(c?: Company | null): FormState {
  return {
    name: c?.name ?? '',
    cnpj: c?.cnpj ? maskCNPJ(c.cnpj) : '',
    stateRegistration: c?.stateRegistration ?? '',
    type: c?.type ?? 'PRIVATE',
    phone: c?.phone ? maskPhone(c.phone) : '',
    phone2: c?.phone2 ? maskPhone(c.phone2) : '',
    phone3: c?.phone3 ? maskPhone(c.phone3) : '',
    email: c?.email ?? '',
    website: c?.website ?? '',
    notes: c?.notes ?? '',
  }
}

function toInput(f: FormState): CompanyInput {
  const t = (v: string) => (v.trim() ? v.trim() : null)
  const digits = (v: string) => (v.replace(/\D/g, '') || null)
  return {
    name: f.name.trim(),
    cnpj: digits(f.cnpj),
    stateRegistration: t(f.stateRegistration),
    type: f.type,
    phone: digits(f.phone),
    phone2: digits(f.phone2),
    phone3: digits(f.phone3),
    email: t(f.email),
    website: t(f.website),
    notes: t(f.notes),
  }
}

function validate(input: CompanyInput): string | null {
  if (!input.name) return 'Informe o nome da empresa.'
  if (input.cnpj && !isValidCnpj(input.cnpj)) return 'CNPJ inválido. Confira os números.'
  for (const [label, v] of [['Telefone fixo 1', input.phone], ['Telefone fixo 2', input.phone2], ['Telefone fixo 3', input.phone3]] as const) {
    if (v && v.length !== 10 && v.length !== 11) return `${label}: use DDD + número.`
  }
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return 'E-mail inválido.'
  if (input.website && !/^https?:\/\//i.test(input.website)) return 'Site: comece com https://'
  return null
}

function Field({ label, htmlFor, children, className = '' }: {
  label: string; htmlFor: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export function CompanyForm({ company, onSubmit, saving, readOnly = false, submitLabel = 'Salvar' }: {
  company?: Company | null
  onSubmit: (input: CompanyInput) => Promise<boolean>
  saving: boolean
  readOnly?: boolean
  submitLabel?: string
}) {
  const [form, setForm] = useState<FormState>(() => fromCompany(company))
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(toInput(fromCompany(company))))
  const [error, setError] = useState<string | null>(null)
  const input = useMemo(() => toInput(form), [form])
  const dirty = JSON.stringify(input) !== snapshot
  useUnsavedGuard(dirty && !saving)

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }))
  const cnpjDigits = form.cnpj.replace(/\D/g, '')
  const cnpjInvalid = cnpjDigits.length === 14 && !isValidCnpj(cnpjDigits)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const problem = validate(input)
    setError(problem)
    if (problem) return
    if (await onSubmit(input)) setSnapshot(JSON.stringify(input))
  }

  const d = readOnly || saving
  const inp = 'h-9'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Identificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <Field label="Nome *" htmlFor="company-name" className="md:col-span-4">
            <Input id="company-name" className={inp} disabled={d} maxLength={160} value={form.name}
              onChange={e => set('name', upperNoAccents(e.target.value))} />
          </Field>
          <Field label="Tipo" htmlFor="company-type" className="md:col-span-2">
            <NativeSelect id="company-type" className={inp} disabled={d} value={form.type}
              onChange={e => set('type', e.target.value as CompanyType)}>
              {(Object.keys(COMPANY_TYPE_LABEL) as CompanyType[]).map(t => (
                <option key={t} value={t}>{COMPANY_TYPE_LABEL[t]}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="CNPJ" htmlFor="company-cnpj" className="md:col-span-3">
            <Input id="company-cnpj" className={inp} disabled={d} inputMode="numeric" placeholder="00.000.000/0000-00"
              value={form.cnpj} aria-invalid={cnpjInvalid || undefined}
              onChange={e => set('cnpj', maskCNPJ(e.target.value))} />
            {cnpjInvalid && <p className="text-xs text-destructive">CNPJ inválido.</p>}
          </Field>
          <Field label="Inscrição estadual" htmlFor="company-ie" className="md:col-span-3">
            <Input id="company-ie" className={inp} disabled={d} maxLength={30} placeholder="Número ou ISENTO"
              value={form.stateRegistration} onChange={e => set('stateRegistration', upperNoAccents(e.target.value))} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Contato</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(['phone', 'phone2', 'phone3'] as const).map((k, i) => (
            <Field key={k} label={`Telefone fixo ${i + 1}`} htmlFor={`company-${k}`}>
              <Input id={`company-${k}`} className={inp} disabled={d} inputMode="tel" placeholder="(00) 0000-0000"
                value={form[k]} onChange={e => set(k, maskPhone(e.target.value))} />
            </Field>
          ))}
          <Field label="E-mail" htmlFor="company-email" className="md:col-span-1">
            <Input id="company-email" type="email" className={inp} disabled={d} maxLength={160}
              value={form.email} onChange={e => set('email', e.target.value)} />
          </Field>
          <Field label="Site" htmlFor="company-website" className="md:col-span-2">
            <Input id="company-website" className={inp} disabled={d} maxLength={300} placeholder="https://"
              value={form.website} onChange={e => set('website', e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Observação</CardTitle></CardHeader>
        <CardContent>
          <Label htmlFor="company-notes" className="sr-only">Observação</Label>
          <Textarea id="company-notes" rows={4} disabled={d} maxLength={4000} placeholder="Anotações internas sobre a empresa"
            value={form.notes} onChange={e => set('notes', e.target.value)} />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      {!readOnly && (
        <div className="flex items-center justify-end gap-3">
          {dirty && company && <span className="text-sm text-muted-foreground">Alterações não salvas</span>}
          <Button type="submit" disabled={saving || (!!company && !dirty)}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  )
}
