import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ApiError, apiFetch, apiUpload } from '@/lib/api'
import { resizeToSquare } from '@/utils/resize-image'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useCEPLookup, invalidateUserViews, type PaginatedResponse, type UserData } from '@/hooks/useAdmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowLeft, Camera, User, FileText, Globe, MapPin, Briefcase, Save, Upload, X } from 'lucide-react'
import { maskCPF, maskCEP } from '@/utils/masks'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { AjudaLink } from '@/components/ajuda/AjudaLink'
import { CameraDialog } from '@/components/cadastro/CameraDialog'
import { InitialsAvatar } from '@/components/InitialsAvatar'
import {
  validatePersonFields, firstInvalidField, focusFieldById,
  type PersonField as CampoValidado, type PersonFieldErrors,
} from '@/lib/person-validation'
import { cpfDigits, isValidCpf, sameCpf } from '@/utils/cpf'
import { toIso } from '@/utils/dates'
import { upperNoAccents } from '@/utils/text-format'
import { FieldRow, PersonField, SelectField } from '@/components/cadastro/person-form-fields'
import type { PersonFieldsCtx } from '@/lib/person-fields'
import { CIN_HINT, CPF_LABEL } from '@/lib/cin'

export const Route = createFileRoute('/_admin/admin/usuarios/novo')({
  component: RouteComponent,
})

// ─── helpers ─────────────────────────────────────────────────────────────────

// Liga o rótulo ao campo (clique no rótulo, leitor de tela): injeta um id no
// filho, ou usa `htmlFor` quando o campo está dentro de um wrapper.

const inp = 'h-9'

