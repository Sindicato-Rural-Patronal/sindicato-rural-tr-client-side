import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useCEPLookup } from '@/hooks/useAdmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, User, FileText, Globe, MapPin, Briefcase, Save } from 'lucide-react'
import { maskCPF, maskPhone, maskCEP, maskRG, maskCNH, maskMoney } from '@/utils/masks'
import { ageLabel } from '@/utils/age'

export const Route = createFileRoute('/_admin/admin/usuarios/novo')({
  component: RouteComponent,
})

// ─── helpers ─────────────────────────────────────────────────────────────────

function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}

function SelectField({ value, onChange, options, placeholder }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background h-9"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function toIso(date: string): string | null {
  if (!date) return null
  return new Date(date).toISOString()
}

const inp = 'h-9'

type Form = {
  name: string; nickname: string; email: string
  phone: string; phone2: string; phone3: string
  cpf: string; cnpj: string; rg: string; rgIssuer: string; rgIssuedAt: string
  birthDate: string; birthPlace: string; nationality: string
  gender: string; ethnicity: string; maritalStatus: string
  driverLicense: string; driverLicenseCategory: string
  educationLevel: string; functionalCategory: string; cadPro: string
  familyIncome: string; specialNeeds: boolean
  memberType: string; memberClassification: string; memberStatus: string
  memberSince: string; boardMember: boolean; boardPosition: string
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
  cpf: '', cnpj: '', rg: '', rgIssuer: '', rgIssuedAt: '',
  birthDate: '', birthPlace: '', nationality: '',
  gender: '', ethnicity: '', maritalStatus: '',
  driverLicense: '', driverLicenseCategory: '',
  educationLevel: '', functionalCategory: '', cadPro: '',
  familyIncome: '', specialNeeds: false,
  memberType: '', memberClassification: '', memberStatus: '',
  memberSince: '', boardMember: false, boardPosition: '',
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
  put('cnpj', f.cnpj)
  put('phone2', f.phone2)
  put('phone3', f.phone3)
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
  put('cadPro', f.cadPro)
  put('familyIncome', f.familyIncome.replace(/\D/g, ''))
  if (f.specialNeeds) b.specialNeeds = true
  put('memberType', f.memberType)
  put('memberClassification', f.memberClassification)
  put('memberStatus', f.memberStatus)
  put('memberSince', f.memberSince ? toIso(f.memberSince) : '')
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

// ─── página ──────────────────────────────────────────────────────────────────

function RouteComponent() {
  const navigate = useNavigate()
  const cepLookup = useCEPLookup()
  const [form, setForm] = useState<Form>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }
  function setAddr(k: keyof Form['address'], v: string) {
    setForm(prev => ({ ...prev, address: { ...prev.address, [k]: v } }))
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cpfDigits = form.cpf.replace(/\D/g, '')
    const phoneDigits = form.phone.replace(/\D/g, '')
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    if (!form.email.trim()) { setError('E-mail é obrigatório.'); return }
    if (cpfDigits.length !== 11) { setError('CPF inválido.'); return }
    if (![10, 11].includes(phoneDigits.length)) { setError('Telefone inválido.'); return }

    setSaving(true)
    try {
      // 1. cria o associado (campos base)
      const res = await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), phone: phoneDigits, cpf: cpfDigits }),
      })
      const created = await res.json()
      const newId: string = created.id

      // 2. preenche o resto da ficha
      const patchBody = buildPatchBody(form)
      if (Object.keys(patchBody).length > 0) {
        await apiFetch(`/users/${newId}`, { method: 'PATCH', body: JSON.stringify(patchBody) })
      }

      // 3. endereço → vira a propriedade principal do associado
      const addressBody = buildAddressBody(form.address)
      if (addressBody) {
        const propRes = await apiFetch(`/admin/users/${newId}/properties`, {
          method: 'POST',
          body: JSON.stringify({ name: form.propertyName.trim() || 'Principal', address: addressBody }),
        })
        const prop = await propRes.json()
        // marca a propriedade recém-criada como principal
        await apiFetch(`/users/${newId}`, {
          method: 'PATCH',
          body: JSON.stringify({ primaryPropertyId: prop.id }),
        })
      }

      toast.success('Associado cadastrado com sucesso!')
      navigate({ to: '/admin/usuarios/$id', params: { id: newId } })
    } catch (err) {
      const msg = apiErrorMessage(err, 'Erro ao cadastrar associado.')
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const isUrban = form.address.type === 'URBAN'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" className="size-8" asChild>
          <Link to="/admin/usuarios"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Novo associado</h1>
          <p className="text-sm text-muted-foreground">Cadastre a ficha completa de uma vez</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Dados pessoais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><User className="size-4" /> Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FieldRow label="Nome" required>
              <Input className={inp} value={form.name} onChange={e => set('name', e.target.value)} />
            </FieldRow>
            <FieldRow label="Apelido">
              <Input className={inp} value={form.nickname} onChange={e => set('nickname', e.target.value)} />
            </FieldRow>
            <FieldRow label="E-mail" required>
              <Input className={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </FieldRow>
            <FieldRow label="Telefone" required>
              <Input className={inp} value={form.phone} onChange={e => set('phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
            </FieldRow>
            <FieldRow label="Telefone 2">
              <Input className={inp} value={form.phone2} onChange={e => set('phone2', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
            </FieldRow>
            <FieldRow label="Telefone 3">
              <Input className={inp} value={form.phone3} onChange={e => set('phone3', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
            </FieldRow>
            <FieldRow label={`Data nascimento${ageLabel(form.birthDate) ? ` — ${ageLabel(form.birthDate)}` : ''}`}>
              <DatePicker value={form.birthDate} onChange={v => set('birthDate', v)} />
            </FieldRow>
            <FieldRow label="Naturalidade">
              <Input className={inp} value={form.birthPlace} onChange={e => set('birthPlace', e.target.value)} />
            </FieldRow>
            <FieldRow label="Nacionalidade">
              <Input className={inp} value={form.nationality} onChange={e => set('nationality', e.target.value)} />
            </FieldRow>
            <FieldRow label="Gênero">
              <SelectField value={form.gender} onChange={v => set('gender', v)} placeholder="Selecione" options={[
                { value: 'MALE', label: 'Masculino' },
                { value: 'FEMALE', label: 'Feminino' },
                { value: 'OTHER', label: 'Outro' },
              ]} />
            </FieldRow>
            <FieldRow label="Etnia">
              <SelectField value={form.ethnicity} onChange={v => set('ethnicity', v)} placeholder="Selecione" options={[
                { value: 'WHITE', label: 'Branca' },
                { value: 'BLACK', label: 'Preta' },
                { value: 'MIXED', label: 'Parda' },
                { value: 'ASIAN', label: 'Amarela' },
                { value: 'INDIGENOUS', label: 'Indígena' },
              ]} />
            </FieldRow>
            <FieldRow label="Estado civil">
              <SelectField value={form.maritalStatus} onChange={v => set('maritalStatus', v)} placeholder="Selecione" options={[
                { value: 'SINGLE', label: 'Solteiro(a)' },
                { value: 'MARRIED', label: 'Casado(a)' },
                { value: 'DIVORCED', label: 'Divorciado(a)' },
                { value: 'WIDOWED', label: 'Viúvo(a)' },
                { value: 'DOMESTIC_PARTNERSHIP', label: 'União estável' },
              ]} />
            </FieldRow>
          </CardContent>
        </Card>

        {/* Documentos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><FileText className="size-4" /> Documentos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FieldRow label="CPF" required>
              <Input className={inp} value={form.cpf} onChange={e => set('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" />
            </FieldRow>
            <FieldRow label="CNPJ">
              <Input className={inp} value={form.cnpj} onChange={e => set('cnpj', e.target.value)} />
            </FieldRow>
            <FieldRow label="RG">
              <Input className={inp} value={form.rg} onChange={e => set('rg', maskRG(e.target.value))} placeholder="00.000.000-0" maxLength={12} />
            </FieldRow>
            <FieldRow label="Órgão emissor RG">
              <Input className={inp} value={form.rgIssuer} onChange={e => set('rgIssuer', e.target.value)} />
            </FieldRow>
            <FieldRow label="Data emissão RG">
              <DatePicker value={form.rgIssuedAt} onChange={v => set('rgIssuedAt', v)} />
            </FieldRow>
            <FieldRow label="CNH">
              <Input className={inp} value={form.driverLicense} onChange={e => {
                const v = maskCNH(e.target.value)
                set('driverLicense', v)
                if (!v) set('driverLicenseCategory', '')
              }} placeholder="00000000000" inputMode="numeric" maxLength={11} />
            </FieldRow>
            {form.driverLicense && (
              <FieldRow label="Categoria CNH">
                <SelectField value={form.driverLicenseCategory} onChange={v => set('driverLicenseCategory', v)} placeholder="Selecione" options={[
                  { value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'C', label: 'C' },
                  { value: 'D', label: 'D' }, { value: 'E', label: 'E' }, { value: 'AB', label: 'AB' },
                  { value: 'AC', label: 'AC' }, { value: 'AD', label: 'AD' }, { value: 'AE', label: 'AE' },
                ]} />
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
              <SelectField value={form.educationLevel} onChange={v => set('educationLevel', v)} placeholder="Selecione" options={[
                { value: 'NO_FORMAL_EDUCATION', label: 'Sem escolaridade' },
                { value: 'INCOMPLETE_PRIMARY', label: 'Fund. incompleto' },
                { value: 'COMPLETE_PRIMARY', label: 'Fund. completo' },
                { value: 'INCOMPLETE_SECONDARY', label: 'Médio incompleto' },
                { value: 'COMPLETE_SECONDARY', label: 'Médio completo' },
                { value: 'INCOMPLETE_HIGHER', label: 'Superior incompleto' },
                { value: 'COMPLETE_HIGHER', label: 'Superior completo' },
                { value: 'POSTGRADUATE', label: 'Pós-graduação' },
              ]} />
            </FieldRow>
            <FieldRow label="Categoria funcional">
              <Input className={inp} value={form.functionalCategory} onChange={e => set('functionalCategory', e.target.value)} />
            </FieldRow>
            <FieldRow label="CAD-PRO">
              <Input className={inp} value={form.cadPro} onChange={e => set('cadPro', e.target.value)} />
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
              <Input className={inp} value={form.propertyName} onChange={e => set('propertyName', e.target.value)} placeholder="Principal" />
            </FieldRow>
            <FieldRow label="Tipo">
              <SelectField value={form.address.type} onChange={v => setAddr('type', v)} options={[
                { value: 'URBAN', label: 'Urbano' },
                { value: 'RURAL', label: 'Rural' },
              ]} />
            </FieldRow>
            {isUrban ? (
              <>
                <FieldRow label="CEP">
                  <div className="flex gap-2">
                    <Input className={inp} value={form.address.zipCode} onChange={e => setAddr('zipCode', maskCEP(e.target.value))} placeholder="00000-000" />
                    <Button type="button" size="sm" variant="outline" disabled={!form.address.zipCode || cepLookup.isPending} onClick={handleCEP} className="shrink-0">
                      {cepLookup.isPending ? '...' : 'Buscar'}
                    </Button>
                  </div>
                </FieldRow>
                <FieldRow label="Logradouro"><Input className={inp} value={form.address.street} onChange={e => setAddr('street', e.target.value)} /></FieldRow>
                <FieldRow label="Número"><Input className={inp} value={form.address.number} onChange={e => setAddr('number', e.target.value)} /></FieldRow>
                <FieldRow label="Bairro"><Input className={inp} value={form.address.neighborhood} onChange={e => setAddr('neighborhood', e.target.value)} /></FieldRow>
                <FieldRow label="Cidade"><Input className={inp} value={form.address.city} onChange={e => setAddr('city', e.target.value)} /></FieldRow>
                <FieldRow label="Estado"><Input className={inp} value={form.address.state} onChange={e => setAddr('state', e.target.value)} maxLength={2} placeholder="PR" /></FieldRow>
                <FieldRow label="Complemento"><Input className={inp} value={form.address.complement} onChange={e => setAddr('complement', e.target.value)} /></FieldRow>
                <FieldRow label="Observações"><Input className={inp} value={form.address.notes} onChange={e => setAddr('notes', e.target.value)} /></FieldRow>
              </>
            ) : (
              <>
                <FieldRow label="Nome da localidade"><Input className={inp} value={form.address.localityName} onChange={e => setAddr('localityName', e.target.value)} /></FieldRow>
                <FieldRow label="Estrada / Via"><Input className={inp} value={form.address.road} onChange={e => setAddr('road', e.target.value)} /></FieldRow>
                <FieldRow label="KM"><Input className={inp} value={form.address.km} onChange={e => setAddr('km', e.target.value)} /></FieldRow>
                <FieldRow label="Lote"><Input className={inp} value={form.address.lot} onChange={e => setAddr('lot', e.target.value)} /></FieldRow>
                <FieldRow label="Seção"><Input className={inp} value={form.address.section} onChange={e => setAddr('section', e.target.value)} /></FieldRow>
                <FieldRow label="Cidade"><Input className={inp} value={form.address.city} onChange={e => setAddr('city', e.target.value)} /></FieldRow>
                <FieldRow label="Estado"><Input className={inp} value={form.address.state} onChange={e => setAddr('state', e.target.value)} maxLength={2} placeholder="PR" /></FieldRow>
                <FieldRow label="Observações"><Input className={inp} value={form.address.notes} onChange={e => setAddr('notes', e.target.value)} /></FieldRow>
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
            <FieldRow label="Tipo de membro"><Input className={inp} value={form.memberType} onChange={e => set('memberType', e.target.value)} /></FieldRow>
            <FieldRow label="Classificação"><Input className={inp} value={form.memberClassification} onChange={e => set('memberClassification', e.target.value)} /></FieldRow>
            <FieldRow label="Situação">
              <SelectField value={form.memberStatus} onChange={v => set('memberStatus', v)} placeholder="Selecione" options={[
                { value: 'ACTIVE', label: 'Ativo' },
                { value: 'INACTIVE', label: 'Inativo' },
              ]} />
            </FieldRow>
            <FieldRow label="Associado desde"><DatePicker value={form.memberSince} onChange={v => set('memberSince', v)} /></FieldRow>
            <FieldRow label="Nº cooperado"><Input className={inp} value={form.memberNotesNumber} onChange={e => set('memberNotesNumber', e.target.value)} /></FieldRow>
            <FieldRow label="Observações"><Input className={inp} value={form.memberNotes} onChange={e => set('memberNotes', e.target.value)} /></FieldRow>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="boardMember" checked={form.boardMember} onChange={e => set('boardMember', e.target.checked)} className="accent-primary" />
              <Label htmlFor="boardMember" className="text-sm cursor-pointer">Membro da diretoria</Label>
            </div>
            {form.boardMember && (
              <FieldRow label="Cargo na diretoria"><Input className={inp} value={form.boardPosition} onChange={e => set('boardPosition', e.target.value)} /></FieldRow>
            )}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

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
