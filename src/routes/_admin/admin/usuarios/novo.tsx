import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cloneElement, isValidElement, useId, useState } from 'react'
import { toast } from 'sonner'
import { ApiError, apiFetch } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useCEPLookup, invalidateUserViews, type PaginatedResponse, type UserData } from '@/hooks/useAdmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowLeft, User, FileText, Globe, MapPin, Briefcase, Save } from 'lucide-react'
import { maskCPF, maskPhone, maskCEP, maskRG, maskCNH, maskMoney } from '@/utils/masks'
import { AgeHint } from '@/components/AgeHint'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { CadproFields } from '@/components/CadproFields'
import {
  validatePersonFields, firstInvalidField, focusFieldById,
  type PersonField, type PersonFieldErrors,
} from '@/lib/person-validation'
import { cpfDigits, isValidCpf, sameCpf } from '@/utils/cpf'
import { toIso } from '@/utils/dates'
import { upperNoAccents } from '@/utils/text-format'
import { MEMBER_TYPES } from '@/lib/member-types'
import {
  GENDER_OPTIONS, ETHNICITY_OPTIONS, EDUCATION_OPTIONS,
  MARITAL_STATUS_OPTIONS, CNH_CATEGORY_OPTIONS,
} from '@/lib/user-form-options'

export const Route = createFileRoute('/_admin/admin/usuarios/novo')({
  component: RouteComponent,
})

// ─── helpers ─────────────────────────────────────────────────────────────────

// Liga o rótulo ao campo (clique no rótulo, leitor de tela): injeta um id no
// filho, ou usa `htmlFor` quando o campo está dentro de um wrapper.
function FieldRow({ label, required, htmlFor, error, children }: {
  label: string
  required?: boolean
  htmlFor?: string
  error?: string
  children: React.ReactNode
}) {
  const autoId = useId()
  const id = htmlFor ?? autoId
  const control = !htmlFor && isValidElement<{ id?: string }>(children) && !children.props.id
    ? cloneElement(children, { id })
    : children
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {control}
      {error && <p id={`${id}-erro`} className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  )
}