// Campos validados antes de enviar, na ordem em que aparecem na tela.
const VALIDATED_FIELDS: readonly CampoValidado[] = ['cpf', 'name', 'email', 'phone', 'phone2', 'phone3', 'rg', 'driverLicense']
const fieldId = (f: CampoValidado) => `novo-${f}`

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
  // A foto fica guardada aqui até a pessoa existir: o upload precisa do id.
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const arquivoRef = useRef<HTMLInputElement>(null)

  async function usarFoto(arquivo: File) {
    try {
      // Mesmo recorte quadrado do avatar da ficha, para a foto do balcão não
      // sair esticada.
      const quadrada = await resizeToSquare(arquivo)
      setFoto(quadrada)
      // Libera a prévia anterior: tirar várias fotos seguidas deixaria uma
      // fila de blobs presos na memória da aba.
      setFotoPreview(anterior => {
        if (anterior) URL.revokeObjectURL(anterior)
        return URL.createObjectURL(quadrada)
      })
    } catch {
      toast.error('Não foi possível usar esta imagem.')
    }
    setCameraOpen(false)
  }

  function limparFoto() {
    setFoto(null)
    setFotoPreview(anterior => {
      if (anterior) URL.revokeObjectURL(anterior)
      return null
    })
  }


  // Guard de não-salvo: dirty se o form mudou e não está salvando. A foto
  // entra na conta — ela é estado à parte, e sair sem salvar a perde.
  const dirty = !saving && (foto !== null || JSON.stringify(form) !== JSON.stringify(emptyForm))
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
    if (errors[key as CampoValidado]) setErrors(prev => ({ ...prev, [key]: undefined }))
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

    // A foto só pode subir depois: o upload precisa do id da pessoa.
    if (foto) {
      try {
        await apiUpload(`/admin/users/${newId}/avatar`, foto)
      } catch (err) {
        failed.push(`a foto (${apiErrorMessage(err, 'erro ao enviar')})`)
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
  const invalid = (f: CampoValidado) => ({
    id: fieldId(f),
    'aria-invalid': errors[f] ? true : undefined,
    'aria-describedby': errors[f] ? `${fieldId(f)}-erro` : undefined,
  })

  // Os campos de pessoa sao os mesmos da ficha (usuarios/$id): rotulo, mascara
  // e lista de opcoes vem de person-form-fields.tsx. Aqui so o que e desta tela.
  const campos: PersonFieldsCtx = {
    values: form,
    // `set` desta tela e generico sobre o Form inteiro (que tem os campos do
    // endereco tambem); a ponte para os campos de pessoa fica aqui.
    set: (campo, valor) => set(campo, valor as never),
    errors,
    idPrefix: 'novo-',
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" className="size-8" asChild>
          <Link to="/admin/usuarios" aria-label="Voltar"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div>
          <div className="flex items-center gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Novo associado</h1>
            <AjudaLink topico="usuarios" titulo="Novo associado" />
          </div>
          <p className="text-sm text-muted-foreground">Cadastre a ficha completa de uma vez</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {/* Foto: no balcão a pessoa está ali na frente, então a hora de tirar
            é agora. Deixar para depois é, na prática, ficar sem foto. */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 pt-6">
            {fotoPreview ? (
              <img src={fotoPreview} alt="Foto do associado" className="size-20 rounded-full object-cover" />
            ) : (
              <InitialsAvatar name={form.name} size="lg" />
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-11 gap-2" onClick={() => setCameraOpen(true)}>
                <Camera className="size-4" /> {foto ? 'Tirar outra' : 'Tirar foto'}
              </Button>
              <Button type="button" variant="outline" className="h-11 gap-2" onClick={() => arquivoRef.current?.click()}>
                <Upload className="size-4" /> Escolher arquivo
              </Button>
              {foto && (
                <Button type="button" variant="ghost" className="h-11 gap-2 text-muted-foreground" onClick={limparFoto}>
                  <X className="size-4" /> Tirar foto do cadastro
                </Button>
              )}
              <input
                ref={arquivoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const arquivo = e.target.files?.[0]
                  e.target.value = ''
                  if (arquivo) void usarFoto(arquivo)
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dados pessoais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><User className="size-4" /> Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* CPF primeiro: já avisa se a pessoa tem cadastro antes de preencher o resto */}
            <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FieldRow label={CPF_LABEL} required htmlFor={fieldId('cpf')} error={errors.cpf}>
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
                  <p className="text-xs text-muted-foreground">{CIN_HINT}</p>
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
            <PersonField campo="name" ctx={campos} required />
            <PersonField campo="nickname" ctx={campos} />
            <PersonField campo="email" ctx={campos} />
            <PersonField campo="phone" ctx={campos} required />
            <PersonField campo="phone2" ctx={campos} />
            <PersonField campo="phone3" ctx={campos} />
            <PersonField campo="birthDate" ctx={campos} />
            <PersonField campo="birthPlace" ctx={campos} />
            <PersonField campo="nationality" ctx={campos} />
            <PersonField campo="gender" ctx={campos} />
            <PersonField campo="ethnicity" ctx={campos} />
            <PersonField campo="maritalStatus" ctx={campos} />
          </CardContent>
        </Card>

        {/* Documentos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><FileText className="size-4" /> Documentos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <PersonField campo="rg" ctx={campos} />
            <PersonField campo="rgIssuer" ctx={campos} />
            <PersonField campo="rgIssuedAt" ctx={campos} />
            <PersonField campo="driverLicense" ctx={campos} />
            {form.driverLicense && <PersonField campo="driverLicenseCategory" ctx={campos} />}
          </CardContent>
        </Card>

        {/* Perfil social */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Globe className="size-4" /> Perfil social</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <PersonField campo="educationLevel" ctx={campos} />
            <PersonField campo="functionalCategory" ctx={campos} />
            <PersonField campo="cadPro" ctx={campos} />
            <PersonField campo="familyIncome" ctx={campos} />
            <PersonField campo="specialNeeds" ctx={campos} />
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
            <PersonField campo="memberType" ctx={campos} />
            <PersonField campo="memberClassification" ctx={campos} />
            <PersonField campo="memberStatus" ctx={campos} />
            <PersonField campo="memberSince" ctx={campos} />
            <PersonField campo="membershipValidUntil" ctx={campos} />
            <PersonField campo="memberNotesNumber" ctx={campos} />
            <div className="sm:col-span-2 lg:col-span-3">
              <PersonField campo="memberNotes" ctx={campos} />
            </div>
            <PersonField campo="boardMember" ctx={campos} />
            {form.boardMember && <PersonField campo="boardPosition" ctx={campos} />}
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

      <CameraDialog open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={f => void usarFoto(f)} />
    </div>
  )
}
