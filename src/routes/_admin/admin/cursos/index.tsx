import { createFileRoute, Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionButton } from '@/components/PermissionButton'
import { useTranslation } from 'react-i18next'
import { useAdminCourse, useDeleteCourse, useUploadGalleryPhoto, useAssignInstructor, useRemoveInstructorAssignment, adminCourseQuery, useCompleteCourse } from '@/hooks/useCourse'
import type { CourseCardItem } from '@/hooks/useCourse'
import { useInstructors } from '@/hooks/useAdmin'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { formatBRL } from '@/utils/format-currency'
import { upperNoAccents } from '@/utils/text-format'
import { copyText } from '@/lib/copy-text'
import { courseViewFromSlug, courseViewToSlug, parseCourseViewSlug, type CourseViewSlug } from '@/lib/course-views'
import { Plus, Building2, GraduationCap, Calendar, BookOpen, Images, ChevronLeft, ChevronRight, X, Pencil, Trash2, Clock, MapPin, User, ImageUp, ImagePlus, ExternalLink, Link2, CopyPlus, CircleCheckBig } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent, tabsWrapClass } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import type { Course } from '@/@types/course'
import { StatusBadge } from '@/components/StatusBadge'
import { ErrorAlert } from '@/components/ErrorAlert'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { NativeSelect } from '@/components/ui/native-select'
import { useRowSelection } from '@/hooks/useRowSelection'
import { ExportOneButton } from '@/components/export/ExportMenu'
import { CourseFormDialog } from '@/components/courses/CourseFormDialog'
import { CoursesList } from '@/components/courses/CoursesList'
import { RegistrationsTab } from '@/components/courses/RegistrationsTab'
import { PhotoGrid } from '@/components/courses/PhotoGrid'
import { AjudaLink } from '@/components/ajuda/AjudaLink'
import { useConfirmDeletePhoto, photoCountLabel } from '@/hooks/useConfirmDeletePhoto'

function calcDaysUntil(startDate: string) {
  if (!startDate) return 0
  return Math.ceil((new Date(startDate).getTime() - Date.now()) / 86_400_000)
}



// ─── gallery manager ──────────────────────────────────────────────────────────

function GalleryManager({ course }: { course: Course }) {
  const uploadPhoto = useUploadGalleryPhoto(course.id)
  const removePhoto = useConfirmDeletePhoto(course.id)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const { t } = useTranslation()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    try {
      await uploadPhoto.mutateAsync(file)
      toast.success('Foto adicionada!')
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, 'Upload error.')
      setUploadError(msg)
      toast.error(msg)
    }
    e.target.value = ''
  }

  const photos = course.photoGallery ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{photoCountLabel(photos.length)}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadPhoto.isPending}
        >
          <ImagePlus className="size-4" />
          {uploadPhoto.isPending ? 'Enviando...' : t('admin.courses.galleryUpload')}
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      <ErrorAlert message={uploadError} />

      {photos.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground">
          <Images className="size-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t('admin.courses.galleryEmpty')}</p>
        </div>
      ) : (
        <PhotoGrid
          photos={photos.map(p => ({ key: p.id, url: p.url, caption: p.caption }))}
          onRemove={removePhoto.ask}
          disabled={removePhoto.pending}
        />
      )}

      {removePhoto.dialog}
    </div>
  )
}


// ─── view dialog ─────────────────────────────────────────────────────────────

type ViewTab = 'details' | 'registrations' | 'gallery' | 'instructors'

