import { useQueryClient } from '@tanstack/react-query'
import { apiErrorMessage } from '@/lib/api-error-message'
import { apiUpload } from '@/lib/api'
import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useAdminCourse, useCreateCourse, useUpdateCourse, useUploadBanner, useUploadGalleryPhoto } from '@/hooks/useCourse'
import type { CreateCourseResponse } from '@/hooks/useCourse'
import { useRooms } from '@/hooks/useRooms'
import { upperNoAccents } from '@/utils/text-format'
import { courseBaseSchema } from '@/lib/schemas'
import type { CourseFormData } from '@/lib/schemas'
import { courseToDuplicateForm, roomIdByName } from '@/lib/course-duplicate'
import { Label } from '@/components/ui/label'
import { Images, X, ImageUp, ImagePlus, Upload } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import type { Course } from '@/@types/course'
import { ErrorAlert } from '@/components/ErrorAlert'
import { ConfirmCloseDialog } from '@/components/confirm-close-dialog'
import { PhotoGrid } from '@/components/courses/PhotoGrid'
import { useConfirmDeletePhoto, photoCountLabel } from '@/hooks/useConfirmDeletePhoto'

// Formulário de criar, editar e duplicar curso. Fica fora do arquivo da rota:
// o que a rota exporta além de `Route` não é dividido pelo autoCodeSplitting e
// ia para o bundle inicial (junto com o editor de markdown), pesando o site público.

// O que cada status faz no site público (list-courses, get-course-detail e as
// regras de inscrição do backend).
const STATUS_HINTS: Record<Course['status'], string> = {
  UNPUBLISHED: 'Não aparece no site e a página do curso não abre. Ninguém consegue se inscrever.',
  PRIVATE: 'Não aparece na lista de cursos do site, mas quem tiver o link abre a página e pode se inscrever.',
  PUBLIC: 'Aparece na lista de cursos do site e aceita inscrições até o prazo.',
  IN_PROGRESS: 'Curso já começou: sai da lista do site; a página abre pelo link, mas não aceita novas inscrições.',
}

// ─── create / edit form dialog ────────────────────────────────────────────────

const emptyFormDefaults: CourseFormData = {
  name: '', description: '', roomId: '', status: 'UNPUBLISHED',
  startDate: '', startHour: '', endDate: '', endHour: '',
  price: undefined, workloadHours: undefined,
  regDeadlineDate: '', regDeadlineHour: '', observations: '', eventNumber: '', minStudents: undefined,
}

function courseToForm(c: Course): CourseFormData {
  return {
    name: c.title,
    description: c.description ?? '',
    roomId: '',
    status: c.status,
    startDate: c.startDate ? c.startDate.slice(0, 10) : '',
    startHour: c.startTime ?? '',
    endDate: c.endDate ? c.endDate.slice(0, 10) : '',
    endHour: c.endTime ?? '',
    price: c.price ?? undefined,
    workloadHours: c.workloadHours ?? undefined,
    regDeadlineDate: c.registrationDeadline ? c.registrationDeadline.slice(0, 10) : '',
    // A API manda o dia e, à parte, a hora do prazo (null = sem hora, vale o dia todo).
    regDeadlineHour: c.registrationDeadline ? (c.registrationDeadlineTime ?? c.registrationDeadline.slice(11, 16)) : '',
    observations: c.observations ?? '',
    eventNumber: c.eventNumber ?? '',
    minStudents: c.minStudents ?? undefined,
  }
}

function toISO(date: string, hour: string) {
  if (!date) return undefined
  // Hora "de parede", sem fuso: envia como se fosse UTC porque o backend devolve
  // a hora fatiando o ISO em UTC. Converter do fuso local (new Date(...).toISOString())
  // deslocava a hora no round-trip — digitava 08:00 e voltava 11:00.
  return `${date}T${hour || '00:00'}:00.000Z`
}

// Botão "Enviar capa" sempre visível sobre a capa (no celular não há hover).
function BannerPickButton({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <div className="absolute bottom-2 right-2">
      <Button variant="secondary" size="sm" type="button" disabled={disabled} className="shadow-md">
        <ImageUp className="size-4" />
        {label}
      </Button>
    </div>
  )
}

