import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  useAdminUser, useUpdateWorker, useDeleteWorker, useUploadAvatar,
  useUserProperties, useCreateUserProperty, useDeleteUserProperty,
  useUserRelations, useCreateUserRelation, useDeleteUserRelation,
  useAdminUsers,
  usePromoteInstructor, useRemoveInstructor, useUpdateInstructor,
  type UserDataDetail, type UserRelation,
} from '@/hooks/useAdmin'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { CadproFields } from '@/components/CadproFields'
import { PropertiesManager } from '@/components/cadastro/PropertiesManager'
import { PersonCompanies } from '@/components/cadastro/PersonCompanies'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { NativeSelect } from '@/components/ui/native-select'
import { Pagination } from '@/components/ui/pagination'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertCircle, ArrowLeft, Camera, CheckCircle2, Save, Plus, Trash2, Building2, Eye,
  User, FileText, Globe, Briefcase, Heart, TreePine,
  Pencil, X, GraduationCap, ImageUp, Download, Loader2,
} from 'lucide-react'
import { maskCPF, maskPhone, maskRG, maskCNH, maskMoney } from '@/utils/masks'
import { AgeHint } from '@/components/AgeHint'
import { ApiError } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error-message'
import { downloadExport, type ExportDataset, type ExportParams } from '@/lib/export'
import {
  validatePersonFields, firstInvalidField, focusFieldById,
  type PersonField, type PersonFieldErrors,
} from '@/lib/person-validation'
import { cn } from '@/lib/utils'
import { cpfDigits } from '@/utils/cpf'
import { toIso } from '@/utils/dates'
import { upperNoAccents } from '@/utils/text-format'
import { MEMBER_TYPES } from '@/lib/member-types'
import {
  GENDER_OPTIONS, ETHNICITY_OPTIONS, EDUCATION_OPTIONS,
  MARITAL_STATUS_OPTIONS, CNH_CATEGORY_OPTIONS,
} from '@/lib/user-form-options'