function SelectField({ id, value, onChange, options, placeholder }: {
  id?: string
  value: string
  onChange: (v: string) => void
  options: readonly { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <NativeSelect
      id={id}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-9"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </NativeSelect>
  )
}

const inp = 'h-9'

// Campos validados antes de enviar, na ordem em que aparecem na tela.
const VALIDATED_FIELDS: readonly PersonField[] = ['cpf', 'name', 'email', 'phone', 'phone2', 'phone3', 'rg', 'driverLicense']
const fieldId = (f: PersonField) => `novo-${f}`

type Form = {
  name: string; nickname: string; email: string
  phone: string; phone2: string; phone3: string
  cpf: string; rg: string; rgIssuer: string; rgIssuedAt: string
  birthDate: string; birthPlace: string; nationality: string
  gender: string; ethnicity: string; maritalStatus: string
  driverLicense: string; driverLicenseCategory: string
  educationLevel: string; functionalCategory: string; cadPro: string[]
  familyIncome: string; specialNeeds: boolean
  memberType: string; memberClassification: string; memberStatus: string
  memberSince: string; membershipValidUntil: string; boardMember: boolean; boardPosition: string
  memberNotes: string; memberNotesNumber: string
  propertyName: string
  address: {
    type: 'URBAN' | 'RURAL'
    zipCode: string; street: string; number: string; neighborhood: string
    city: string; state: string; complement: string; notes: string
    localityName: string; road: string; km: string; lot: string; section: string
  }
}

const emptyForm: Form = {
  name: '', nickname: '', email: '',
  phone: '', phone2: '', phone3: '',
  cpf: '', rg: '', rgIssuer: '', rgIssuedAt: '',
  birthDate: '', birthPlace: '', nationality: '',
  gender: '', ethnicity: '', maritalStatus: '',
  driverLicense: '', driverLicenseCategory: '',
  educationLevel: '', functionalCategory: '', cadPro: [],
  familyIncome: '', specialNeeds: false,
  memberType: '', memberClassification: '', memberStatus: '',
  memberSince: '', membershipValidUntil: '', boardMember: false, boardPosition: '',
  memberNotes: '', memberNotesNumber: '',
  propertyName: 'Principal',
  address: {
    type: 'URBAN',
    zipCode: '', street: '', number: '', neighborhood: '',
    city: '', state: '', complement: '', notes: '',
    localityName: '', road: '', km: '', lot: '', section: '',
  },
}

// Monta o corpo do PATCH da ficha só com os campos preenchidos.
function buildPatchBody(f: Form): Record<string, unknown> {
  const b: Record<string, unknown> = {}
  const put = (k: string, v: unknown) => { if (v !== '' && v !== null && v !== undefined) b[k] = v }
  put('nickname', f.nickname)
  put('phone2', f.phone2.replace(/\D/g, ''))
  put('phone3', f.phone3.replace(/\D/g, ''))
  put('rg', f.rg)
  put('rgIssuer', f.rgIssuer)
  put('rgIssuedAt', f.rgIssuedAt ? toIso(f.rgIssuedAt) : '')
  put('birthDate', f.birthDate ? toIso(f.birthDate) : '')
  put('birthPlace', f.birthPlace)
  put('nationality', f.nationality)
  put('gender', f.gender)
  put('ethnicity', f.ethnicity)
  put('maritalStatus', f.maritalStatus)
  put('driverLicense', f.driverLicense)
  put('driverLicenseCategory', f.driverLicenseCategory)
  put('educationLevel', f.educationLevel)
  put('functionalCategory', f.functionalCategory)
  const cadproClean = f.cadPro.map(s => s.trim()).filter(Boolean)
  if (cadproClean.length) b.cadPro = cadproClean
  put('familyIncome', f.familyIncome.replace(/\D/g, ''))
  if (f.specialNeeds) b.specialNeeds = true
  put('memberType', f.memberType)
  put('memberClassification', f.memberClassification)
  put('memberStatus', f.memberStatus)
  put('memberSince', f.memberSince ? toIso(f.memberSince) : '')
  put('membershipValidUntil', f.membershipValidUntil ? toIso(f.membershipValidUntil) : '')
  if (f.boardMember) b.boardMember = true
  put('boardPosition', f.boardPosition)
  put('memberNotes', f.memberNotes)
  put('memberNotesNumber', f.memberNotesNumber)
  return b
}

// Monta o corpo do endereço só com campos relevantes ao tipo.
function buildAddressBody(a: Form['address']): Record<string, unknown> | null {
  const common = a.type === 'URBAN'
    ? { zipCode: a.zipCode.replace(/\D/g, ''), street: a.street, number: a.number, neighborhood: a.neighborhood, city: a.city, state: a.state, complement: a.complement, notes: a.notes }
    : { localityName: a.localityName, road: a.road, km: a.km, lot: a.lot, section: a.section, city: a.city, state: a.state, notes: a.notes }
  const body: Record<string, unknown> = { type: a.type }
  let hasValue = false
  for (const [k, v] of Object.entries(common)) {
    if (v && String(v).trim()) { body[k] = v; hasValue = true }
  }
  return hasValue ? body : null
}

type ExistingPerson = { id: string; name: string }

// Cadastro ativo com o mesmo CPF (a busca da lista acha o CPF pelos dígitos).
async function findPersonByCpf(digits: string): Promise<ExistingPerson | null> {
  const qs = new URLSearchParams({ page: '1', limit: '5', search: digits })
  const res = await apiFetch(`/admin/users?${qs}`)
  const data = (await res.json()) as PaginatedResponse<UserData>
  const hit = data.data.find(u => sameCpf(u.cpf, digits))
  return hit ? { id: hit.id, name: hit.name } : null
}

const cpfCheckKey = (digits: string | null) => ['admin', 'users', 'cpf-check', digits] as const

// ─── página ──────────────────────────────────────────────────────────────────

function RouteComponent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const cepLookup = useCEPLookup()
  const [form, setForm] = useState<Form>(emptyForm)
  const [errors, setErrors] = useState<PersonFieldErrors>({})
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Guard de não-salvo: dirty se o form mudou e não está salvando.
  const dirty = !saving && JSON.stringify(form) !== JSON.stringify(emptyForm)
  const allowLeave = useUnsavedGuard(dirty)

  // CPF repetido: consulta ao completar um CPF válido (ou ao sair do campo).
  const [cpfToCheck, setCpfToCheck] = useState<string | null>(null)
  const cpfCheck = useQuery({
    queryKey: cpfCheckKey(cpfToCheck),
    queryFn: () => findPersonByCpf(cpfToCheck!),
    enabled: !!cpfToCheck,
  })
  const currentCpf = cpfDigits(form.cpf)
  const checkingThisCpf = !!cpfToCheck && cpfToCheck === currentCpf
  const duplicate = checkingThisCpf ? (cpfCheck.data ?? null) : null

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    // Mexeu no campo: some o erro dele até a próxima tentativa de salvar.
    if (errors[key as PersonField]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }
  function setAddr(k: keyof Form['address'], v: string) {
    setForm(prev => ({ ...prev, address: { ...prev.address, [k]: v } }))
  }

  function handleCpfChange(raw: string) {
    const masked = maskCPF(raw)
    set('cpf', masked)
    const d = cpfDigits(masked)
    if (isValidCpf(d)) setCpfToCheck(d)
  }

  function handleCpfBlur() {
    const d = cpfDigits(form.cpf)
    if (!d) return
    if (!isValidCpf(d)) {
      setErrors(prev => ({ ...prev, cpf: 'CPF inválido. Confira os números.' }))
      return
    }
    setCpfToCheck(d)
  }

  async function handleCEP() {
    if (!form.address.zipCode) return
    try {
      const r = await cepLookup.mutateAsync(form.address.zipCode)
      setForm(prev => ({
        ...prev,
        address: {
          ...prev.address,
          street: r.street ?? prev.address.street,
          neighborhood: r.neighborhood ?? prev.address.neighborhood,
          city: r.city ?? prev.address.city,
          state: r.state ?? prev.address.state,
        },
      }))
    } catch {
      toast.error('CEP não encontrado.')
    }
  }

  function showProblems(problems: PersonFieldErrors, message: string) {
    setErrors(problems)
    setFormMessage(message)
    toast.error(message)
    const first = firstInvalidField(problems, VALIDATED_FIELDS)
    if (first) focusFieldById(fieldId(first))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setFormMessage(null)

    // 1. Tudo o que o backend confere, antes de qualquer requisição: assim não
    //    fica cadastro pela metade por causa de um RG ou CNH inválido.
    const problems = validatePersonFields({
      cpf: form.cpf, name: form.name, email: form.email,
      phone: form.phone, phone2: form.phone2, phone3: form.phone3,
      rg: form.rg, driverLicense: form.driverLicense,
    })
    if (firstInvalidField(problems, VALIDATED_FIELDS)) {
      showProblems(problems, 'Corrija os campos destacados em vermelho.')
      return
    }

    const cpf = cpfDigits(form.cpf)
    // E-mail é opcional e pode repetir entre pessoas (casal, família): vazio não vai.
    const email = form.email.trim() || undefined
    setSaving(true)

    // 2. CPF já usado por outro cadastro (confere de novo aqui caso não tenha
    //    saído do campo). Se a busca falhar, o backend ainda recusa.
    try {
      const byCpf = await queryClient.fetchQuery({ queryKey: cpfCheckKey(cpf), queryFn: () => findPersonByCpf(cpf) })
      setCpfToCheck(cpf)
      if (byCpf) {
        setSaving(false)
        showProblems({}, 'Já existe um cadastro com este CPF.')
        focusFieldById(fieldId('cpf'))
        return
      }
    } catch { /* segue: o backend faz a checagem definitiva */ }

    // 3. Cria a pessoa. Falhou aqui: nada foi gravado, dá para corrigir e tentar de novo.
    let newId: string
    try {
      const res = await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ name: form.name.trim(), email, phone: form.phone.replace(/\D/g, ''), cpf }),
      })
      const created = await res.json()
      newId = created.id
    } catch (err) {
      const msg = apiErrorMessage(err, 'Erro ao cadastrar associado.')
      setFormMessage(msg)
      toast.error(msg)
      setSaving(false)
      // 409 = CPF de outra pessoa (o único dado que não pode repetir).
      if (err instanceof ApiError && err.status === 409) focusFieldById(fieldId('cpf'))
      return
    }

    // 4. Resto da ficha e propriedade. A pessoa já existe: se algo falhar,
    //    abre o cadastro criado e avisa o que faltou (tentar de novo aqui
    //    daria "já cadastrado").
    const failed: string[] = []
    const patchBody = buildPatchBody(form)
    if (Object.keys(patchBody).length > 0) {
      try {
        await apiFetch(`/users/${newId}`, { method: 'PATCH', body: JSON.stringify(patchBody) })
      } catch (err) {
        failed.push(`documentos, perfil e associação (${apiErrorMessage(err, 'erro ao salvar')})`)
      }
    }

    // endereço → vira a propriedade principal do associado
    const addressBody = buildAddressBody(form.address)
    if (addressBody) {
      try {
        const propRes = await apiFetch(`/admin/users/${newId}/properties`, {
          method: 'POST',
          body: JSON.stringify({ name: form.propertyName.trim() || 'Principal', address: addressBody }),
        })
        const prop = await propRes.json()
        try {
          await apiFetch(`/users/${newId}`, { method: 'PATCH', body: JSON.stringify({ primaryPropertyId: prop.id }) })
        } catch {
          failed.push('marcar a propriedade como principal')
        }
      } catch (err) {
        failed.push(`propriedade principal (${apiErrorMessage(err, 'erro ao salvar')})`)
      }
    }

    // Novas listagens (associados/instrutores/etc.) precisam refletir o cadastro.
    invalidateUserViews(queryClient)
    if (failed.length === 0) {
      toast.success('Associado cadastrado com sucesso!')
    } else {
      toast.warning(`Associado cadastrado, mas não foi possível salvar: ${failed.join('; ')}. Complete nesta ficha.`, { duration: 20000 })
    }
    allowLeave()
    navigate({ to: '/admin/usuarios/$id', params: { id: newId } })
  }

  const isUrban = form.address.type === 'URBAN'
  // "Abrir cadastro" do CPF repetido: se só o CPF foi digitado, sai sem perguntar.
  const onlyCpfTyped = JSON.stringify({ ...form, cpf: '' }) === JSON.stringify(emptyForm)
  const invalid = (f: PersonField) => ({
    id: fieldId(f),
    'aria-invalid': errors[f] ? true : undefined,
    'aria-describedby': errors[f] ? `${fieldId(f)}-erro` : undefined,
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" className="size-8" asChild>
          <Link to="/admin/usuarios" aria-label="Voltar"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Novo associado</h1>
          <p className="text-sm text-muted-foreground">Cadastre a ficha completa de uma vez</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {/* Dados pessoais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><User className="size-4" /> Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* CPF primeiro: já avisa se a pessoa tem cadastro antes de preencher o resto */}
            <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FieldRow label="CPF" required htmlFor={fieldId('cpf')} error={errors.cpf}>
                  <Input
                    className={inp}
                    {...invalid('cpf')}
                    autoFocus
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.cpf}
                    onChange={e => handleCpfChange(e.target.value)}
                    onBlur={handleCpfBlur}
                    placeholder="000.000.000-00"
                  />
                </FieldRow>
              </div>
              {checkingThisCpf && cpfCheck.isFetching && !duplicate && (
                <p className="text-xs text-muted-foreground">Verificando se o CPF já tem cadastro…</p>
              )}
              {duplicate && (
                <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
                  <span className="flex items-center gap-1.5 text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    Já existe um cadastro com este CPF: <strong>{duplicate.name}</strong>
                  </span>
                  <Link
                    to="/admin/usuarios/$id"
                    params={{ id: duplicate.id }}
                    onClick={() => { if (onlyCpfTyped) allowLeave() }}
                    className="font-medium text-primary hover:underline"
                  >
                    Abrir cadastro
                  </Link>
                </div>
              )}
            </div>
            <FieldRow label="Nome" required htmlFor={fieldId('name')} error={errors.name}>
              <Input className={inp} {...invalid('name')} value={form.name} onChange={e => set('name', upperNoAccents(e.target.value))} />
            </FieldRow>
            <FieldRow label="Apelido">
              <Input className={inp} value={form.nickname} onChange={e => set('nickname', upperNoAccents(e.target.value))} />
            </FieldRow>
            <FieldRow label="E-mail" htmlFor={fieldId('email')} error={errors.email}>
              <Input className={inp} {...invalid('email')} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </FieldRow>
            <FieldRow label="Telefone" required htmlFor={fieldId('phone')} error={errors.phone}>
              <Input className={inp} {...invalid('phone')} inputMode="tel" value={form.phone} onChange={e => set('phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
            </FieldRow>
            <FieldRow label="Telefone 2" htmlFor={fieldId('phone2')} error={errors.phone2}>
              <Input className={inp} {...invalid('phone2')} inputMode="tel" value={form.phone2} onChange={e => set('phone2', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
            </FieldRow>
            <FieldRow label="Telefone 3" htmlFor={fieldId('phone3')} error={errors.phone3}>
              <Input className={inp} {...invalid('phone3')} inputMode="tel" value={form.phone3} onChange={e => set('phone3', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
            </FieldRow>
            <FieldRow label="Data nascimento" htmlFor="novo-birthDate">
              <DatePicker id="novo-birthDate" value={form.birthDate} onChange={v => set('birthDate', v)} />
              <AgeHint birthDate={form.birthDate} />
            </FieldRow>
            <FieldRow label="Naturalidade">
              <Input className={inp} value={form.birthPlace} onChange={e => set('birthPlace', upperNoAccents(e.target.value))} />
            </FieldRow>
            <FieldRow label="Nacionalidade">
              <Input className={inp} value={form.nationality} onChange={e => set('nationality', upperNoAccents(e.target.value))} />
            </FieldRow>
            <FieldRow label="Gênero">
              <SelectField value={form.gender} onChange={v => set('gender', v)} placeholder="Selecione" options={GENDER_OPTIONS} />
            </FieldRow>
            <FieldRow label="Etnia">
              <SelectField value={form.ethnicity} onChange={v => set('ethnicity', v)} placeholder="Selecione" options={ETHNICITY_OPTIONS} />
            </FieldRow>
            <FieldRow label="Estado civil">
              <SelectField value={form.maritalStatus} onChange={v => set('maritalStatus', v)} placeholder="Selecione" options={MARITAL_STATUS_OPTIONS} />
            </FieldRow>
          </CardContent>
        </Card>

        {/* Documentos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><FileText className="size-4" /> Documentos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FieldRow label="RG" htmlFor={fieldId('rg')} error={errors.rg}>
              <Input className={inp} {...invalid('rg')} value={form.rg} onChange={e => set('rg', maskRG(e.target.value))} placeholder="00.000.000-0" maxLength={12} />
            </FieldRow>
            <FieldRow label="Órgão emissor RG">
              <Input className={inp} value={form.rgIssuer} onChange={e => set('rgIssuer', upperNoAccents(e.target.value))} />
            </FieldRow>
            <FieldRow label="Data emissão RG">
              <DatePicker value={form.rgIssuedAt} onChange={v => set('rgIssuedAt', v)} />
            </FieldRow>
            <FieldRow label="CNH" htmlFor={fieldId('driverLicense')} error={errors.driverLicense}>
              <Input className={inp} {...invalid('driverLicense')} value={form.driverLicense} onChange={e => {
                const v = maskCNH(e.target.value)
                set('driverLicense', v)
                if (!v) set('driverLicenseCategory', '')
              }} placeholder="00000000000" inputMode="numeric" maxLength={11} />
            </FieldRow>
            {form.driverLicense && (
              <FieldRow label="Categoria CNH">
                <SelectField value={form.driverLicenseCategory} onChange={v => set('driverLicenseCategory', v)} placeholder="Selecione" options={CNH_CATEGORY_OPTIONS} />
              </FieldRow>
            )}
          </CardContent>
        </Card>

        {/* Perfil social */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Globe className="size-4" /> Perfil social</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FieldRow label="Escolaridade">
              <SelectField value={form.educationLevel} onChange={v => set('educationLevel', v)} placeholder="Selecione" options={EDUCATION_OPTIONS} />
            </FieldRow>
            <FieldRow label="Categoria funcional">
              <Input className={inp} value={form.functionalCategory} onChange={e => set('functionalCategory', upperNoAccents(e.target.value))} />
            </FieldRow>
            <FieldRow label="CAD/PRO (até 5)">
              <CadproFields value={form.cadPro} onChange={v => set('cadPro', v)} />
            </FieldRow>
            <FieldRow label="Renda familiar">
              <Input className={inp} value={form.familyIncome} onChange={e => set('familyIncome', maskMoney(e.target.value))} placeholder="R$ 0,00" inputMode="numeric" />
            </FieldRow>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="specialNeeds" checked={form.specialNeeds} onChange={e => set('specialNeeds', e.target.checked)} className="accent-primary" />
              <Label htmlFor="specialNeeds" className="text-sm cursor-pointer">Necessidades especiais</Label>
            </div>
          </CardContent>
        </Card>

        {/* Propriedade principal (endereço) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><MapPin className="size-4" /> Propriedade principal</CardTitle>
            <p className="text-xs text-muted-foreground">O endereço do associado é registrado como sua propriedade principal.</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FieldRow label="Nome da propriedade">
              <Input className={inp} value={form.propertyName} onChange={e => set('propertyName', upperNoAccents(e.target.value))} placeholder="Principal" />
            </FieldRow>
            <FieldRow label="Tipo">
              <SelectField value={form.address.type} onChange={v => setAddr('type', v)} options={[
                { value: 'URBAN', label: 'Urbano' },
                { value: 'RURAL', label: 'Rural' },
              ]} />
            </FieldRow>
            {isUrban ? (
              <>
                <FieldRow label="CEP" htmlFor="novo-cep">
                  <div className="flex gap-2">
                    <Input id="novo-cep" className={inp} inputMode="numeric" value={form.address.zipCode} onChange={e => setAddr('zipCode', maskCEP(e.target.value))} placeholder="00000-000" />
                    <Button type="button" size="sm" variant="outline" disabled={!form.address.zipCode || cepLookup.isPending} onClick={handleCEP} className="shrink-0">
                      {cepLookup.isPending ? '...' : 'Buscar'}
                    </Button>
                  </div>
                </FieldRow>
                <FieldRow label="Logradouro"><Input className={inp} value={form.address.street} onChange={e => setAddr('street', upperNoAccents(e.target.value))} /></FieldRow>
                <FieldRow label="Número"><Input className={inp} value={form.address.number} onChange={e => setAddr('number', e.target.value)} /></FieldRow>
                <FieldRow label="Bairro"><Input className={inp} value={form.address.neighborhood} onChange={e => setAddr('neighborhood', upperNoAccents(e.target.value))} /></FieldRow>
                <FieldRow label="Cidade"><Input className={inp} value={form.address.city} onChange={e => setAddr('city', upperNoAccents(e.target.value))} /></FieldRow>
                <FieldRow label="Estado"><Input className={inp} value={form.address.state} onChange={e => setAddr('state', upperNoAccents(e.target.value))} maxLength={2} placeholder="PR" /></FieldRow>
                <FieldRow label="Complemento"><Input className={inp} value={form.address.complement} onChange={e => setAddr('complement', upperNoAccents(e.target.value))} /></FieldRow>
                <FieldRow label="Observações"><Input className={inp} value={form.address.notes} onChange={e => setAddr('notes', upperNoAccents(e.target.value))} /></FieldRow>
              </>
            ) : (
              <>
                <FieldRow label="Nome da localidade"><Input className={inp} value={form.address.localityName} onChange={e => setAddr('localityName', upperNoAccents(e.target.value))} /></FieldRow>
                <FieldRow label="Estrada / Via"><Input className={inp} value={form.address.road} onChange={e => setAddr('road', upperNoAccents(e.target.value))} /></FieldRow>
                <FieldRow label="KM"><Input className={inp} value={form.address.km} onChange={e => setAddr('km', e.target.value)} /></FieldRow>
                <FieldRow label="Lote"><Input className={inp} value={form.address.lot} onChange={e => setAddr('lot', e.target.value)} /></FieldRow>
                <FieldRow label="Seção"><Input className={inp} value={form.address.section} onChange={e => setAddr('section', e.target.value)} /></FieldRow>
                <FieldRow label="Cidade"><Input className={inp} value={form.address.city} onChange={e => setAddr('city', upperNoAccents(e.target.value))} /></FieldRow>
                <FieldRow label="Estado"><Input className={inp} value={form.address.state} onChange={e => setAddr('state', upperNoAccents(e.target.value))} maxLength={2} placeholder="PR" /></FieldRow>
                <FieldRow label="Observações"><Input className={inp} value={form.address.notes} onChange={e => setAddr('notes', upperNoAccents(e.target.value))} /></FieldRow>
              </>
            )}
          </CardContent>
        </Card>

        {/* Associação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Briefcase className="size-4" /> Associação</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FieldRow label="Tipo de membro">
              <SelectField value={form.memberType} onChange={v => set('memberType', v)} placeholder="Selecione" options={MEMBER_TYPES} />
            </FieldRow>
            <FieldRow label="Classificação"><Input className={inp} value={form.memberClassification} onChange={e => set('memberClassification', upperNoAccents(e.target.value))} /></FieldRow>
            <FieldRow label="Situação">
              <SelectField value={form.memberStatus} onChange={v => set('memberStatus', v)} placeholder="Selecione" options={[
                { value: 'ACTIVE', label: 'Ativo' },
                { value: 'INACTIVE', label: 'Inativo' },
              ]} />
            </FieldRow>
            <FieldRow label="Associado desde"><DatePicker value={form.memberSince} onChange={v => set('memberSince', v)} /></FieldRow>
            <FieldRow label="Validade da associação"><DatePicker value={form.membershipValidUntil} onChange={v => set('membershipValidUntil', v)} /></FieldRow>
            <FieldRow label="Nº cooperado"><Input className={inp} value={form.memberNotesNumber} onChange={e => set('memberNotesNumber', e.target.value)} /></FieldRow>
            <FieldRow label="Observações"><Input className={inp} value={form.memberNotes} onChange={e => set('memberNotes', upperNoAccents(e.target.value))} /></FieldRow>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="boardMember" checked={form.boardMember} onChange={e => set('boardMember', e.target.checked)} className="accent-primary" />
              <Label htmlFor="boardMember" className="text-sm cursor-pointer">Membro da diretoria</Label>
            </div>
            {form.boardMember && (
              <FieldRow label="Cargo na diretoria"><Input className={inp} value={form.boardPosition} onChange={e => set('boardPosition', upperNoAccents(e.target.value))} /></FieldRow>
            )}
          </CardContent>
        </Card>

        {formMessage && (
          <p className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
            <AlertCircle className="size-4 shrink-0" /> {formMessage}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pb-4">
          <Button type="button" variant="outline" asChild>
            <Link to="/admin/usuarios">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="size-4" />
            {saving ? 'Cadastrando...' : 'Cadastrar associado'}
          </Button>
        </div>
      </form>
    </div>
  )
}