function BannerTab({ courseId }: { courseId: string | null }) {
  const { data: editing } = useAdminCourse(courseId ?? '')
  const uploadBanner = useUploadBanner(courseId ?? '')
  const uploadPhoto = useUploadGalleryPhoto(courseId ?? '')
  const removePhoto = useConfirmDeletePhoto(courseId ?? '')
  const bannerRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const [bannerError, setBannerError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [bannerCacheBust, setBannerCacheBust] = useState(0)
  const { t } = useTranslation()

  if (!courseId || !editing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
        <Upload className="size-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-foreground">{t('admin.courses.form.save')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('common.loading')}</p>
      </div>
    )
  }

  async function handleBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerError(null)
    try {
      await uploadBanner.mutateAsync(file)
      setBannerCacheBust(v => v + 1)
      toast.success('Banner atualizado!')
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, 'Upload error.')
      setBannerError(msg)
      toast.error(msg)
    }
    e.target.value = ''
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError(null)
    try {
      await uploadPhoto.mutateAsync(file)
      toast.success('Foto adicionada!')
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, 'Upload error.')
      setPhotoError(msg)
      toast.error(msg)
    }
    e.target.value = ''
  }

  const photos = editing.photoGallery ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Banner */}
      <div className="flex flex-col gap-3">
        <Label>{t('admin.courses.bannerUpload')}</Label>
        <div
          className="relative h-40 rounded-xl overflow-hidden bg-muted flex items-center justify-center border border-border cursor-pointer"
          onClick={() => bannerRef.current?.click()}
        >
          {editing.coverImage
            ? <img src={`${editing.coverImage}${bannerCacheBust ? `?v=${bannerCacheBust}` : ''}`} alt="Banner" className="h-full w-full object-cover" />
            : <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                <ImageUp className="size-10" />
              </div>
          }
          <BannerPickButton label={t('admin.courses.bannerUpload')} disabled={uploadBanner.isPending} />
        </div>
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
        <ErrorAlert message={bannerError} />
      </div>

      {/* Gallery */}
      <div className="flex flex-col gap-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="flex items-center gap-2"><Images className="size-4" /> {t('admin.courses.tabs.images')}</Label>
            <p className="text-xs text-muted-foreground mt-0.5">{photoCountLabel(photos.length)}</p>
          </div>
          <Button size="sm" variant="outline" type="button" onClick={() => photoRef.current?.click()} disabled={uploadPhoto.isPending}>
            <ImagePlus className="size-4" />
            {t('admin.courses.galleryUpload')}
          </Button>
        </div>
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        <ErrorAlert message={photoError} />

        {photos.length === 0
          ? <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground">
              <Images className="size-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{t('admin.courses.galleryEmpty')}</p>
            </div>
          : <PhotoGrid
              photos={photos.map(p => ({ key: p.id, url: p.url, caption: p.caption }))}
              onRemove={removePhoto.ask}
              disabled={removePhoto.pending}
            />
        }
      </div>

      {removePhoto.dialog}
    </div>
  )
}

// Imagens escolhidas antes do curso existir — sobem logo após o create.
export type StagedImage = { file: File; url: string }

