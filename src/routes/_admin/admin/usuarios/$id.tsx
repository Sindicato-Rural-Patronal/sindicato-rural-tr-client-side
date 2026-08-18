import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  useAdminUser, useUpdateWorker, useDeleteWorker, useUploadAvatar, useUploadPartnerLogo,
  useUserProperties, useCreateUserProperty, useDeleteUserProperty,
  useUserRelations, useCreateUserRelation, useDeleteUserRelation,
  useAdminUsers, useCEPLookup,
  usePromoteInstructor, useRemoveInstructor, useUpdateInstructor,
  type UserDataDetail, type UserProperty, type UserRelation,
} from '@/hooks/useAdmin'
import { Pagination } from '@/components/ui/pagination'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertCircle, ArrowLeft, Camera, CheckCircle2, Save, Plus, Trash2, Building2, Eye,
  User, FileText, Globe, Briefcase, Heart, TreePine,
  Pencil, X, GraduationCap, Handshake, ImageUp, Star,
} from 'lucide-react'
import { maskCPF, maskPhone, maskCEP, maskRG, maskCNH, maskMoney } from '@/utils/masks'
import { AgeHint } from '@/components/AgeHint'
import { apiErrorMessage } from '@/lib/api-error-message'

export const Route = createFileRoute('/_admin/admin/usuarios/$id')({
  component: RouteComponent,
})

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function toIso(date: string): string | null {
  if (!date) return null
  return new Date(date).toISOString()
}