export const Route = createFileRoute('/_admin/admin/usuarios/$id')({
  // ?completar=1 abre direto o modo "Completar cadastro" (link dos cadastros incompletos).
  validateSearch: (s: Record<string, unknown>): { completar?: number } => {
    const completar = Number(s.completar)
    return { completar: Number.isInteger(completar) ? completar : undefined }
  },
  component: RouteComponent,
})

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function FieldRow({ label, children, highlight, htmlFor, error }: {
  label: string
  children: React.ReactNode
  highlight?: boolean
  /** id do campo — liga o rótulo e a mensagem de erro a ele. */
  htmlFor?: string
  error?: string
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${highlight ? 'rounded-lg p-2.5 -mx-2.5 bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-300 dark:ring-amber-700' : ''}`}>
      <Label htmlFor={htmlFor} className={`text-xs font-medium ${highlight ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
        {label}{highlight && <span className="ml-1 text-amber-500">*</span>}
      </Label>
      {children}
      {error && <p id={htmlFor ? `${htmlFor}-erro` : undefined} className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  )
}

// Modo leitura: os campos ficam desabilitados, mas com o texto nítido (o padrão
// do Input é 50% de opacidade, difícil de ler) e um fundo leve.
const READ_MODE_FIELD = 'disabled:opacity-100 disabled:cursor-default disabled:bg-muted/40 dark:disabled:bg-muted/40'

// Campos validados antes de salvar, na ordem em que aparecem na tela.
const VALIDATED_FIELDS: readonly PersonField[] = ['name', 'email', 'phone', 'phone2', 'phone3', 'cpf', 'rg', 'driverLicense']
const fieldId = (f: PersonField) => `pessoa-${f}`

type MissingField = { key: string; label: string }

function getMissingFields(user: UserDataDetail, hasNoProperties: boolean): MissingField[] {
  const missing: MissingField[] = []
  if (!user.avatar) missing.push({ key: 'avatar', label: 'Foto de perfil' })
  if (!user.cpf) missing.push({ key: 'cpf', label: 'CPF' })
  if (!user.rg) missing.push({ key: 'rg', label: 'RG' })
  if (!user.birthDate) missing.push({ key: 'birthDate', label: 'Data de nascimento' })
  if (!user.gender) missing.push({ key: 'gender', label: 'Gênero' })
  if (hasNoProperties) missing.push({ key: 'properties', label: 'Propriedade' })
  return missing
}

function SelectField({
  value, onChange, options, placeholder, disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <NativeSelect
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={cn('h-9', disabled && 'disabled:cursor-default disabled:bg-muted/40')}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </NativeSelect>
  )
}

// ─── Seção Dados Pessoais ─────────────────────────────────────────────────────

type DadosForm = {
  name: string; email: string; nickname: string; maritalStatus: string
  phone: string; phone2: string; phone3: string
  cpf: string; rg: string; rgIssuer: string; rgIssuedAt: string
  birthDate: string; driverLicense: string; driverLicenseCategory: string
  birthPlace: string; nationality: string; gender: string; ethnicity: string
  educationLevel: string; functionalCategory: string; specialNeeds: boolean
  memberClassification: string; cadPro: string[]; familyIncome: string
  memberType: string; boardPosition: string; boardMember: boolean
  memberSince: string; membershipValidUntil: string; memberNotes: string; memberNotesNumber: string
  avatar: string
}

function dadosFromDetail(u: UserDataDetail): DadosForm {
  return {
    name: u.name ?? '',
    email: u.email ?? '',
    nickname: u.nickname ?? '',
    maritalStatus: u.maritalStatus ?? '',
    // Backend guarda só dígitos: o formulário mostra com máscara.
    phone: maskPhone(u.phone ?? ''),
    phone2: maskPhone(u.phone2 ?? ''),
    phone3: maskPhone(u.phone3 ?? ''),
    cpf: maskCPF(u.cpf ?? ''),
    rg: u.rg ?? '',
    rgIssuer: u.rgIssuer ?? '',
    rgIssuedAt: toDateInput(u.rgIssuedAt),
    birthDate: toDateInput(u.birthDate),
    driverLicense: u.driverLicense ?? '',
    driverLicenseCategory: u.driverLicenseCategory ?? '',
    birthPlace: u.birthPlace ?? '',
    nationality: u.nationality ?? '',
    gender: u.gender ?? '',
    ethnicity: u.ethnicity ?? '',
    educationLevel: u.educationLevel ?? '',
    functionalCategory: u.functionalCategory ?? '',
    specialNeeds: u.specialNeeds ?? false,
    memberClassification: u.memberClassification ?? '',
    cadPro: u.cadPro ?? [],
    familyIncome: maskMoney(u.familyIncome ?? ''),
    memberType: u.memberType ?? '',
    boardPosition: u.boardPosition ?? '',
    boardMember: u.boardMember ?? false,
    memberSince: toDateInput(u.memberSince),
    membershipValidUntil: toDateInput(u.membershipValidUntil),
    memberNotes: u.memberNotes ?? '',
    memberNotesNumber: u.memberNotesNumber ?? '',
    avatar: u.avatar ?? '',
  }
}

function CameraDialog({ open, onClose, onCapture }: {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Ao abrir, começa sem foto nem erro da vez anterior (ajustado no render; a
  // câmera em si continua no efeito abaixo).
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setCaptured(null)
      setError(null)
    }
  }

  useEffect(() => {
    if (!open) return
    let active = true
    let localStream: MediaStream | null = null
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(s => {
        // Resolveu depois do dialog fechar/desmontar → não deixa a câmera ligada.
        if (!active) { s.getTracks().forEach(t => t.stop()); return }
        localStream = s
        setStream(s)
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play()
        }
      })
      .catch(() => { if (active) setError('Câmera não disponível ou permissão negada.') })
    return () => {
      active = false
      localStream?.getTracks().forEach(t => t.stop())
      setStream(null)
    }
  }, [open])

  function stopStream(s: MediaStream | null) {
    s?.getTracks().forEach(t => t.stop())
  }

  function handleClose() {
    stopStream(stream)
    setStream(null)
    setCaptured(null)
    setError(null)
    onClose()
  }

  function capture() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    setCaptured(canvas.toDataURL('image/jpeg', 0.92))
  }

  function confirm() {
    if (!captured) return
    fetch(captured)
      .then(r => r.blob())
      .then(blob => {
        onCapture(new File([blob], 'camera.jpg', { type: 'image/jpeg' }))
        handleClose()
      })
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Camera className="size-4" /> Tirar foto</DialogTitle>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive py-4 text-center">{error}</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {!captured ? (
              <>
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                </div>
                <Button onClick={capture} size="lg" className="w-full">
                  <Camera className="size-4 mr-2" />Tirar foto
                </Button>
              </>
            ) : (
              <>
                <div className="w-full aspect-square rounded-xl overflow-hidden">
                  <img src={captured} alt="preview" className="w-full h-full object-cover scale-x-[-1]" />
                </div>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" className="flex-1" onClick={() => setCaptured(null)}>Tirar novamente</Button>
                  <Button className="flex-1" onClick={confirm}>Usar esta foto</Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DadosTab({ userId, user, completeMode, onCompleteModeEnd, hasNoProperties, visible, allowLeaveRef }: {
  userId: string
  user: UserDataDetail
  completeMode: boolean
  onCompleteModeEnd: () => void
  hasNoProperties: boolean
  /** A aba fica montada (para não perder a edição ao trocar de aba); a barra de salvar só aparece com ela visível. */
  visible: boolean
  /** Recebe o allowLeave do aviso de não salvo — a exclusão da pessoa navega sem perguntar. */
  allowLeaveRef: React.RefObject<(() => void) | null>
}) {
  const queryClient = useQueryClient()
  const updateWorker = useUpdateWorker(userId)
  const uploadAvatar = useUploadAvatar(userId)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [manualEditing, setEditing] = useState(false)
  // "Completar cadastro" já abre em edição; Cancelar/Salvar encerram os dois juntos.
  const editing = manualEditing || completeMode
  const [form, setForm] = useState<DadosForm>(() => dadosFromDetail(user))
  const [saved, setSaved] = useState<DadosForm>(() => dadosFromDetail(user))
  const [fieldErrors, setFieldErrors] = useState<PersonFieldErrors>({})

  const promote = usePromoteInstructor(userId)
  const demote = useRemoveInstructor(userId)
  const updateInstructor = useUpdateInstructor(userId)
  const [wantInstructor, setWantInstructor] = useState(false)
  const [instrBio, setInstrBio] = useState(user.userInstructor?.bio ?? '')
  const [instrLinkedin, setInstrLinkedin] = useState(user.userInstructor?.linkedin ?? '')
  const [instrInstagram, setInstrInstagram] = useState(user.userInstructor?.instagram ?? '')
  const [instrFacebook, setInstrFacebook] = useState(user.userInstructor?.facebook ?? '')

  // Trocou de pessoa sem desmontar: recarrega o formulário com o cadastro novo.
  const [formUserId, setFormUserId] = useState(user.id)
  if (user.id !== formUserId) {
    setFormUserId(user.id)
    const d = dadosFromDetail(user)
    setForm(d)
    setSaved(d)
    setFieldErrors({})
    setInstrBio(user.userInstructor?.bio ?? '')
    setInstrLinkedin(user.userInstructor?.linkedin ?? '')
    setInstrInstagram(user.userInstructor?.instagram ?? '')
    setInstrFacebook(user.userInstructor?.facebook ?? '')
  }
  // Ao entrar em edição, os campos de instrutor partem dos dados atuais.
  const [wasEditing, setWasEditing] = useState(editing)
  if (editing !== wasEditing) {
    setWasEditing(editing)
    if (editing && user.userInstructor) {
      setInstrBio(user.userInstructor.bio ?? '')
      setInstrLinkedin(user.userInstructor.linkedin ?? '')
      setInstrInstagram(user.userInstructor.instagram ?? '')
      setInstrFacebook(user.userInstructor.facebook ?? '')
    }
  }

  const isInstructor = !!user.userInstructor
  // Salvar pode disparar update de worker E/OU promoção/atualização de instrutor;
  // desabilita o botão enquanto qualquer uma estiver em andamento.
  const saving = updateWorker.isPending || promote.isPending || updateInstructor.isPending || demote.isPending

  // Guard de não-salvo (avisa antes de atualizar/fechar a aba com edição pendente).
  // Inclui os campos de instrutor — que vivem em estado separado — para não perder
  // silenciosamente uma edição só da bio/redes.
  const instrDirty =
    wantInstructor ||
    instrBio !== (user.userInstructor?.bio ?? '') ||
    instrLinkedin !== (user.userInstructor?.linkedin ?? '') ||
    instrInstagram !== (user.userInstructor?.instagram ?? '') ||
    instrFacebook !== (user.userInstructor?.facebook ?? '')
  const dirty = editing && (JSON.stringify(form) !== JSON.stringify(saved) || instrDirty)
  const allowLeave = useUnsavedGuard(dirty)
  useEffect(() => {
    allowLeaveRef.current = allowLeave
  }, [allowLeaveRef, allowLeave])

  function set(k: keyof DadosForm, v: string | boolean) {
    setForm(prev => ({ ...prev, [k]: v }))
    // Mexeu no campo: some o erro dele até a próxima tentativa de salvar.
    if (fieldErrors[k as PersonField]) setFieldErrors(prev => ({ ...prev, [k]: undefined }))
  }

  function resizeToSquare(file: File, size = 400): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('canvas toBlob failed')); return }
          resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
        }, 'image/jpeg', 0.85)
      }
      img.onerror = reject
      img.src = url
    })
  }

  async function uploadAvatarFile(file: File) {
    try {
      const resized = await resizeToSquare(file)
      const res = await uploadAvatar.mutateAsync(resized)
      const data = await res.json()
      if (data.avatarUrl) {
        // Upload é persistido imediatamente no servidor: reflete o novo avatar
        // também no baseline `saved` para o Cancelar não parecer desfazê-lo.
        set('avatar', data.avatarUrl)
        setSaved(prev => ({ ...prev, avatar: data.avatarUrl }))
      }
    } catch {
      toast.error('Erro ao fazer upload do avatar.')
    }
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadAvatarFile(file)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  async function handleCameraCapture(file: File) {
    await uploadAvatarFile(file)
  }

  function handleCancel() {
    setForm(saved)
    setFieldErrors({})
    setWantInstructor(false)
    setInstrBio(user.userInstructor?.bio ?? '')
    setInstrLinkedin(user.userInstructor?.linkedin ?? '')
    setInstrInstagram(user.userInstructor?.instagram ?? '')
    setInstrFacebook(user.userInstructor?.facebook ?? '')
    setEditing(false)
    if (completeMode) onCompleteModeEnd()
  }

  async function handleSave() {
    // Valida só o que mudou (o que vai no corpo): um dado antigo fora do padrão
    // que ninguém mexeu não trava a edição. Apagar nome, e-mail, telefone ou CPF
    // conta como mudança — e esses são obrigatórios.
    const changed: Partial<Record<PersonField, string>> = {}
    for (const f of VALIDATED_FIELDS) {
      if (form[f] !== saved[f]) changed[f] = form[f]
    }
    const problems = validatePersonFields(changed)
    const first = firstInvalidField(problems, VALIDATED_FIELDS)
    setFieldErrors(problems)
    if (first) {
      toast.error('Corrija os campos destacados antes de salvar.')
      focusFieldById(fieldId(first))
      return
    }
    // Corpo completo a partir de um snapshot do form (mesmo mapeamento do backend)
    const buildBody = (f: DadosForm): Parameters<typeof updateWorker.mutateAsync>[0] => ({
      name: f.name.trim() || undefined,
      email: f.email.trim() || undefined,
      phone: f.phone.replace(/\D/g, '') || undefined,
      cpf: cpfDigits(f.cpf) || undefined,
      nickname: f.nickname || null,
      maritalStatus: (f.maritalStatus as UserDataDetail['maritalStatus']) || null,
      phone2: f.phone2.replace(/\D/g, '') || null,
      phone3: f.phone3.replace(/\D/g, '') || null,
      rg: f.rg || null,
      rgIssuer: f.rgIssuer || null,
      rgIssuedAt: f.rgIssuedAt ? toIso(f.rgIssuedAt) : null,
      birthDate: f.birthDate ? toIso(f.birthDate) : null,
      driverLicense: f.driverLicense || null,
      driverLicenseCategory: f.driverLicenseCategory || null,
      birthPlace: f.birthPlace || null,
      nationality: f.nationality || null,
      gender: (f.gender as UserDataDetail['gender']) || null,
      ethnicity: (f.ethnicity as UserDataDetail['ethnicity']) || null,
      educationLevel: (f.educationLevel as UserDataDetail['educationLevel']) || null,
      functionalCategory: f.functionalCategory || null,
      specialNeeds: f.specialNeeds,
      memberClassification: f.memberClassification || null,
      cadPro: f.cadPro.map(s => s.trim()).filter(Boolean),
      familyIncome: f.familyIncome.replace(/\D/g, '') || null,
      memberType: f.memberType || null,
      boardPosition: f.boardPosition || null,
      boardMember: f.boardMember,
      memberSince: f.memberSince ? toIso(f.memberSince) : null,
      membershipValidUntil: f.membershipValidUntil ? toIso(f.membershipValidUntil) : null,
      memberNotes: f.memberNotes || null,
      memberNotesNumber: f.memberNotesNumber || null,
      avatar: f.avatar || null,
    })
    try {
      // Envia SÓ o que mudou: um campo legado inválido (ex: CPF antigo fora do
      // padrão) não pode derrubar a edição de um campo não relacionado.
      const bodyNow = buildBody(form)
      const bodyOld = buildBody(saved)
      const body: Record<string, unknown> = {}
      for (const key of Object.keys(bodyNow) as (keyof typeof bodyNow)[]) {
        if (bodyNow[key] !== bodyOld[key]) body[key] = bodyNow[key]
      }
      if (Object.keys(body).length > 0) {
        await updateWorker.mutateAsync(body as Parameters<typeof updateWorker.mutateAsync>[0])
      }
      queryClient.setQueryData<UserDataDetail>(['admin', 'users', userId], (old) => {
        if (!old) return old
        return {
          ...old,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.replace(/\D/g, ''),
          cpf: cpfDigits(form.cpf) || null,
          rg: form.rg || null,
          birthDate: form.birthDate ? toIso(form.birthDate) : null,
          gender: (form.gender as UserDataDetail['gender']) || null,
          avatar: form.avatar || null,
          nickname: form.nickname || null,
          maritalStatus: (form.maritalStatus as UserDataDetail['maritalStatus']) || null,
          phone2: form.phone2.replace(/\D/g, '') || null,
          phone3: form.phone3.replace(/\D/g, '') || null,
          rgIssuer: form.rgIssuer || null,
          rgIssuedAt: form.rgIssuedAt ? toIso(form.rgIssuedAt) : null,
          driverLicense: form.driverLicense || null,
          driverLicenseCategory: form.driverLicenseCategory || null,
          birthPlace: form.birthPlace || null,
          nationality: form.nationality || null,
          ethnicity: (form.ethnicity as UserDataDetail['ethnicity']) || null,
          educationLevel: (form.educationLevel as UserDataDetail['educationLevel']) || null,
          functionalCategory: form.functionalCategory || null,
          specialNeeds: form.specialNeeds,
          memberClassification: form.memberClassification || null,
          cadPro: form.cadPro.map(s => s.trim()).filter(Boolean),
          familyIncome: form.familyIncome.replace(/\D/g, '') || null,
          memberType: form.memberType || null,
          boardPosition: form.boardPosition || null,
          boardMember: form.boardMember,
          memberSince: form.memberSince ? toIso(form.memberSince) : null,
          membershipValidUntil: form.membershipValidUntil ? toIso(form.membershipValidUntil) : null,
          memberNotes: form.memberNotes || null,
          memberNotesNumber: form.memberNotesNumber || null,
        }
      })
      if (isInstructor) {
        await updateInstructor.mutateAsync({
          bio: instrBio || undefined,
          linkedin: instrLinkedin || null,
          instagram: instrInstagram || null,
          facebook: instrFacebook || null,
        })
      } else if (wantInstructor) {
        await promote.mutateAsync(instrBio || undefined)
        if (instrLinkedin || instrInstagram || instrFacebook) {
          await updateInstructor.mutateAsync({
            linkedin: instrLinkedin || null,
            instagram: instrInstagram || null,
            facebook: instrFacebook || null,
          })
        }
      }
      toast.success('Dados salvos com sucesso!')
      setSaved(form)
      setWantInstructor(false)
      setEditing(false)
      if (completeMode) onCompleteModeEnd()
    } catch (e) {
      const msg = apiErrorMessage(e, 'Erro ao salvar.')
      // CPF/RG de outro cadastro: aponta o campo, além do aviso.
      const conflictField: PersonField | null = e instanceof ApiError && e.status === 409
        ? (e.message === 'CPF already in use' ? 'cpf' : e.message === 'RG already in use' ? 'rg' : null)
        : null
      if (conflictField) {
        setFieldErrors({ [conflictField]: msg })
        focusFieldById(fieldId(conflictField))
      }
      toast.error(msg)
    }
  }

  const d = !editing
  const inp = cn('h-9', d && READ_MODE_FIELD)
  const textareaCls = cn(
    'rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background w-full resize-none',
    d && READ_MODE_FIELD,
  )
  // Liga rótulo, campo e mensagem de erro dos campos validados.
  const invalidProps = (f: PersonField) => ({
    id: fieldId(f),
    'aria-invalid': fieldErrors[f] ? true : undefined,
    'aria-describedby': fieldErrors[f] ? `${fieldId(f)}-erro` : undefined,
  })

  // campos faltando (calculados em tempo real a partir do form atual)
  const missing = {
    avatar: !form.avatar,
    cpf: !form.cpf,
    rg: !form.rg,
    birthDate: !form.birthDate,
    gender: !form.gender,
    properties: hasNoProperties,
  }
  const missingLabels: Record<string, string> = {
    avatar: 'Foto de perfil',
    cpf: 'CPF',
    rg: 'RG',
    birthDate: 'Data de nascimento',
    gender: 'Gênero',
    properties: 'Propriedade',
  }
  const missingCount = Object.values(missing).filter(Boolean).length
  const hi = (key: keyof typeof missing) => completeMode && missing[key]

  return (
    // Em edição, espaço no fim para a barra fixa de salvar não cobrir os últimos campos.
    <div className={cn('flex flex-col gap-6', editing && 'pb-24')}>
      {/* Banner modo completar cadastro */}
      {completeMode && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {missingCount > 0
                ? `${missingCount} campo${missingCount > 1 ? 's' : ''} necessário${missingCount > 1 ? 's' : ''} para completar o cadastro`
                : 'Cadastro completo!'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(missing).map(([key, isMissing]) => (
              <span
                key={key}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isMissing
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 line-through opacity-60'
                }`}
              >
                {isMissing ? null : <CheckCircle2 className="size-3" />}
                {missingLabels[key]}
              </span>
            ))}
          </div>
          {missing.properties && (
            <p className="text-xs text-amber-700 dark:text-amber-400 pl-1">
              Cadastre ao menos uma propriedade na aba <strong>Propriedades</strong>.
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
            <Pencil className="size-3.5" /> Editar
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-1.5">
              <X className="size-3.5" /> Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5"
            >
              <Save className="size-3.5" />
              {saving ? 'Salvando...' : 'Salvar dados'}
            </Button>
          </>
        )}
      </div>
      {/* Identificação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><User className="size-4" /> Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FieldRow label="Nome *" htmlFor={fieldId('name')} error={fieldErrors.name}>
            <Input className={inp} disabled={d} {...invalidProps('name')} value={form.name} onChange={e => set('name', upperNoAccents(e.target.value))} />
          </FieldRow>
          <FieldRow label="E-mail *" htmlFor={fieldId('email')} error={fieldErrors.email}>
            <Input className={inp} disabled={d} {...invalidProps('email')} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </FieldRow>
          <FieldRow label="Apelido" htmlFor="pessoa-nickname">
            <Input id="pessoa-nickname" className={inp} disabled={d} value={form.nickname} onChange={e => set('nickname', upperNoAccents(e.target.value))} />
          </FieldRow>
          <FieldRow label="Foto de perfil" highlight={hi('avatar')}>
            <div className="flex items-center gap-3">
              {form.avatar
                ? <img src={form.avatar} alt="" className="size-16 rounded-full object-cover shrink-0 border" />
                : <div className="size-16 rounded-full bg-muted flex items-center justify-center border shrink-0"><User className="size-7 text-muted-foreground" /></div>
              }
              {editing && (
                <div className="flex flex-col gap-2">
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                  <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={uploadAvatar.isPending} onClick={() => avatarInputRef.current?.click()}>
                    <ImageUp className="size-3.5 mr-1.5" />{uploadAvatar.isPending ? 'Enviando...' : 'Galeria'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={uploadAvatar.isPending} onClick={() => setShowCamera(true)}>
                    <Camera className="size-3.5 mr-1.5" />Câmera
                  </Button>
                </div>
              )}
            </div>
            <CameraDialog open={showCamera} onClose={() => setShowCamera(false)} onCapture={handleCameraCapture} />
          </FieldRow>
          <FieldRow label="Telefone *" htmlFor={fieldId('phone')} error={fieldErrors.phone}>
            <Input className={inp} disabled={d} {...invalidProps('phone')} inputMode="tel" value={form.phone} onChange={e => set('phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
          </FieldRow>
          {(form.phone || form.phone2) && (
            <FieldRow label="Telefone 2" htmlFor={fieldId('phone2')} error={fieldErrors.phone2}>
              <Input className={inp} disabled={d} {...invalidProps('phone2')} inputMode="tel" value={form.phone2} onChange={e => set('phone2', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
            </FieldRow>
          )}
          {(form.phone2 || form.phone3) && (
            <FieldRow label="Telefone 3" htmlFor={fieldId('phone3')} error={fieldErrors.phone3}>
              <Input className={inp} disabled={d} {...invalidProps('phone3')} inputMode="tel" value={form.phone3} onChange={e => set('phone3', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
            </FieldRow>
          )}
          <FieldRow label="Estado civil">
            <SelectField disabled={d} value={form.maritalStatus} onChange={v => set('maritalStatus', v)} placeholder="Selecione" options={MARITAL_STATUS_OPTIONS} />
          </FieldRow>
        </CardContent>
      </Card>

      {/* Documentos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><FileText className="size-4" /> Documentos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FieldRow label="CPF" highlight={hi('cpf')} htmlFor={fieldId('cpf')} error={fieldErrors.cpf}>
            <Input className={inp} disabled={d} {...invalidProps('cpf')} inputMode="numeric" value={form.cpf} onChange={e => set('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" />
          </FieldRow>
          <FieldRow label="RG" highlight={hi('rg')} htmlFor={fieldId('rg')} error={fieldErrors.rg}>
            <Input className={inp} disabled={d} {...invalidProps('rg')} value={form.rg} onChange={e => set('rg', maskRG(e.target.value))} placeholder="00.000.000-0" maxLength={12} />
          </FieldRow>
          <FieldRow label="Órgão emissor RG">
            <Input className={inp} disabled={d} value={form.rgIssuer} onChange={e => set('rgIssuer', upperNoAccents(e.target.value))} />
          </FieldRow>
          <FieldRow label="Data emissão RG">
            <DatePicker disabled={d} className={cn(d && READ_MODE_FIELD)} value={form.rgIssuedAt} onChange={v => set('rgIssuedAt', v)} />
          </FieldRow>
          <FieldRow label="Data nascimento" highlight={hi('birthDate')}>
            <DatePicker disabled={d} className={cn(d && READ_MODE_FIELD)} value={form.birthDate} onChange={v => set('birthDate', v)} />
            <AgeHint birthDate={form.birthDate} />
          </FieldRow>
          <FieldRow label="CNH" htmlFor={fieldId('driverLicense')} error={fieldErrors.driverLicense}>
            <Input className={inp} disabled={d} {...invalidProps('driverLicense')} value={form.driverLicense} onChange={e => {
              const v = maskCNH(e.target.value)
              set('driverLicense', v)
              if (!v) set('driverLicenseCategory', '')
            }} placeholder="00000000000" inputMode="numeric" maxLength={11} />
          </FieldRow>
          {form.driverLicense && (
            <FieldRow label="Categoria CNH">
              <SelectField disabled={d} value={form.driverLicenseCategory} onChange={v => set('driverLicenseCategory', v)} placeholder="Selecione" options={CNH_CATEGORY_OPTIONS} />
            </FieldRow>
          )}
        </CardContent>
      </Card>

      {/* Origem e Perfil */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Globe className="size-4" /> Origem e Perfil</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FieldRow label="Naturalidade">
            <Input className={inp} disabled={d} value={form.birthPlace} onChange={e => set('birthPlace', upperNoAccents(e.target.value))} />
          </FieldRow>
          <FieldRow label="Nacionalidade">
            <Input className={inp} disabled={d} value={form.nationality} onChange={e => set('nationality', upperNoAccents(e.target.value))} />
          </FieldRow>
          <FieldRow label="Gênero" highlight={hi('gender')}>
            <SelectField disabled={d} value={form.gender} onChange={v => set('gender', v)} placeholder="Selecione" options={GENDER_OPTIONS} />
          </FieldRow>
          <FieldRow label="Etnia">
            <SelectField disabled={d} value={form.ethnicity} onChange={v => set('ethnicity', v)} placeholder="Selecione" options={ETHNICITY_OPTIONS} />
          </FieldRow>
          <FieldRow label="Escolaridade">
            <SelectField disabled={d} value={form.educationLevel} onChange={v => set('educationLevel', v)} placeholder="Selecione" options={EDUCATION_OPTIONS} />
          </FieldRow>
          <FieldRow label="Categoria funcional">
            <Input className={inp} disabled={d} value={form.functionalCategory} onChange={e => set('functionalCategory', upperNoAccents(e.target.value))} />
          </FieldRow>
          <FieldRow label="CAD/PRO (até 5)">
            {/* CadproFields não recebe classe: o modo leitura legível vem do seletor no wrapper */}
            <div className={cn(d && '[&_input:disabled]:opacity-100 [&_input:disabled]:bg-muted/40')}>
              <CadproFields value={form.cadPro} onChange={v => setForm(p => ({ ...p, cadPro: v }))} disabled={d} />
            </div>
          </FieldRow>
          <FieldRow label="Renda familiar">
            <Input className={inp} disabled={d} value={form.familyIncome} onChange={e => set('familyIncome', maskMoney(e.target.value))} placeholder="R$ 0,00" inputMode="numeric" />
          </FieldRow>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="specialNeeds" disabled={d} checked={form.specialNeeds} onChange={e => set('specialNeeds', e.target.checked)} className="accent-primary disabled:cursor-default" />
            <Label htmlFor="specialNeeds" className={`text-sm ${d ? '' : 'cursor-pointer'}`}>Necessidades especiais</Label>
          </div>
        </CardContent>
      </Card>

      {/* Associação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Briefcase className="size-4" /> Associação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FieldRow label="Classificação">
            <Input className={inp} disabled={d} value={form.memberClassification} onChange={e => set('memberClassification', upperNoAccents(e.target.value))} />
          </FieldRow>
          <FieldRow label="Tipo de membro">
            <SelectField disabled={d} value={form.memberType} onChange={v => set('memberType', v)} placeholder="Selecione" options={MEMBER_TYPES} />
          </FieldRow>
          <FieldRow label="Associado desde">
            <DatePicker disabled={d} className={cn(d && READ_MODE_FIELD)} value={form.memberSince} onChange={v => set('memberSince', v)} />
          </FieldRow>
          <FieldRow label="Validade da associação">
            <DatePicker disabled={d} className={cn(d && READ_MODE_FIELD)} value={form.membershipValidUntil} onChange={v => set('membershipValidUntil', v)} />
          </FieldRow>
          <FieldRow label="Nº observação">
            <Input className={inp} disabled={d} value={form.memberNotesNumber} onChange={e => set('memberNotesNumber', e.target.value)} />
          </FieldRow>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="boardMember" disabled={d} checked={form.boardMember} onChange={e => set('boardMember', e.target.checked)} className="accent-primary disabled:cursor-default" />
            <Label htmlFor="boardMember" className={`text-sm ${d ? '' : 'cursor-pointer'}`}>Membro da diretoria</Label>
          </div>
          {form.boardMember && (
            <FieldRow label="Cargo na diretoria">
              <Input className={inp} disabled={d} value={form.boardPosition} onChange={e => set('boardPosition', upperNoAccents(e.target.value))} />
            </FieldRow>
          )}
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldRow label="Observações">
              <textarea
                disabled={d}
                value={form.memberNotes}
                onChange={e => set('memberNotes', upperNoAccents(e.target.value))}
                rows={3}
                className={textareaCls}
              />
            </FieldRow>
          </div>
        </CardContent>
      </Card>

      {/* Instrutor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="size-4" /> Instrutor</CardTitle>
        </CardHeader>
        <CardContent>
          {isInstructor ? (
            <div className="flex flex-col gap-4">
              <Badge variant="secondary" className="w-fit">Instrutor ativo</Badge>
              <div className="grid grid-cols-1 gap-4">
                <FieldRow label="Bio">
                  <textarea
                    value={instrBio}
                    disabled={d}
                    onChange={e => setInstrBio(e.target.value)}
                    rows={3}
                    className={textareaCls}
                  />
                </FieldRow>
                <FieldRow label="LinkedIn">
                  <Input className={inp} disabled={d} value={instrLinkedin} onChange={e => setInstrLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
                </FieldRow>
                <FieldRow label="Instagram">
                  <Input className={inp} disabled={d} value={instrInstagram} onChange={e => setInstrInstagram(e.target.value)} placeholder="https://instagram.com/..." />
                </FieldRow>
                <FieldRow label="Facebook">
                  <Input className={inp} disabled={d} value={instrFacebook} onChange={e => setInstrFacebook(e.target.value)} placeholder="https://facebook.com/..." />
                </FieldRow>
              </div>
              {editing && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-fit"
                  disabled={demote.isPending}
                  onClick={async () => {
                    try {
                      await demote.mutateAsync()
                      toast.success('Status de instrutor removido.')
                    } catch (e) {
                      toast.error(apiErrorMessage(e, 'Erro ao remover status de instrutor.'))
                    }
                  }}
                >
                  {demote.isPending ? 'Removendo...' : 'Remover status de instrutor'}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {editing ? (
                <>
                  <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={wantInstructor}
                      onChange={e => setWantInstructor(e.target.checked)}
                      className="accent-primary"
                    />
                    Tornar este usuário instrutor
                  </label>
                  {wantInstructor && (
                    <div className="grid grid-cols-1 gap-4">
                      <FieldRow label="Bio">
                        <textarea
                          value={instrBio}
                          onChange={e => setInstrBio(e.target.value)}
                          placeholder="Bio (opcional)"
                          rows={3}
                          className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background w-full resize-none"
                        />
                      </FieldRow>
                      <FieldRow label="LinkedIn">
                        <Input className={inp} value={instrLinkedin} onChange={e => setInstrLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
                      </FieldRow>
                      <FieldRow label="Instagram">
                        <Input className={inp} value={instrInstagram} onChange={e => setInstrInstagram(e.target.value)} placeholder="https://instagram.com/..." />
                      </FieldRow>
                      <FieldRow label="Facebook">
                        <Input className={inp} value={instrFacebook} onChange={e => setInstrFacebook(e.target.value)} placeholder="https://facebook.com/..." />
                      </FieldRow>
                      <p className="text-xs text-muted-foreground">A promoção é aplicada ao salvar o formulário.</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Usuário não é instrutor.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Barra de salvar fixa no rodapé da tela durante a edição: Salvar/Cancelar
          sempre à mão, mesmo rolando a ficha. Fixa (não sticky) porque o <main>
          do layout tem overflow; o recuo à esquerda acompanha a largura da
          sidebar e o conteúdo fica à esquerda, longe dos avisos (canto direito). */}
      {editing && visible && (
        <div
          role="region"
          aria-label="Salvar alterações"
          className="fixed inset-x-0 bottom-0 z-5 border-t bg-background/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur supports-backdrop-filter:bg-background/85 md:pl-[calc(var(--sidebar-width)+1.5rem)] md:group-has-data-[collapsible=icon]/sidebar-wrapper:pl-[calc(var(--sidebar-width-icon)+1.5rem)]"
        >
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {dirty && (
              <span className="flex w-full items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 sm:w-auto">
                <AlertCircle className="size-4 shrink-0" /> Alterações não salvas
              </span>
            )}
            <Button variant="outline" onClick={handleCancel} disabled={saving} className="gap-1.5">
              <X className="size-4" /> Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              <Save className="size-4" />
              {saving ? 'Salvando...' : 'Salvar dados'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Seção Propriedades ───────────────────────────────────────────────────────

function PropriedadesTab({ userId }: { userId: string }) {
  const [page, setPage] = useState(1)
  const limit = 10
  const { data: resp, isLoading } = useUserProperties(userId, { page, limit })
  const total = resp?.total ?? 0
  const totalPages = resp ? Math.ceil(total / limit) : 1
  const createProp = useCreateUserProperty(userId)
  const deleteProp = useDeleteUserProperty(userId)
  const { data: user } = useAdminUser(userId)
  const updateWorker = useUpdateWorker(userId)

  return (
    <PropertiesManager
      properties={resp?.data ?? []}
      total={total}
      loading={isLoading}
      primaryId={user?.primaryPropertyId ?? null}
      onCreate={body => createProp.mutateAsync(body)}
      creating={createProp.isPending}
      onDelete={id => deleteProp.mutateAsync(id)}
      deleting={deleteProp.isPending}
      onSetPrimary={id => updateWorker.mutateAsync({ primaryPropertyId: id })}
      settingPrimary={updateWorker.isPending}
      footer={totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} showLimitSelector={false} />
      )}
    />
  )
}

// ─── Seção Relações ───────────────────────────────────────────────────────────

function RelacoesTab({ userId }: { userId: string }) {
  const [page, setPage] = useState(1)
  const limit = 20
  const { data: resp, isLoading: loadingRels } = useUserRelations(userId, { page, limit })
  const relations = resp?.data ?? []
  const total = resp?.total ?? 0
  const totalPages = resp ? Math.ceil(total / limit) : 1

  const createRel = useCreateUserRelation(userId)
  const deleteRel = useDeleteUserRelation(userId)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ targetId: '', label: '' })
  const [deleteTarget, setDeleteTarget] = useState<UserRelation | null>(null)
  const [search, setSearch] = useState('')
  // Busca server-side (o hook aceita `search`) — associados além de 1000 ficam
  // pesquisáveis; debounce evita 1 request por tecla.
  const debouncedSearch = useDebouncedValue(search, 300)
  const { data: allUsersResp } = useAdminUsers({ limit: 20, search: debouncedSearch })
  const allUsers = allUsersResp?.data ?? []

  const filtered = allUsers.filter(u =>
    u.id !== userId &&
    !relations.some(r => r.targetId === u.id)
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.targetId) return
    // A exclusão do dropdown só enxerga a página atual de relações; guarda contra
    // duplicar quem já é relação (o backend também valida).
    if (relations.some(r => r.targetId === form.targetId)) {
      toast.error('Essa pessoa já é uma relação.')
      return
    }
    try {
      await createRel.mutateAsync({ targetId: form.targetId, label: form.label || undefined })
      setForm({ targetId: '', label: '' })
      setSearch('')
      setAdding(false)
      toast.success('Relação adicionada!')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao adicionar relação.'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteRel.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      toast.success('Relação removida.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover relação.'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} relação(ões) cadastrada(s)</p>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Adicionar
        </Button>
      </div>

      {!loadingRels && total === 0 && !adding && (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg text-center">
          <Heart className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">Nenhuma relação cadastrada</p>
        </div>
      )}

      {adding && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <FieldRow label="Buscar associado">
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome ou CPF..." className="h-9" autoFocus />
              </FieldRow>
              {search.length > 0 && (
                <div className="rounded-md border max-h-40 overflow-y-auto">
                  {filtered.length === 0 && <p className="text-xs text-muted-foreground p-3">Nenhum resultado.</p>}
                  {filtered.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setForm(p => ({ ...p, targetId: u.id })); setSearch(u.name) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${form.targetId === u.id ? 'bg-muted' : ''}`}
                    >
                      <span className="font-medium">{u.name}</span>
                      {u.cpf && <span className="text-xs text-muted-foreground ml-2">{maskCPF(u.cpf)}</span>}
                    </button>
                  ))}
                </div>
              )}
              <FieldRow label="Tipo de relação">
                <Input value={form.label} onChange={e => setForm(p => ({ ...p, label: upperNoAccents(e.target.value) }))} placeholder="cônjuge, filho, irmão..." className="h-9" />
              </FieldRow>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => { setAdding(false); setSearch(''); setForm({ targetId: '', label: '' }) }}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={!form.targetId || createRel.isPending}>
                  {createRel.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {loadingRels && relations.length === 0 && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Carregando...</div>
        )}
        {relations.map(rel => (
          <div key={rel.id} className="flex items-center justify-between rounded-lg border p-3 bg-card">
            <div>
              <p className="font-medium text-sm">{rel.target.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {rel.label && <Badge variant="secondary" className="text-xs">{rel.label}</Badge>}
                {rel.target.cpf && <span className="text-xs text-muted-foreground font-mono">{maskCPF(rel.target.cpf)}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-7" asChild>
                <Link to="/admin/usuarios/$id" params={{ id: rel.target.id }}>
                  <Eye className="size-3.5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="size-7 text-destructive/60 hover:text-destructive" onClick={() => setDeleteTarget(rel)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} showLimitSelector={false} />
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Remover relação"
        description={<>
          <span className="font-medium text-foreground">{deleteTarget?.target.name}</span>
          <br />Esta ação não pode ser desfeita.
        </>}
        onConfirm={handleDelete}
        pending={deleteRel.isPending}
        confirmLabel="Remover"
        pendingLabel="Removendo..."
      />
    </div>
  )
}

// ─── Route Component ──────────────────────────────────────────────────────────

function RouteComponent() {
  const { id } = Route.useParams()
  const { completar } = Route.useSearch()
  const { data: user, isLoading, error } = useAdminUser(id)
  const { data: propsResp } = useUserProperties(id, { page: 1, limit: 10 })
  const { data: relsResp } = useUserRelations(id, { page: 1, limit: 20 })
  const propertiesTotal = propsResp?.total ?? 0
  const relationsTotal = relsResp?.total ?? 0
  const [activeTab, setActiveTab] = useState('dados')
  const [completeMode, setCompleteMode] = useState(false)
  // ?completar=1 é conferido uma vez, com cadastro e propriedades carregados.
  const [completarPending, setCompletarPending] = useState(completar === 1)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [exporting, setExporting] = useState(false)
  const deleteWorker = useDeleteWorker()
  const navigate = useNavigate()
  // allowLeave do formulário de dados: excluir a pessoa sai sem o aviso de não salvo.
  const allowLeaveRef = useRef<(() => void) | null>(null)

  async function handleExport(dataset: ExportDataset, params: ExportParams) {
    setExporting(true)
    try {
      await downloadExport(dataset, params)
      toast.success('Planilha baixada.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao exportar.'))
    } finally {
      setExporting(false)
    }
  }

  function endCompleteMode() {
    setCompleteMode(false)
    // Tira o ?completar=1 da URL: atualizar a página não reabre o modo.
    if (completar !== undefined) {
      navigate({ to: '/admin/usuarios/$id', params: { id }, search: {}, replace: true })
    }
  }

  async function handleDelete() {
    try {
      await deleteWorker.mutateAsync(id)
      toast.success(`Associado "${user?.name}" excluído.`)
      allowLeaveRef.current?.()
      navigate({ to: '/admin/usuarios' })
    } catch {
      toast.error('Erro ao excluir associado.')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">Erro ao carregar usuário.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link to="/admin/usuarios"><ArrowLeft className="size-4 mr-2" /> Voltar</Link>
        </Button>
      </div>
    )
  }

  const missingFields = getMissingFields(user, propertiesTotal === 0)
  const isIncomplete = missingFields.length > 0
  // Link com ?completar=1: só abre o modo se ainda falta algo (o cadastro pode
  // ter sido completado depois que a lista foi carregada).
  if (completarPending && propsResp) {
    setCompletarPending(false)
    if (isIncomplete) setCompleteMode(true)
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-0.5">
          <Link to="/admin/usuarios">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">{user.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            {user.cpf && <span className="text-xs font-mono text-muted-foreground">CPF: {maskCPF(user.cpf)}</span>}
            {isIncomplete && !completeMode && (
              <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700 dark:text-amber-400">
                <AlertCircle className="size-3" />
                Cadastro incompleto ({missingFields.length})
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isIncomplete && !completeMode && (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30 gap-1.5"
              onClick={() => { setCompleteMode(true); setActiveTab('dados') }}
            >
              <AlertCircle className="size-3.5" />
              Completar cadastro
            </Button>
          )}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5" disabled={exporting} aria-label="Exportar" title="Exportar">
                {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Planilha CSV (abre no Excel)</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => handleExport('people', { ids: [id] })}>Ficha completa</DropdownMenuItem>
              <DropdownMenuItem disabled={propertiesTotal === 0} onSelect={() => handleExport('properties', { ownerIds: [id] })}>
                Propriedades ({propertiesTotal})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 gap-1.5"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="size-3.5" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="dados"><User className="size-3.5 mr-1.5" /> Dados</TabsTrigger>
          <TabsTrigger value="propriedades">
            <TreePine className="size-3.5 mr-1.5" /> Propriedades
            {propertiesTotal > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px]">{propertiesTotal}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="empresas">
            <Building2 className="size-3.5 mr-1.5" /> Empresas
            {(user.companyMemberships?.length ?? 0) > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px]">{user.companyMemberships!.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="relacoes">
            <Heart className="size-3.5 mr-1.5" /> Relações
            {relationsTotal > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px]">{relationsTotal}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Fica montada (só escondida) para não perder uma edição ao trocar de aba */}
        <TabsContent value="dados" forceMount className="data-[state=inactive]:hidden">
          <DadosTab
            userId={id}
            user={user}
            completeMode={completeMode}
            onCompleteModeEnd={endCompleteMode}
            hasNoProperties={propertiesTotal === 0}
            visible={activeTab === 'dados'}
            allowLeaveRef={allowLeaveRef}
          />
        </TabsContent>
        <TabsContent value="propriedades">
          <PropriedadesTab userId={id} />
        </TabsContent>
        <TabsContent value="empresas">
          <PersonCompanies userId={id} personName={user.name} memberships={user.companyMemberships ?? []} />
        </TabsContent>
        <TabsContent value="relacoes">
          <RelacoesTab userId={id} />
        </TabsContent>
      </Tabs>

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Excluir associado"
        description={<>
          Esta ação é permanente e não pode ser desfeita. O associado{' '}
          <strong>{user.name}</strong> será removido do sistema.
        </>}
        onConfirm={handleDelete}
        pending={deleteWorker.isPending}
      />
    </div>
  )
}