function StagedImagesTab({
  stagedBanner, onBannerChange, stagedPhotos, onPhotosChange, copiedCover, onCopiedCoverRemove,
}: {
  stagedBanner: StagedImage | null
  onBannerChange: (img: StagedImage | null) => void
  stagedPhotos: StagedImage[]
  onPhotosChange: (imgs: StagedImage[]) => void
  /** "Duplicar curso": capa do curso original que será copiada (se nenhuma outra for escolhida). */
  copiedCover?: string | null
  onCopiedCoverRemove?: () => void
}) {
  const bannerRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation()

  function pickBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (stagedBanner) URL.revokeObjectURL(stagedBanner.url)
    onBannerChange({ file, url: URL.createObjectURL(file) })
    e.target.value = ''
  }

  function pickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    onPhotosChange([...stagedPhotos, ...files.map(file => ({ file, url: URL.createObjectURL(file) }))])
    e.target.value = ''
  }

  function removePhoto(url: string) {
    URL.revokeObjectURL(url)
    onPhotosChange(stagedPhotos.filter(p => p.url !== url))
  }

  const showCopiedCover = !stagedBanner && !!copiedCover

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
        As imagens serão enviadas automaticamente assim que o curso for criado.
      </p>

      {/* Banner */}
      <div className="flex flex-col gap-3">
        <Label>{t('admin.courses.bannerUpload')}</Label>
        <div
          className="relative h-40 rounded-xl overflow-hidden bg-muted flex items-center justify-center border border-border cursor-pointer"
          onClick={() => bannerRef.current?.click()}
        >
          {stagedBanner
            ? <img src={stagedBanner.url} alt="Banner" className="h-full w-full object-cover" />
            : showCopiedCover
              ? <img src={copiedCover!} alt="Capa do curso original" className="h-full w-full object-cover" />
              : <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                  <ImageUp className="size-10" />
                </div>
          }
          <BannerPickButton label={t('admin.courses.bannerUpload')} />
        </div>
        {showCopiedCover && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>A capa do curso original será copiada. Para usar outra, clique na imagem.</span>
            {onCopiedCoverRemove && (
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onCopiedCoverRemove}>
                <X className="size-3.5" /> Não copiar a capa
              </Button>
            )}
          </div>
        )}
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={pickBanner} />
      </div>

      {/* Gallery */}
      <div className="flex flex-col gap-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="flex items-center gap-2"><Images className="size-4" /> {t('admin.courses.tabs.images')}</Label>
            <p className="text-xs text-muted-foreground mt-0.5">{photoCountLabel(stagedPhotos.length)}</p>
          </div>
          <Button size="sm" variant="outline" type="button" onClick={() => photoRef.current?.click()}>
            <ImagePlus className="size-4" />
            {t('admin.courses.galleryUpload')}
          </Button>
        </div>
        <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={pickPhotos} />
        {stagedPhotos.length === 0
          ? <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground">
              <Images className="size-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{t('admin.courses.galleryEmpty')}</p>
            </div>
          : <PhotoGrid
              photos={stagedPhotos.map(p => ({ key: p.url, url: p.url }))}
              onRemove={removePhoto}
            />
        }
      </div>
    </div>
  )
}

type CourseFormDialogProps = {
  open: boolean
  editing: Course | null
  /** "Duplicar curso": abre a criação preenchida com os dados deste curso. */
  duplicateOf?: Course | null
  onClose: () => void
}

export function CourseFormDialog(props: CourseFormDialogProps) {
  // Cada abertura é uma sessão nova (formulário com os dados do curso ou vazio,
  // sem imagens pendentes). Fechar não troca a chave, então a animação de saída
  // continua com o mesmo conteúdo.
  const [session, setSession] = useState(0)
  const [wasOpen, setWasOpen] = useState(props.open)
  if (props.open !== wasOpen) {
    setWasOpen(props.open)
    if (props.open) setSession(s => s + 1)
  }
  return <CourseFormDialogSession key={session} {...props} />
}