function ViewDialog({
  course,
  initialTab = 'details',
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  course: CourseCardItem | null
  /** Aba aberta ao montar (link das notificações: `?aba=inscricoes`). */
  initialTab?: ViewTab
  onClose: () => void
  onEdit: (c: Course) => void
  onDuplicate: (c: Course) => void
  onDelete: (id: string, title: string) => void
}) {
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [selInstrId, setSelInstrId] = useState('')
  const [instrTitle, setInstrTitle] = useState('')
  const [instrCategory, setInstrCategory] = useState('')
  const [removeInstr, setRemoveInstr] = useState<{ id: string; name: string } | null>(null)
  const { t } = useTranslation()
  const { can } = usePermissions()

  const { data: detail, isLoading: detailLoading, isError: detailError, isFetching: detailFetching, refetch: refetchDetail } = useAdminCourse(course?.id ?? '')
  const { data: instructors } = useInstructors()
  const assignInstructor = useAssignInstructor(course?.id ?? '')
  const removeAssignment = useRemoveInstructorAssignment(course?.id ?? '')
  const completeCourse = useCompleteCourse()
  const [completeOpen, setCompleteOpen] = useState(false)

  async function handleComplete() {
    if (!course) return
    try {
      await completeCourse.mutateAsync(course.id)
      toast.success('Curso concluído.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível concluir o curso.'))
    } finally {
      setCompleteOpen(false)
    }
  }

  async function handleAssignInstructor() {
    if (!selInstrId) return
    try {
      // apiFetch lança em não-2xx, então não há branch !res.ok — o erro real
      // do backend (ex.: "Instrutor já vinculado") vem no catch.
      await assignInstructor.mutateAsync({
        instructorUserDataId: selInstrId,
        title: instrTitle || undefined,
        category: instrCategory || undefined,
      })
      setSelInstrId('')
      setInstrTitle('')
      setInstrCategory('')
      toast.success('Instrutor adicionado!')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao adicionar instrutor.'))
    }
  }

  async function handleRemoveInstructor() {
    if (!removeInstr) return
    try {
      await removeAssignment.mutateAsync(removeInstr.id)
      toast.success('Instrutor removido.')
      setRemoveInstr(null)
    } catch {
      toast.error('Erro ao remover instrutor.')
    }
  }

  const liveCourse = detail ?? null
  // Sem o detalhe, as abas Detalhes, Galeria e Instrutores ficavam em branco ou
  // diziam "Nenhum instrutor vinculado" — que podia não ser verdade.
  const detailFailed = !detail && detailError
  const detailErrorBox = (
    <LoadErrorRetry
      className="rounded-xl border bg-card"
      message="Não foi possível carregar os dados deste curso."
      onRetry={() => void refetchDetail()}
      retrying={detailFetching}
    />
  )

  if (!course) return null

  // Cabeçalho com os dados ao vivo (status muda ao iniciar o curso; contagem ao
  // cancelar/inscrever) — o card aberto é só uma foto do momento do clique.
  const status = liveCourse?.status ?? course.status
  const title = liveCourse?.title ?? course.title
  const eventNumber = liveCourse ? liveCourse.eventNumber : course.eventNumber
  const enrolled = liveCourse?.enrolled ?? course.enrolled
  const photoCount = liveCourse ? (liveCourse.photoGallery?.length ?? 0) : (course.photoCount ?? 0)
  const publicPath = `/cursos/${course.id}`

  async function copyPublicLink() {
    const ok = await copyText(`${window.location.origin}${publicPath}`)
    if (ok) toast.success('Link do curso copiado.')
    else toast.error('Não foi possível copiar o link.')
  }

  const coverImage = liveCourse?.coverImage ?? course.coverImage
  const allImages = [
    ...(coverImage ? [{ url: coverImage, caption: '' }] : []),
    ...(liveCourse?.photoGallery ?? []),
  ]
  const totalImages = allImages.length
  const daysUntil = liveCourse ? calcDaysUntil(liveCourse.startDate) : 0

  return (
    <>
    <Dialog open={!!course} onOpenChange={onClose}>
      {/* grid-cols-[minmax(0,1fr)]: sem isso a coluna do grid cresce até o conteúdo mais largo (abas) e corta a janela no celular. */}
      <DialogContent className="sm:max-w-4xl max-h-[90vh] grid-cols-[minmax(0,1fr)] overflow-y-auto overflow-x-hidden p-0" showCloseButton={false}>
        {/* Image / Gallery */}
        <div className="relative h-64 bg-muted flex items-center justify-center overflow-hidden">
          {totalImages > 0 ? (
            <>
              <img
                src={allImages[galleryIndex]?.url}
                alt={title}
                className="h-full w-full object-cover"
              />
              {totalImages > 1 && (
                <>
                  <button
                    aria-label="Imagem anterior"
                    onClick={e => { e.stopPropagation(); setGalleryIndex(i => (i - 1 + totalImages) % totalImages) }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 size-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    aria-label="Próxima imagem"
                    onClick={e => { e.stopPropagation(); setGalleryIndex(i => (i + 1) % totalImages) }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 size-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                    {allImages.map((_, i) => (
                      <button
                        key={i}
                        aria-label={`Ir para imagem ${i + 1}`}
                        onClick={e => { e.stopPropagation(); setGalleryIndex(i) }}
                        className={`size-2 rounded-full transition-colors ${i === galleryIndex ? 'bg-primary' : 'bg-background/60'}`}
                      />
                    ))}
                  </div>
                </>
              )}
              {allImages[galleryIndex]?.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent p-4">
                  <p className="text-white text-sm">{allImages[galleryIndex].caption}</p>
                </div>
              )}
            </>
          ) : (
            <BookOpen className="size-16 text-muted-foreground/30" />
          )}
          <button
            aria-label="Fechar"
            onClick={onClose}
            className="absolute top-3 right-3 size-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <Tabs defaultValue={initialTab}>
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={status} />
              {eventNumber && (
                <span className="text-sm text-muted-foreground font-mono">#{eventNumber}</span>
              )}
            </div>
            <DialogTitle className="text-2xl font-bold text-foreground mb-2">{title}</DialogTitle>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              {status === 'UNPUBLISHED' ? (
                <p className="text-xs text-muted-foreground">Rascunho: a página deste curso não abre no site.</p>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
                    <a href={publicPath} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5" /> Ver no site
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={copyPublicLink}>
                    <Link2 className="size-3.5" /> Copiar link
                  </Button>
                </>
              )}
            </div>

            <TabsList className={tabsWrapClass}>
              <TabsTrigger value="details">{t('admin.courses.tabs.info')}</TabsTrigger>
              <TabsTrigger value="registrations">
                {t('admin.courses.registrations')}
                {enrolled > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                    {enrolled}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="gallery">
                {t('admin.courses.tabs.images')}
                {photoCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                    {photoCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="instructors">
                <GraduationCap className="size-3.5 mr-1" />
                Instrutores
                {(liveCourse?.instructors?.length ?? 0) > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                    {liveCourse!.instructors.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="px-6 pb-2 mt-4">
            {detailLoading ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                </div>
              </div>
            ) : liveCourse ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {[
                    { icon: Calendar, label: t('admin.courses.form.startDate').replace(' *', ''), value: formatDateFromString(liveCourse.startDate) },
                    { icon: Calendar, label: t('admin.courses.form.endDate').replace(' *', ''), value: formatDateFromString(liveCourse.endDate) },
                    { icon: Clock, label: t('courseDetail.schedule'), value: liveCourse.startTime && liveCourse.endTime ? `${liveCourse.startTime} – ${liveCourse.endTime}` : '—' },
                    { icon: BookOpen, label: t('admin.courses.form.workload'), value: liveCourse.workloadHours ? `${liveCourse.workloadHours}h` : '—' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-muted/50 rounded-xl p-3 text-center">
                      <Icon className="size-5 mx-auto mb-1 text-primary" />
                      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
                      <div className="font-medium text-sm">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-2 text-sm mb-6">
                  {liveCourse.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t('courseDetail.location')}:</span>
                      <span className="font-medium">{liveCourse.location}</span>
                    </div>
                  )}
                  {liveCourse.instructorName && (
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t('courseDetail.instructor')}:</span>
                      <span className="font-medium">{liveCourse.instructorName}</span>
                    </div>
                  )}
                  {liveCourse.registrationDeadline && (
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t('admin.courses.form.regDeadlineDate')}:</span>
                      <span className="font-medium">{formatDateFromString(liveCourse.registrationDeadline)}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                  {[
                    { label: t('admin.courses.registrations'), value: liveCourse.enrolled, cls: 'bg-primary/10 text-primary' },
                    { label: t('admin.courses.form.minStudents'), value: liveCourse.minStudents ?? '—', cls: 'bg-muted text-foreground' },
                    { label: 'Máx.', value: liveCourse.maxStudents, cls: 'bg-muted text-foreground' },
                    { label: 'Dias', value: daysUntil, cls: `bg-muted ${daysUntil < 0 ? 'text-destructive' : 'text-foreground'}` },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className={`${cls} rounded-xl p-3 text-center`}>
                      <div className="text-2xl font-bold">{value}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
                    </div>
                  ))}
                </div>

                <Separator className="mb-6" />

                {liveCourse.description && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-foreground flex items-center gap-2">
                      <BookOpen className="size-4" /> {t('admin.courses.form.fullDescription')}
                    </h4>
                    {/* Mesmo markdown da página pública do curso */}
                    <div className="bg-muted/30 p-4 rounded-xl overflow-hidden wrap-anywhere prose prose-sm dark:prose-invert max-w-none text-muted-foreground prose-headings:text-foreground prose-headings:font-semibold prose-strong:text-foreground prose-a:text-primary">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {liveCourse.description}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm pb-2">
                  <div>
                    <span className="text-muted-foreground">{t('admin.courses.form.price')}: </span>
                    <span className="font-semibold text-primary">
                      {liveCourse.price === 0 ? t('courseCard.free') : formatBRL(liveCourse.price)}
                    </span>
                  </div>
                  {liveCourse.observations && (
                    <div>
                      <span className="text-muted-foreground">{t('admin.courses.form.observations')}: </span>
                      <span className="font-medium">{liveCourse.observations}</span>
                    </div>
                  )}
                </div>
              </>
            ) : detailFailed ? detailErrorBox : null}
          </TabsContent>

          <TabsContent value="registrations" className="px-6 pb-4 mt-4">
            <RegistrationsTab courseId={course.id} eventNumber={eventNumber} courseTitle={title} courseStatus={status} />
          </TabsContent>

          <TabsContent value="gallery" className="px-6 pb-4 mt-4">
            {detailLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
              </div>
            ) : liveCourse ? (
              <GalleryManager course={liveCourse} />
            ) : detailFailed ? detailErrorBox : null}
          </TabsContent>

          <TabsContent value="instructors" className="px-6 pb-4 mt-4">
            {detailLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : detailFailed ? detailErrorBox : (
              <div className="flex flex-col gap-4">
                {(liveCourse?.instructors ?? []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-xl text-center">
                    <GraduationCap className="size-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-foreground">Nenhum instrutor vinculado</p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {(liveCourse?.instructors ?? []).map(a => (
                      <li key={a.id} className="flex items-center justify-between rounded-lg border px-4 py-3 bg-card">
                        <div className="flex items-center gap-3">
                          {a.avatar
                            ? <img src={a.avatar} alt={a.name} className="size-9 rounded-full object-cover border shrink-0" />
                            : <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center border shrink-0"><GraduationCap className="size-4 text-primary/60" /></div>
                          }
                          <div>
                            <p className="text-sm font-medium">{a.name}</p>
                            {(a.title || a.category) && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {[a.title, a.category].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-7 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                          disabled={removeAssignment.isPending}
                          onClick={() => setRemoveInstr({ id: a.id, name: a.name })}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {can('UPDATE_COURSE') && (
                  <div className="border-t pt-4 flex flex-col gap-3">
                    <p className="text-sm font-semibold">Adicionar instrutor</p>
                    <NativeSelect
                      value={selInstrId}
                      onChange={e => setSelInstrId(e.target.value)}
                      className="h-9 disabled:opacity-50"
                    >
                      <option value="">Selecione um instrutor...</option>
                      {(instructors ?? [])
                        .filter(i => !(liveCourse?.instructors ?? []).some(a => a.userDataId === i.userData.id))
                        .map(i => (
                          <option key={i.userData.id} value={i.userData.id}>{i.userData.name}</option>
                        ))
                      }
                    </NativeSelect>
                    <Input
                      placeholder="Título (ex: Engenheiro Agrônomo)"
                      value={instrTitle}
                      onChange={e => setInstrTitle(upperNoAccents(e.target.value))}
                      className="h-9"
                    />
                    <Input
                      placeholder="Categoria (ex: Palestrante)"
                      value={instrCategory}
                      onChange={e => setInstrCategory(upperNoAccents(e.target.value))}
                      className="h-9"
                    />
                    <Button
                      size="sm"
                      disabled={!selInstrId || assignInstructor.isPending}
                      onClick={handleAssignInstructor}
                      className="self-end"
                    >
                      {assignInstructor.isPending ? 'Adicionando...' : 'Adicionar'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="border-t p-4 flex justify-between gap-2 bg-muted/30 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <PermissionButton
              allowed={can('UPDATE_COURSE')}
              noPermissionMessage="Sem permissão para alterar banner"
              variant="outline"
              onClick={() => { if (liveCourse) { onEdit(liveCourse); onClose() } }}
            >
              <ImageUp className="size-4" /> {t('admin.courses.bannerUpload')}
            </PermissionButton>
            <PermissionButton
              allowed={can('CREATE_COURSE')}
              noPermissionMessage="Sem permissão para criar cursos"
              variant="outline"
              disabled={!liveCourse}
              onClick={() => { if (liveCourse) { onDuplicate(liveCourse); onClose() } }}
            >
              <CopyPlus className="size-4" /> Duplicar
            </PermissionButton>
            <ExportOneButton dataset="courses" id={course.id} label="Exportar curso" />
            {status === 'IN_PROGRESS' && (
              <PermissionButton
                allowed={can('UPDATE_COURSE')}
                noPermissionMessage="Sem permissão para concluir cursos"
                variant="outline"
                disabled={completeCourse.isPending}
                onClick={() => setCompleteOpen(true)}
              >
                <CircleCheckBig className="size-4" /> Concluir curso
              </PermissionButton>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
            <PermissionButton
              allowed={can('DELETE_COURSE')}
              noPermissionMessage="Sem permissão para excluir cursos"
              variant="outline"
              onClick={() => onDelete(course.id, title)}
            >
              <Trash2 className="size-4 text-destructive" /> {t('common.delete')}
            </PermissionButton>
            <PermissionButton
              allowed={can('UPDATE_COURSE')}
              noPermissionMessage="Sem permissão para editar cursos"
              onClick={() => { if (liveCourse) { onEdit(liveCourse); onClose() } }}
            >
              <Pencil className="size-4" /> {t('common.edit')}
            </PermissionButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <DeleteConfirmDialog
      open={!!removeInstr}
      onOpenChange={open => { if (!open) setRemoveInstr(null) }}
      title="Remover instrutor"
      description={<>Tem certeza que deseja remover <strong>{removeInstr?.name}</strong> deste curso? Esta ação não pode ser desfeita.</>}
      onConfirm={handleRemoveInstructor}
      pending={removeAssignment.isPending}
      confirmLabel="Remover"
      pendingLabel="Removendo..."
    />

    <AlertDialog open={completeOpen} onOpenChange={open => { if (!completeCourse.isPending) setCompleteOpen(open) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Concluir curso</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{title}</strong> passa para "Concluído". A página do curso continua abrindo pelo link, sem aceitar inscrições.
            Para desfazer, altere o status na edição do curso.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={completeCourse.isPending}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            disabled={completeCourse.isPending}
            onClick={e => { e.preventDefault(); handleComplete() }}
          >
            {completeCourse.isPending ? 'Concluindo...' : 'Concluir curso'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}


// ─── route ────────────────────────────────────────────────────────────────────

// `?curso=<id>&aba=inscricoes` abre direto a janela do curso (links das notificações).
const ABAS: Record<string, ViewTab> = {
  detalhes: 'details',
  inscricoes: 'registrations',
  imagens: 'gallery',
  instrutores: 'instructors',
}

// `?lista=armazenados` é a aba "Armazenados" da lista; sem ele abre "Próximos".
// (`aba` é a aba da JANELA do curso, outra coisa.)
type CoursesSearch = { curso?: string; aba?: string; ano?: number; lista?: CourseViewSlug }

export const Route = createFileRoute('/_admin/admin/cursos/')({
  validateSearch: (s: Record<string, unknown>): CoursesSearch => ({
    // O parser da URL transforma "123" em número; o id volta a ser texto.
    curso: typeof s.curso === 'string' && s.curso ? s.curso : typeof s.curso === 'number' ? String(s.curso) : undefined,
    aba: typeof s.aba === 'string' && Object.hasOwn(ABAS, s.aba) ? s.aba : undefined,
    // O ano fica na URL: a lista filtrada pode ir para os favoritos.
    ano: Number.isInteger(Number(s.ano)) && Number(s.ano) >= 1990 && Number(s.ano) <= 2100
      ? Number(s.ano)
      : undefined,
    lista: parseCourseViewSlug(s.lista),
  }),
  component: RouteComponent,
})

type FormDialogState = { open: boolean; editing: Course | null; duplicateOf: Course | null }
const closedForm: FormDialogState = { open: false, editing: null, duplicateOf: null }

function RouteComponent() {
  const { ano, lista } = Route.useSearch()
  const view = courseViewFromSlug(lista)
  const deleteCourse = useDeleteCourse()
  const queryClient = useQueryClient()
  const [viewDialog, setViewDialog] = useState<CourseCardItem | null>(null)
  const [formDialog, setFormDialog] = useState<FormDialogState>(closedForm)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null)
  const { t } = useTranslation()
  const { can } = usePermissions()

  // Link direto (`?curso=<id>&aba=inscricoes`): busca o curso e abre a janela dele.
  // Vale para qualquer curso, esteja ele em Próximos ou em Armazenados.
  const { curso: linkedId, aba } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: linkedCourse, isError: linkedError } = useAdminCourse(linkedId ?? '')
  // Outro link chegou com a página já aberta: ele passa na frente do curso clicado antes.
  const [lastLinkedId, setLastLinkedId] = useState(linkedId)
  // Fechado pela pessoa: some na hora, sem esperar a URL ser limpa.
  const [dismissedId, setDismissedId] = useState<string | null>(null)
  if (lastLinkedId !== linkedId) {
    setLastLinkedId(linkedId)
    setDismissedId(null)
    if (linkedId) setViewDialog(null)
  }
  const shownCourse: CourseCardItem | null = viewDialog
    ?? (linkedId && linkedId !== dismissedId && linkedCourse?.id === linkedId
      ? { ...linkedCourse, photoCount: linkedCourse.photoGallery?.length ?? 0 }
      : null)

  function clearLink() {
    if (linkedId || aba) {
      navigate({ search: prev => ({ ...prev, curso: undefined, aba: undefined }), replace: true, resetScroll: false })
    }
  }

  function closeView() {
    setViewDialog(null)
    if (linkedId) setDismissedId(linkedId)
    clearLink()
  }

  // Curso do link não existe mais (ou sem acesso): avisa e limpa a URL.
  useEffect(() => {
    if (!linkedId || !linkedError) return
    toast.error('Não foi possível abrir o curso do link.')
    navigate({ search: prev => ({ ...prev, curso: undefined, aba: undefined }), replace: true, resetScroll: false })
  }, [linkedId, linkedError, navigate])

  const selection = useRowSelection()
  // A seleção vale para a aba que está na tela. O clique na aba já a zera
  // (CoursesList); aqui cobre a troca que vem da URL (botão voltar do navegador).
  const [selectionView, setSelectionView] = useState(view)
  if (selectionView !== view) {
    setSelectionView(view)
    selection.clear()
  }

  async function handleDelete(id: string) {
    try {
      await deleteCourse.mutateAsync(id)
      selection.remove(id)
      toast.success('Curso excluído.')
      setDeleteConfirm(null)
      closeView()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao excluir curso.'
      toast.error(msg)
    }
  }

  // Editar/duplicar pelo menu do card: o card só tem o resumo, busca o curso completo.
  async function openFormFromCard(courseId: string, mode: 'edit' | 'duplicate') {
    try {
      const course = await queryClient.fetchQuery(adminCourseQuery(courseId))
      setFormDialog(mode === 'edit'
        ? { open: true, editing: course, duplicateOf: null }
        : { open: true, editing: null, duplicateOf: course })
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível abrir o curso.'))
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('admin.courses.title')}</h1>
          <AjudaLink topico="cursos" titulo="Cursos" />
        </div>
        <div className="flex gap-2 shrink-0">
          {can('READ_COURSE') && (
            <Button asChild variant="outline">
              <Link to="/admin/configuracoes" search={{ tab: 'salas' as const }}>
                <Building2 className="size-4" /> {t('admin.rooms.title')}
              </Link>
            </Button>
          )}
          <PermissionButton
            allowed={can('CREATE_COURSE')}
            noPermissionMessage="Sem permissão para criar cursos"
            onClick={() => setFormDialog({ open: true, editing: null, duplicateOf: null })}
          >
            <Plus className="size-4" /> {t('admin.courses.newCourse')}
          </PermissionButton>
        </div>
      </div>

      <CoursesList
        view={view}
        onViewChange={v => navigate({ search: prev => ({ ...prev, lista: courseViewToSlug(v) }), resetScroll: false })}
        year={ano}
        onYearChange={y => navigate({ search: prev => ({ ...prev, ano: y }) })}
        selection={selection}
        onOpen={course => { clearLink(); setViewDialog(course) }}
        onCreate={() => setFormDialog({ open: true, editing: null, duplicateOf: null })}
        onEdit={id => openFormFromCard(id, 'edit')}
        onDuplicate={id => openFormFromCard(id, 'duplicate')}
        onDelete={setDeleteConfirm}
      />

      {/* key por curso: trocar de curso remonta o dialog (galeria na 1ª imagem, instrutor em branco) */}
      <ViewDialog
        key={shownCourse?.id ?? ''}
        course={shownCourse}
        initialTab={!viewDialog && aba ? ABAS[aba] : 'details'}
        onClose={closeView}
        onEdit={c => setFormDialog({ open: true, editing: c, duplicateOf: null })}
        onDuplicate={c => setFormDialog({ open: true, editing: null, duplicateOf: c })}
        onDelete={(id, title) => setDeleteConfirm({ id, title })}
      />

      <CourseFormDialog
        open={formDialog.open}
        editing={formDialog.editing}
        duplicateOf={formDialog.duplicateOf}
        onClose={() => setFormDialog(closedForm)}
      />

      <DeleteConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={open => { if (!open) setDeleteConfirm(null) }}
        title={t('admin.courses.deleteConfirmTitle')}
        description={t('admin.courses.deleteConfirmDesc', { title: deleteConfirm?.title ?? '' })}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
        pending={deleteCourse.isPending}
        confirmLabel={t('admin.courses.deleteConfirm')}
        pendingLabel={t('admin.courses.deleting')}
        cancelLabel={t('admin.courses.deleteCancel')}
      />
    </div>
  )
}