function FieldRow({ label, children, highlight }: { label: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${highlight ? 'rounded-lg p-2.5 -mx-2.5 bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-300 dark:ring-amber-700' : ''}`}>
      <Label className={`text-xs font-medium ${highlight ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
        {label}{highlight && <span className="ml-1 text-amber-500">*</span>}
      </Label>
      {children}
    </div>
  )
}

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function SelectField({
  value, onChange, options, placeholder, disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background h-9 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
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
  memberClassification: string; cadPro: string; familyIncome: string
  memberType: string; boardPosition: string; boardMember: boolean
  memberSince: string; membershipValidUntil: string; memberNotes: string; memberNotesNumber: string
  avatar: string
  isPartner: boolean; partnerUrl: string; partnerOrder: string
}

function dadosFromDetail(u: UserDataDetail): DadosForm {
  return {
    name: u.name ?? '',
    email: u.email ?? '',
    nickname: u.nickname ?? '',
    maritalStatus: u.maritalStatus ?? '',
    phone: u.phone ?? '',
    phone2: u.phone2 ?? '',
    phone3: u.phone3 ?? '',
    cpf: u.cpf ?? '',
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
    cadPro: u.cadPro ?? '',
    familyIncome: maskMoney(u.familyIncome ?? ''),
    memberType: u.memberType ?? '',
    boardPosition: u.boardPosition ?? '',
    boardMember: u.boardMember ?? false,
    memberSince: toDateInput(u.memberSince),
    membershipValidUntil: toDateInput(u.membershipValidUntil),
    memberNotes: u.memberNotes ?? '',
    memberNotesNumber: u.memberNotesNumber ?? '',
    avatar: u.avatar ?? '',
    isPartner: u.isPartner ?? false,
    partnerUrl: u.partnerUrl ?? '',
    partnerOrder: u.partnerOrder != null ? String(u.partnerOrder) : '',
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

  useEffect(() => {
    if (!open) return
    setCaptured(null)
    setError(null)
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

function DadosTab({ userId, user, completeMode, onCompleteModeEnd, hasNoProperties }: {
  userId: string
  user: UserDataDetail
  completeMode: boolean
  onCompleteModeEnd: () => void
  hasNoProperties: boolean
}) {
  const queryClient = useQueryClient()
  const updateWorker = useUpdateWorker(userId)
  const uploadAvatar = useUploadAvatar(userId)
  const uploadPartnerLogo = useUploadPartnerLogo(userId)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const partnerLogoInputRef = useRef<HTMLInputElement>(null)
  const [partnerLogoPreview, setPartnerLogoPreview] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<DadosForm>(() => dadosFromDetail(user))
  const [saved, setSaved] = useState<DadosForm>(() => dadosFromDetail(user))

  useEffect(() => {
    if (completeMode) setEditing(true)
  }, [completeMode])

  const promote = usePromoteInstructor(userId)
  const demote = useRemoveInstructor(userId)
  const updateInstructor = useUpdateInstructor(userId)
  const [wantInstructor, setWantInstructor] = useState(false)
  const [instrBio, setInstrBio] = useState(user.userInstructor?.bio ?? '')
  const [instrLinkedin, setInstrLinkedin] = useState(user.userInstructor?.linkedin ?? '')
  const [instrInstagram, setInstrInstagram] = useState(user.userInstructor?.instagram ?? '')
  const [instrFacebook, setInstrFacebook] = useState(user.userInstructor?.facebook ?? '')

  const isInstructor = !!user.userInstructor

  useEffect(() => {
    if (editing && user.userInstructor) {
      setInstrBio(user.userInstructor.bio ?? '')
      setInstrLinkedin(user.userInstructor.linkedin ?? '')
      setInstrInstagram(user.userInstructor.instagram ?? '')
      setInstrFacebook(user.userInstructor.facebook ?? '')
    }
  }, [editing])

  useEffect(() => {
    const d = dadosFromDetail(user)
    setForm(d)
    setSaved(d)
    setInstrBio(user.userInstructor?.bio ?? '')
    setInstrLinkedin(user.userInstructor?.linkedin ?? '')
    setInstrInstagram(user.userInstructor?.instagram ?? '')
    setInstrFacebook(user.userInstructor?.facebook ?? '')
  }, [user.id])

  function set(k: keyof DadosForm, v: string | boolean) {
    setForm(prev => ({ ...prev, [k]: v }))
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
      if (data.avatarUrl) set('avatar', data.avatarUrl)
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

  async function handlePartnerLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setPartnerLogoPreview(preview)
    try {
      await uploadPartnerLogo.mutateAsync(file)
      toast.success('Logo do parceiro atualizada!')
    } catch {
      setPartnerLogoPreview(null)
      toast.error('Erro ao fazer upload da logo.')
    }
    if (partnerLogoInputRef.current) partnerLogoInputRef.current.value = ''
  }

  function handleCancel() {
    setForm(saved)
    setPartnerLogoPreview(null)
    setWantInstructor(false)
    setInstrBio(user.userInstructor?.bio ?? '')
    setInstrLinkedin(user.userInstructor?.linkedin ?? '')
    setInstrInstagram(user.userInstructor?.instagram ?? '')
    setInstrFacebook(user.userInstructor?.facebook ?? '')
    setEditing(false)
    if (completeMode) onCompleteModeEnd()
  }

  async function handleSave() {
    const rgDigits = form.rg.replace(/\D/g, '')
    if (form.rg && rgDigits.length < 7) {
      toast.error('RG inválido — mínimo 7 dígitos.')
      return
    }
    const cnhDigits = form.driverLicense.replace(/\D/g, '')
    if (form.driverLicense && cnhDigits.length !== 11) {
      toast.error('CNH inválida — deve ter 11 dígitos.')
      return
    }
    // Corpo completo a partir de um snapshot do form (mesmo mapeamento do backend)
    const buildBody = (f: DadosForm): Parameters<typeof updateWorker.mutateAsync>[0] => ({
      name: f.name || undefined,
      email: f.email || undefined,
      phone: f.phone || undefined,
      cpf: f.cpf || undefined,
      nickname: f.nickname || null,
      maritalStatus: (f.maritalStatus as UserDataDetail['maritalStatus']) || null,
      phone2: f.phone2 || null,
      phone3: f.phone3 || null,
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
      cadPro: f.cadPro || null,
      familyIncome: f.familyIncome.replace(/\D/g, '') || null,
      memberType: f.memberType || null,
      boardPosition: f.boardPosition || null,
      boardMember: f.boardMember,
      memberSince: f.memberSince ? toIso(f.memberSince) : null,
      membershipValidUntil: f.membershipValidUntil ? toIso(f.membershipValidUntil) : null,
      memberNotes: f.memberNotes || null,
      memberNotesNumber: f.memberNotesNumber || null,
      avatar: f.avatar || null,
      isPartner: f.isPartner,
      partnerUrl: f.partnerUrl || null,
      partnerOrder: f.partnerOrder ? parseInt(f.partnerOrder, 10) : null,
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
          name: form.name,
          email: form.email,
          phone: form.phone,
          cpf: form.cpf || null,
          rg: form.rg || null,
          birthDate: form.birthDate ? toIso(form.birthDate) : null,
          gender: (form.gender as UserDataDetail['gender']) || null,
          avatar: form.avatar || null,
          nickname: form.nickname || null,
          maritalStatus: (form.maritalStatus as UserDataDetail['maritalStatus']) || null,
          phone2: form.phone2 || null,
          phone3: form.phone3 || null,
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
          cadPro: form.cadPro || null,
          familyIncome: form.familyIncome.replace(/\D/g, '') || null,
          memberType: form.memberType || null,
          boardPosition: form.boardPosition || null,
          boardMember: form.boardMember,
          memberSince: form.memberSince ? toIso(form.memberSince) : null,
          membershipValidUntil: form.membershipValidUntil ? toIso(form.membershipValidUntil) : null,
          memberNotes: form.memberNotes || null,
          memberNotesNumber: form.memberNotesNumber || null,
          isPartner: form.isPartner,
          partnerUrl: form.partnerUrl || null,
          partnerOrder: form.partnerOrder ? parseInt(form.partnerOrder, 10) : null,
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
      toast.error(apiErrorMessage(e, 'Erro ao salvar.'))
    }
  }

  const inp = 'h-9'
  const d = !editing

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
    <div className="flex flex-col gap-6">
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
            <Button size="sm" onClick={handleSave} disabled={updateWorker.isPending} className="gap-1.5">
              <Save className="size-3.5" />
              {updateWorker.isPending ? 'Salvando...' : 'Salvar dados'}
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
          <FieldRow label="Nome *">
            <Input className={inp} disabled={d} value={form.name} onChange={e => set('name', e.target.value)} />
          </FieldRow>
          <FieldRow label="E-mail *">
            <Input className={inp} disabled={d} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </FieldRow>
          <FieldRow label="Apelido">
            <Input className={inp} disabled={d} value={form.nickname} onChange={e => set('nickname', e.target.value)} />
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
          <FieldRow label="Telefone *">
            <Input className={inp} disabled={d} value={form.phone} onChange={e => set('phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
          </FieldRow>
          {(form.phone || form.phone2) && (
            <FieldRow label="Telefone 2">
              <Input className={inp} disabled={d} value={form.phone2} onChange={e => set('phone2', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
            </FieldRow>
          )}
          {(form.phone2 || form.phone3) && (
            <FieldRow label="Telefone 3">
              <Input className={inp} disabled={d} value={form.phone3} onChange={e => set('phone3', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
            </FieldRow>
          )}
          <FieldRow label="Estado civil">
            <SelectField disabled={d} value={form.maritalStatus} onChange={v => set('maritalStatus', v)} placeholder="Selecione" options={[
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
          <FieldRow label="CPF" highlight={hi('cpf')}>
            <Input className={inp} disabled={d} value={form.cpf} onChange={e => set('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" />
          </FieldRow>
          <FieldRow label="RG" highlight={hi('rg')}>
            <Input className={inp} disabled={d} value={form.rg} onChange={e => set('rg', maskRG(e.target.value))} placeholder="00.000.000-0" maxLength={12} />
          </FieldRow>
          <FieldRow label="Órgão emissor RG">
            <Input className={inp} disabled={d} value={form.rgIssuer} onChange={e => set('rgIssuer', e.target.value)} />
          </FieldRow>
          <FieldRow label="Data emissão RG">
            <DatePicker disabled={d} value={form.rgIssuedAt} onChange={v => set('rgIssuedAt', v)} />
          </FieldRow>
          <FieldRow label="Data nascimento" highlight={hi('birthDate')}>
            <DatePicker disabled={d} value={form.birthDate} onChange={v => set('birthDate', v)} />
            <AgeHint birthDate={form.birthDate} />
          </FieldRow>
          <FieldRow label="CNH">
            <Input className={inp} disabled={d} value={form.driverLicense} onChange={e => {
              const v = maskCNH(e.target.value)
              set('driverLicense', v)
              if (!v) set('driverLicenseCategory', '')
            }} placeholder="00000000000" inputMode="numeric" maxLength={11} />
          </FieldRow>
          {form.driverLicense && (
            <FieldRow label="Categoria CNH">
              <SelectField disabled={d} value={form.driverLicenseCategory} onChange={v => set('driverLicenseCategory', v)} placeholder="Selecione" options={[
                { value: 'A', label: 'A' },
                { value: 'B', label: 'B' },
                { value: 'C', label: 'C' },
                { value: 'D', label: 'D' },
                { value: 'E', label: 'E' },
                { value: 'AB', label: 'AB' },
                { value: 'AC', label: 'AC' },
                { value: 'AD', label: 'AD' },
                { value: 'AE', label: 'AE' },
              ]} />
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
            <Input className={inp} disabled={d} value={form.birthPlace} onChange={e => set('birthPlace', e.target.value)} />
          </FieldRow>
          <FieldRow label="Nacionalidade">
            <Input className={inp} disabled={d} value={form.nationality} onChange={e => set('nationality', e.target.value)} />
          </FieldRow>
          <FieldRow label="Gênero" highlight={hi('gender')}>
            <SelectField disabled={d} value={form.gender} onChange={v => set('gender', v)} placeholder="Selecione" options={[
              { value: 'MALE', label: 'Masculino' },
              { value: 'FEMALE', label: 'Feminino' },
              { value: 'OTHER', label: 'Outro' },
            ]} />
          </FieldRow>
          <FieldRow label="Etnia">
            <SelectField disabled={d} value={form.ethnicity} onChange={v => set('ethnicity', v)} placeholder="Selecione" options={[
              { value: 'WHITE', label: 'Branca' },
              { value: 'BLACK', label: 'Preta' },
              { value: 'MIXED', label: 'Parda' },
              { value: 'ASIAN', label: 'Amarela' },
              { value: 'INDIGENOUS', label: 'Indígena' },
            ]} />
          </FieldRow>
          <FieldRow label="Escolaridade">
            <SelectField disabled={d} value={form.educationLevel} onChange={v => set('educationLevel', v)} placeholder="Selecione" options={[
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
            <Input className={inp} disabled={d} value={form.functionalCategory} onChange={e => set('functionalCategory', e.target.value)} />
          </FieldRow>
          <FieldRow label="CAD-PRO">
            <Input className={inp} disabled={d} value={form.cadPro} onChange={e => set('cadPro', e.target.value)} />
          </FieldRow>
          <FieldRow label="Renda familiar">
            <Input className={inp} disabled={d} value={form.familyIncome} onChange={e => set('familyIncome', maskMoney(e.target.value))} placeholder="R$ 0,00" inputMode="numeric" />
          </FieldRow>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="specialNeeds" disabled={d} checked={form.specialNeeds} onChange={e => set('specialNeeds', e.target.checked)} className="accent-primary disabled:opacity-50 disabled:cursor-not-allowed" />
            <Label htmlFor="specialNeeds" className={`text-sm ${d ? 'opacity-50' : 'cursor-pointer'}`}>Necessidades especiais</Label>
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
            <Input className={inp} disabled={d} value={form.memberClassification} onChange={e => set('memberClassification', e.target.value)} />
          </FieldRow>
          <FieldRow label="Tipo de membro">
            <Input className={inp} disabled={d} value={form.memberType} onChange={e => set('memberType', e.target.value)} />
          </FieldRow>
          <FieldRow label="Associado desde">
            <DatePicker disabled={d} value={form.memberSince} onChange={v => set('memberSince', v)} />
          </FieldRow>
          <FieldRow label="Validade da associação">
            <DatePicker disabled={d} value={form.membershipValidUntil} onChange={v => set('membershipValidUntil', v)} />
          </FieldRow>
          <FieldRow label="Nº observação">
            <Input className={inp} disabled={d} value={form.memberNotesNumber} onChange={e => set('memberNotesNumber', e.target.value)} />
          </FieldRow>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="boardMember" disabled={d} checked={form.boardMember} onChange={e => set('boardMember', e.target.checked)} className="accent-primary disabled:opacity-50 disabled:cursor-not-allowed" />
            <Label htmlFor="boardMember" className={`text-sm ${d ? 'opacity-50' : 'cursor-pointer'}`}>Membro da diretoria</Label>
          </div>
          {form.boardMember && (
            <FieldRow label="Cargo na diretoria">
              <Input className={inp} disabled={d} value={form.boardPosition} onChange={e => set('boardPosition', e.target.value)} />
            </FieldRow>
          )}
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldRow label="Observações">
              <textarea
                disabled={d}
                value={form.memberNotes}
                onChange={e => set('memberNotes', e.target.value)}
                rows={3}
                className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background w-full resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </FieldRow>
          </div>
        </CardContent>
      </Card>

      {/* Parceiro */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Handshake className="size-4" /> Parceiro</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPartner"
              disabled={d}
              checked={form.isPartner}
              onChange={e => set('isPartner', e.target.checked)}
              className="accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Label htmlFor="isPartner" className={`text-sm ${d ? 'opacity-50' : 'cursor-pointer'}`}>
              Exibir como parceiro na página inicial
            </Label>
          </div>
          {form.isPartner && (
            <div className="flex flex-col gap-4 pl-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldRow label="Link do parceiro (URL)">
                  <Input
                    className={inp}
                    disabled={d}
                    value={form.partnerUrl}
                    onChange={e => set('partnerUrl', e.target.value)}
                    placeholder="https://site-do-parceiro.com.br"
                  />
                </FieldRow>
                <FieldRow label="Ordem de exibição">
                  <Input
                    className={inp}
                    disabled={d}
                    type="number"
                    min="0"
                    value={form.partnerOrder}
                    onChange={e => set('partnerOrder', e.target.value)}
                    placeholder="0"
                  />
                </FieldRow>
              </div>
              <FieldRow label="Logo do parceiro (300×150px)">
                <div className="flex items-center gap-3">
                  {partnerLogoPreview ? (
                    <img src={partnerLogoPreview} alt="Logo" className="h-10 w-20 object-contain rounded border bg-muted shrink-0" />
                  ) : user.partnerLogo ? (
                    <img src={user.partnerLogo} alt="Logo atual" className="h-10 w-20 object-contain rounded border bg-muted shrink-0" />
                  ) : (
                    <div className="h-10 w-20 rounded border bg-muted flex items-center justify-center shrink-0">
                      <Handshake className="size-4 text-muted-foreground/50" />
                    </div>
                  )}
                  {editing && (
                    <>
                      <input
                        ref={partnerLogoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePartnerLogoFile}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        disabled={uploadPartnerLogo.isPending}
                        onClick={() => partnerLogoInputRef.current?.click()}
                      >
                        {uploadPartnerLogo.isPending ? '...' : 'Upload logo'}
                      </Button>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Será redimensionada para 300×150px. Se não enviada, apenas o nome será exibido.
                </p>
              </FieldRow>
            </div>
          )}
          {!form.isPartner && (
            <p className="text-sm text-muted-foreground pl-5">
              Marque para exibir este associado como parceiro na página inicial.
            </p>
          )}
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
                    className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background w-full resize-none disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  )
}

// ─── Seção Propriedades ───────────────────────────────────────────────────────

type PropForm = {
  name: string
  registration: string
  address: {
    type: 'URBAN' | 'RURAL'
    street: string; number: string; neighborhood: string
    city: string; state: string; zipCode: string
    complement: string; notes: string
    localityName: string; road: string; km: string; lot: string; section: string
  }
}

const emptyPropForm = (): PropForm => ({
  name: '',
  registration: '',
  address: {
    type: 'URBAN',
    street: '', number: '', neighborhood: '',
    city: '', state: '', zipCode: '',
    complement: '', notes: '',
    localityName: '', road: '', km: '', lot: '', section: '',
  },
})

function PropriedadesTab({ userId }: { userId: string }) {
  const [page, setPage] = useState(1)
  const limit = 10
  const { data: resp, isLoading: loadingProps } = useUserProperties(userId, { page, limit })
  const properties = resp?.data ?? []
  const total = resp?.total ?? 0
  const totalPages = resp ? Math.ceil(total / limit) : 1

  const createProp = useCreateUserProperty(userId)
  const deleteProp = useDeleteUserProperty(userId)
  const cepLookup = useCEPLookup()
  const { data: user } = useAdminUser(userId)
  const updateWorker = useUpdateWorker(userId)
  const primaryId = user?.primaryPropertyId ?? null
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<PropForm>(emptyPropForm)
  const [deleteTarget, setDeleteTarget] = useState<UserProperty | null>(null)
  const [detailProp, setDetailProp] = useState<UserProperty | null>(null)

  async function setPrimary(propId: string) {
    try {
      await updateWorker.mutateAsync({ primaryPropertyId: propId })
      toast.success('Propriedade principal definida.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao definir propriedade principal.'))
    }
  }

  function setAddr(k: keyof PropForm['address'], v: string) {
    setForm(prev => ({ ...prev, address: { ...prev.address, [k]: v } }))
  }

  async function handleCEP() {
    if (!form.address.zipCode) return
    try {
      const result = await cepLookup.mutateAsync(form.address.zipCode)
      setForm(prev => ({
        ...prev,
        address: {
          ...prev.address,
          street: result.street ?? prev.address.street,
          neighborhood: result.neighborhood ?? prev.address.neighborhood,
          city: result.city ?? prev.address.city,
          state: result.state ?? prev.address.state,
        },
      }))
    } catch {
      toast.error('CEP não encontrado.')
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      await createProp.mutateAsync({
        name: form.name,
        registration: form.registration || undefined,
        address: form.address,
      })
      setForm(emptyPropForm())
      setAdding(false)
      toast.success('Propriedade adicionada!')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao adicionar propriedade.'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteProp.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      toast.success('Propriedade removida.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover propriedade.'))
    }
  }

  const inp = 'h-9'
  const isUrban = form.address.type === 'URBAN'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} propriedade(s) cadastrada(s)</p>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Adicionar
        </Button>
      </div>

      {!loadingProps && total === 0 && !adding && (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg text-center">
          <TreePine className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">Nenhuma propriedade cadastrada</p>
        </div>
      )}

      {adding && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldRow label="Nome da propriedade *">
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} autoFocus />
                </FieldRow>
                <FieldRow label="Matrícula">
                  <Input value={form.registration} onChange={e => setForm(p => ({ ...p, registration: e.target.value }))} className={inp} />
                </FieldRow>
              </div>

              <Separator />

              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Endereço da propriedade</p>
              <div className="flex gap-2">
                <Button type="button" variant={isUrban ? 'default' : 'outline'} size="sm" onClick={() => setAddr('type', 'URBAN')}>
                  <Building2 className="size-3.5 mr-1.5" /> Urbano
                </Button>
                <Button type="button" variant={!isUrban ? 'default' : 'outline'} size="sm" onClick={() => setAddr('type', 'RURAL')}>
                  <TreePine className="size-3.5 mr-1.5" /> Rural
                </Button>
              </div>

              {isUrban ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <FieldRow label="CEP">
                    <div className="flex gap-2">
                      <Input className={inp} value={form.address.zipCode} onChange={e => setAddr('zipCode', maskCEP(e.target.value))} placeholder="00000-000" />
                      <Button type="button" size="sm" variant="outline" disabled={!form.address.zipCode || cepLookup.isPending} onClick={handleCEP} className="shrink-0">
                        {cepLookup.isPending ? '...' : 'Buscar'}
                      </Button>
                    </div>
                  </FieldRow>
                  <div className="sm:col-span-2">
                    <FieldRow label="Logradouro">
                      <Input className={inp} value={form.address.street} onChange={e => setAddr('street', e.target.value)} />
                    </FieldRow>
                  </div>
                  <FieldRow label="Número"><Input className={inp} value={form.address.number} onChange={e => setAddr('number', e.target.value)} /></FieldRow>
                  <FieldRow label="Bairro"><Input className={inp} value={form.address.neighborhood} onChange={e => setAddr('neighborhood', e.target.value)} /></FieldRow>
                  <FieldRow label="Cidade"><Input className={inp} value={form.address.city} onChange={e => setAddr('city', e.target.value)} /></FieldRow>
                  <FieldRow label="Estado"><Input className={inp} value={form.address.state} onChange={e => setAddr('state', e.target.value)} maxLength={2} placeholder="PR" /></FieldRow>
                  <FieldRow label="Complemento"><Input className={inp} value={form.address.complement} onChange={e => setAddr('complement', e.target.value)} /></FieldRow>
                  <FieldRow label="Observações"><Input className={inp} value={form.address.notes} onChange={e => setAddr('notes', e.target.value)} /></FieldRow>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <FieldRow label="Nome da localidade"><Input className={inp} value={form.address.localityName} onChange={e => setAddr('localityName', e.target.value)} /></FieldRow>
                  <FieldRow label="Estrada / Via"><Input className={inp} value={form.address.road} onChange={e => setAddr('road', e.target.value)} /></FieldRow>
                  <FieldRow label="KM"><Input className={inp} value={form.address.km} onChange={e => setAddr('km', e.target.value)} /></FieldRow>
                  <FieldRow label="Lote"><Input className={inp} value={form.address.lot} onChange={e => setAddr('lot', e.target.value)} /></FieldRow>
                  <FieldRow label="Seção"><Input className={inp} value={form.address.section} onChange={e => setAddr('section', e.target.value)} /></FieldRow>
                  <FieldRow label="Cidade"><Input className={inp} value={form.address.city} onChange={e => setAddr('city', e.target.value)} /></FieldRow>
                  <FieldRow label="Estado"><Input className={inp} value={form.address.state} onChange={e => setAddr('state', e.target.value)} maxLength={2} placeholder="PR" /></FieldRow>
                  <FieldRow label="Observações"><Input className={inp} value={form.address.notes} onChange={e => setAddr('notes', e.target.value)} /></FieldRow>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => { setAdding(false); setForm(emptyPropForm()) }}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={createProp.isPending}>
                  {createProp.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {loadingProps && properties.length === 0 && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Carregando...</div>
        )}
        {properties.map(prop => {
          const isPrimary = prop.id === primaryId
          return (
          <div key={prop.id} className={`flex items-center justify-between rounded-lg border p-3 bg-card ${isPrimary ? 'border-primary/50 ring-1 ring-primary/20' : ''}`}>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{prop.name}</p>
                {isPrimary && (
                  <Badge variant="secondary" className="gap-1 text-[10px]"><Star className="size-2.5 fill-current" /> Principal</Badge>
                )}
              </div>
              {prop.registration && <p className="text-xs text-muted-foreground">Matrícula: {prop.registration}</p>}
              {prop.address && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {prop.address.type === 'URBAN'
                    ? [prop.address.street, prop.address.city, prop.address.state].filter(Boolean).join(', ')
                    : [prop.address.localityName, prop.address.road, prop.address.city].filter(Boolean).join(' — ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!isPrimary && (
                <Button
                  variant="ghost" size="sm"
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                  disabled={updateWorker.isPending}
                  onClick={() => setPrimary(prop.id)}
                >
                  <Star className="size-3.5" />
                  <span className="hidden sm:inline">Definir principal</span>
                </Button>
              )}
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setDetailProp(prop)}>
                <Eye className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-7 text-destructive/60 hover:text-destructive" onClick={() => setDeleteTarget(prop)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} showLimitSelector={false} />
      )}

      {/* Dialog: Detalhes da Propriedade */}
      <Dialog open={!!detailProp} onOpenChange={open => !open && setDetailProp(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TreePine className="size-4" /> {detailProp?.name}
            </DialogTitle>
            {detailProp?.registration && (
              <DialogDescription>Matrícula: {detailProp.registration}</DialogDescription>
            )}
          </DialogHeader>
          {detailProp?.address ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {detailProp.address.type === 'URBAN'
                  ? <Badge variant="secondary" className="gap-1"><Building2 className="size-3" /> Urbano</Badge>
                  : <Badge variant="secondary" className="gap-1"><TreePine className="size-3" /> Rural</Badge>}
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {detailProp.address.type === 'URBAN' ? (
                  <>
                    {detailProp.address.zipCode && <InfoRow label="CEP" value={detailProp.address.zipCode} />}
                    {detailProp.address.street && <InfoRow label="Logradouro" value={`${detailProp.address.street}${detailProp.address.number ? `, ${detailProp.address.number}` : ''}`} />}
                    {detailProp.address.neighborhood && <InfoRow label="Bairro" value={detailProp.address.neighborhood} />}
                    {detailProp.address.city && <InfoRow label="Cidade" value={detailProp.address.city} />}
                    {detailProp.address.state && <InfoRow label="Estado" value={detailProp.address.state} />}
                    {detailProp.address.complement && <InfoRow label="Complemento" value={detailProp.address.complement} />}
                  </>
                ) : (
                  <>
                    {detailProp.address.localityName && <InfoRow label="Localidade" value={detailProp.address.localityName} />}
                    {detailProp.address.road && <InfoRow label="Estrada / Via" value={detailProp.address.road} />}
                    {detailProp.address.km && <InfoRow label="KM" value={detailProp.address.km} />}
                    {detailProp.address.lot && <InfoRow label="Lote" value={detailProp.address.lot} />}
                    {detailProp.address.section && <InfoRow label="Seção" value={detailProp.address.section} />}
                    {detailProp.address.city && <InfoRow label="Cidade" value={detailProp.address.city} />}
                    {detailProp.address.state && <InfoRow label="Estado" value={detailProp.address.state} />}
                  </>
                )}
                {detailProp.address.notes && <InfoRow label="Observações" value={detailProp.address.notes} />}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailProp(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar remoção */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover propriedade</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <p className="text-sm font-medium">{deleteTarget?.name}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProp.isPending}>
              {deleteProp.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
  const { data: allUsersResp } = useAdminUsers({ limit: 1000 })
  const allUsers = allUsersResp?.data ?? []
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ targetId: '', label: '' })
  const [deleteTarget, setDeleteTarget] = useState<UserRelation | null>(null)
  const [search, setSearch] = useState('')

  const filtered = allUsers.filter(u =>
    u.id !== userId &&
    !relations.some(r => r.targetId === u.id) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || (u.cpf ?? '').includes(search))
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.targetId) return
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
                      {u.cpf && <span className="text-xs text-muted-foreground ml-2">{u.cpf}</span>}
                    </button>
                  ))}
                </div>
              )}
              <FieldRow label="Tipo de relação">
                <Input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="cônjuge, filho, irmão..." className="h-9" />
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
                {rel.target.cpf && <span className="text-xs text-muted-foreground font-mono">{rel.target.cpf}</span>}
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

      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover relação</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <p className="text-sm font-medium">{deleteTarget?.target.name}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteRel.isPending}>
              {deleteRel.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Route Component ──────────────────────────────────────────────────────────

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: user, isLoading, error } = useAdminUser(id)
  const { data: propsResp } = useUserProperties(id, { page: 1, limit: 10 })
  const { data: relsResp } = useUserRelations(id, { page: 1, limit: 20 })
  const propertiesTotal = propsResp?.total ?? 0
  const relationsTotal = relsResp?.total ?? 0
  const [activeTab, setActiveTab] = useState('dados')
  const [completeMode, setCompleteMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const deleteWorker = useDeleteWorker()
  const navigate = useNavigate()

  async function handleDelete() {
    try {
      await deleteWorker.mutateAsync(id)
      toast.success(`Associado "${user?.name}" excluído.`)
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
            {user.cpf && <span className="text-xs font-mono text-muted-foreground">CPF: {user.cpf}</span>}
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
          <TabsTrigger value="relacoes">
            <Heart className="size-3.5 mr-1.5" /> Relações
            {relationsTotal > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px]">{relationsTotal}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <DadosTab
            userId={id}
            user={user}
            completeMode={completeMode}
            onCompleteModeEnd={() => setCompleteMode(false)}
            hasNoProperties={propertiesTotal === 0}
          />
        </TabsContent>
        <TabsContent value="propriedades">
          <PropriedadesTab userId={id} />
        </TabsContent>
        <TabsContent value="relacoes">
          <RelacoesTab userId={id} />
        </TabsContent>
      </Tabs>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir associado</DialogTitle>
            <DialogDescription>
              Esta ação é permanente e não pode ser desfeita. O associado{' '}
              <strong>{user.name}</strong> será removido do sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteWorker.isPending}>
              {deleteWorker.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