function CourseFormDialogSession({ open, editing, duplicateOf = null, onClose }: CourseFormDialogProps) {
  const { data: rooms, isLoading: roomsLoading } = useRooms()
  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse(editing?.id ?? '')
  const { t } = useTranslation()

  const isCreating = !editing
  const source = isCreating ? duplicateOf : null
  const queryClient = useQueryClient()

  // imagens escolhidas antes do curso existir (modo criação)
  const [stagedBanner, setStagedBanner] = useState<StagedImage | null>(null)
  const [stagedPhotos, setStagedPhotos] = useState<StagedImage[]>([])
  // Libera as prévias (object URLs) quando esta sessão do formulário sai da tela.
  const stagedRef = useRef({ stagedBanner, stagedPhotos })
  useEffect(() => { stagedRef.current = { stagedBanner, stagedPhotos } }, [stagedBanner, stagedPhotos])
  useEffect(() => () => {
    const { stagedBanner: banner, stagedPhotos: photos } = stagedRef.current
    if (banner) URL.revokeObjectURL(banner.url)
    for (const photo of photos) URL.revokeObjectURL(photo.url)
  }, [])
  const [uploadingStaged, setUploadingStaged] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  // Duplicar: copiar a capa e quais instrutores do curso original.
  const [copyCover, setCopyCover] = useState(!!source?.coverImage)
  const [keptInstructors, setKeptInstructors] = useState<Set<string>>(
    () => new Set(source?.instructors.map(i => i.id) ?? []),
  )

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseBaseSchema),
    mode: 'onTouched',
    defaultValues: editing ? courseToForm(editing) : source ? courseToDuplicateForm(source, rooms) : emptyFormDefaults,
  })

  // A lista de salas pode chegar depois de abrir a cópia: escolhe a sala do curso original.
  useEffect(() => {
    if (!source || !rooms || form.getValues('roomId')) return
    const roomId = roomIdByName(rooms, source.location)
    if (roomId) form.setValue('roomId', roomId, { shouldValidate: true })
  }, [source, rooms, form])

  const isPending = createCourse.isPending || updateCourse.isPending || uploadingStaged

  // Guard de alterações não salvas ao fechar.
  const formDirty = form.formState.isDirty || !!stagedBanner || stagedPhotos.length > 0
  function requestClose() {
    if (formDirty && !isPending) setConfirmClose(true)
    else onClose()
  }

  function toggleInstructor(id: string) {
    setKeptInstructors(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onSubmit(data: CourseFormData) {
    if (isCreating && !data.roomId) {
      form.setError('roomId', { message: t('validation.roomRequired') })
      return
    }
    const body = {
      name: data.name,
      description: data.description ?? '',
      status: data.status,
      startTime: toISO(data.startDate, data.startHour)!,
      endTime: toISO(data.endDate, data.endHour)!,
      ...(data.roomId ? { roomId: data.roomId } : {}),
      ...(data.price != null ? { price: data.price } : {}),
      ...(data.workloadHours != null ? { workloadHours: data.workloadHours } : {}),
      ...(data.regDeadlineDate ? { registrationDeadline: toISO(data.regDeadlineDate, data.regDeadlineHour ?? '') } : {}),
      ...(data.observations ? { observations: data.observations } : {}),
      ...(data.eventNumber ? { eventNumber: data.eventNumber } : {}),
      ...(data.minStudents != null ? { minStudents: data.minStudents } : {}),
    }
    // Duplicar: a capa escolhida aqui vence a cópia; instrutores só os marcados.
    const wantCoverCopy = !!source && copyCover && !!source.coverImage && !stagedBanner
    const instructorIds = source ? source.instructors.filter(i => keptInstructors.has(i.id)).map(i => i.id) : []
    try {
      if (editing) {
        await updateCourse.mutateAsync(body)
      } else {
        const res = await createCourse.mutateAsync({
          ...body,
          roomId: data.roomId!,
          ...(wantCoverCopy ? { copyCoverFromCourseId: source!.id } : {}),
          ...(instructorIds.length > 0
            ? { copyInstructorsFromCourseId: source!.id, instructorAssignmentIds: instructorIds }
            : {}),
        })
        const created = await res.json().catch(() => null) as CreateCourseResponse | null

        const copyProblems: string[] = []
        if (wantCoverCopy && created?.coverCopied === false) {
          copyProblems.push('a imagem de capa não foi copiada. Envie a imagem de capa pela edição')
        }
        if (instructorIds.length > 0 && (created?.instructorsCopied ?? instructorIds.length) < instructorIds.length) {
          copyProblems.push('nem todos os instrutores foram copiados. Confira a aba Instrutores')
        }
        if (copyProblems.length) toast.warning(`Curso criado, mas ${copyProblems.join('; ')}.`)

        // sobe as imagens escolhidas antes do curso existir
        if (created?.id && (stagedBanner || stagedPhotos.length > 0)) {
          setUploadingStaged(true)
          const failed: string[] = []
          if (stagedBanner) {
            try { await apiUpload(`/courses/${created.id}/banner`, stagedBanner.file) }
            catch { failed.push('banner') }
          }
          for (const photo of stagedPhotos) {
            try { await apiUpload(`/courses/${created.id}/gallery`, photo.file) }
            catch { failed.push(photo.file.name) }
          }
          setUploadingStaged(false)
          queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
          queryClient.invalidateQueries({ queryKey: ['courses'] })
          if (failed.length) {
            // upload parcial: avisa e NÃO dispara o toast de sucesso
            toast.error(`Curso criado, mas falhou o upload de: ${failed.join(', ')}. Adicione pela edição.`)
            onClose()
            return
          }
        }
        if (copyProblems.length) {
          onClose()
          return
        }
      }
      toast.success(editing ? 'Curso atualizado com sucesso!' : 'Curso criado com sucesso!')
      onClose()
    } catch (e: unknown) {
      setUploadingStaged(false)
      const msg = apiErrorMessage(e, t('common.error'))
      form.setError('root', { message: msg })
      toast.error(msg)
    }
  }

  const status = useWatch({ control: form.control, name: 'status' })

  return (
    <>
    <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) requestClose() }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" showCloseButton={false}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-xl">
            {editing ? t('admin.courses.editCourse') : source ? 'Duplicar curso' : t('admin.courses.newCourse')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mx-6 mt-4 max-w-[calc(100%-3rem)]">
                <TabsTrigger value="info">{t('admin.courses.tabs.info')}</TabsTrigger>
                <TabsTrigger value="description">{t('admin.courses.tabs.description')}</TabsTrigger>
                <TabsTrigger value="images">{t('admin.courses.tabs.images')}</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {source && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                    Cópia de <strong className="text-foreground">{source.title}</strong>. Preencha as datas e o prazo de inscrição e confira os dados antes de criar. A galeria de fotos não é copiada.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.courses.form.status')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="UNPUBLISHED">{t('admin.courses.form.statusDraft')}</SelectItem>
                          <SelectItem value="PRIVATE">{t('admin.courses.form.statusPrivate')}</SelectItem>
                          <SelectItem value="PUBLIC">{t('admin.courses.form.statusPublic')}</SelectItem>
                          {field.value === 'IN_PROGRESS' && (
                            <SelectItem value="IN_PROGRESS">{t('admin.courses.form.statusInProgress')}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="eventNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.courses.form.eventNumber')}</FormLabel>
                      <FormControl><Input {...field} placeholder="Ex: 261676" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {status && (
                    <p className="col-span-2 -mt-2 text-xs text-muted-foreground">{STATUS_HINTS[status]}</p>
                  )}
                </div>

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.courses.form.title')}</FormLabel>
                    <FormControl><Input {...field} onChange={e => field.onChange(upperNoAccents(e.target.value))} placeholder="Ex: Manejo Integrado de Pragas no Milho" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="roomId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.courses.form.room')}</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={roomsLoading ? t('common.loading') : t('admin.courses.form.selectRoom')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms?.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name} (cap. {r.maxCapacity})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormItem>
                    <FormLabel>{t('admin.courses.form.startDate')}</FormLabel>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <FormField control={form.control} name="startDate" render={({ field }) => (
                        <DatePicker value={field.value ?? ''} onChange={field.onChange} />
                      )} />
                      <FormField control={form.control} name="startHour" render={({ field }) => (
                        <FormControl><Input type="time" {...field} className="w-27.5" /></FormControl>
                      )} />
                    </div>
                    <FormMessage>{form.formState.errors.startDate?.message ?? form.formState.errors.startHour?.message}</FormMessage>
                  </FormItem>
                  <FormItem>
                    <FormLabel>{t('admin.courses.form.endDate')}</FormLabel>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <FormField control={form.control} name="endDate" render={({ field }) => (
                        <DatePicker value={field.value ?? ''} onChange={field.onChange} />
                      )} />
                      <FormField control={form.control} name="endHour" render={({ field }) => (
                        <FormControl><Input type="time" {...field} className="w-27.5" /></FormControl>
                      )} />
                    </div>
                    <FormMessage>{form.formState.errors.endDate?.message ?? form.formState.errors.endHour?.message}</FormMessage>
                  </FormItem>
                </div>

                <FormItem>
                  <FormLabel>{t('admin.courses.form.regDeadlineDate')}</FormLabel>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <FormField control={form.control} name="regDeadlineDate" render={({ field }) => (
                      <DatePicker value={field.value ?? ''} onChange={field.onChange} />
                    )} />
                    <FormField control={form.control} name="regDeadlineHour" render={({ field }) => (
                      <FormControl><Input type="time" {...field} className="w-27.5" /></FormControl>
                    )} />
                  </div>
                  <p className="text-xs text-muted-foreground">Sem hora: vale até o fim do dia.</p>
                </FormItem>

                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.courses.form.price')}</FormLabel>
                      <FormControl><Input type="number" min="0" step="0.01" placeholder="0" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} onBlur={field.onBlur} ref={field.ref} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="workloadHours" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.courses.form.workload')}</FormLabel>
                      <FormControl><Input type="number" min="0" placeholder="0" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} onBlur={field.onBlur} ref={field.ref} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="minStudents" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.courses.form.minStudents')}</FormLabel>
                      <FormControl><Input type="number" min="0" placeholder="0" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} onBlur={field.onBlur} ref={field.ref} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="observations" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.courses.form.observations')}</FormLabel>
                    <FormControl><Input {...field} onChange={e => field.onChange(upperNoAccents(e.target.value))} placeholder="Ex: Maiores de 18 anos" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {source && source.instructors.length > 0 && (
                  <div className="space-y-2">
                    <Label>Instrutores</Label>
                    <p className="text-xs text-muted-foreground">Os marcados serão copiados para o novo curso.</p>
                    <ul className="flex flex-col gap-1.5">
                      {source.instructors.map(i => (
                        <li key={i.id}>
                          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                            <input
                              type="checkbox"
                              className="size-4 accent-primary"
                              checked={keptInstructors.has(i.id)}
                              onChange={() => toggleInstructor(i.id)}
                            />
                            <span className="font-medium">{i.name}</span>
                            {(i.title || i.category) && (
                              <span className="text-xs text-muted-foreground">{[i.title, i.category].filter(Boolean).join(' · ')}</span>
                            )}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="description" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.courses.form.fullDescription')}</FormLabel>
                    <FormControl>
                      <div data-color-mode="light" className="rounded-md overflow-hidden border border-input">
                        <MDEditor
                          value={field.value ?? ''}
                          onChange={val => field.onChange(val ?? '')}
                          onBlur={field.onBlur}
                          height={380}
                          preview="live"
                          visibleDragbar={false}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>

              <TabsContent value="images" className="flex-1 overflow-y-auto px-6 py-4">
                {isCreating
                  ? <StagedImagesTab
                      stagedBanner={stagedBanner}
                      onBannerChange={setStagedBanner}
                      stagedPhotos={stagedPhotos}
                      onPhotosChange={setStagedPhotos}
                      copiedCover={source && copyCover ? source.coverImage : null}
                      onCopiedCoverRemove={() => setCopyCover(false)}
                    />
                  : <BannerTab courseId={editing?.id ?? null} />}
              </TabsContent>
            </Tabs>

            {form.formState.errors.root && (
              <div className="px-6"><ErrorAlert message={form.formState.errors.root.message ?? null} /></div>
            )}

            <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-2 shrink-0">
              <Button type="button" variant="outline" onClick={requestClose}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={!form.formState.isValid || isPending}>
                {isPending
                  ? (isCreating ? t('admin.courses.form.creating') : t('admin.courses.form.saving'))
                  : (isCreating ? t('admin.courses.form.create') : t('admin.courses.form.save'))}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    <ConfirmCloseDialog
      open={confirmClose}
      onConfirm={() => { setConfirmClose(false); onClose() }}
      onCancel={() => setConfirmClose(false)}
    />
    </>
  )
}
