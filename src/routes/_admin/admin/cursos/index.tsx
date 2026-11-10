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
import { Plus, Building2, GraduationCap, BookOpen, Images, ChevronLeft, ChevronRight, X, Pencil, Trash2, ImageUp, ImagePlus, ExternalLink, Link2, CopyPlus, CircleCheckBig } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent, tabsWrapClass } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { Course } from '@/@types/course'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'
import { ErrorAlert } from '@/components/ErrorAlert'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { NativeSelect } from '@/components/ui/native-select'
import { EmptyState } from '@/components/EmptyState'
import { InitialsAvatar } from '@/components/InitialsAvatar'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { RowActions } from '@/components/RowActions'
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
      toast.success('Foto adicionada.')
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground tabular-nums">{photoCountLabel(photos.length)}</p>
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
        <EmptyState framed icon={Images} title={t('admin.courses.galleryEmpty')} className="py-10" />
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
      toast.success('Instrutor adicionado.')
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
      className="rounded-xl border border-border bg-card"
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
                    className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-float transition-colors hover:bg-background"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    aria-label="Próxima imagem"
                    onClick={e => { e.stopPropagation(); setGalleryIndex(i => (i + 1) % totalImages) }}
                    className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-float transition-colors hover:bg-background"
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
                  {/* Legenda sobre a foto: texto branco no véu escuro, nos dois temas. */}
                  <p className="text-sm text-white">{allImages[galleryIndex].caption}</p>
                </div>
              )}
            </>
          ) : (
            <BookOpen className="size-12 text-faint-foreground" aria-hidden />
          )}
          <button
            aria-label="Fechar"
            onClick={onClose}
            className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-float transition-colors hover:bg-background"
          >
            <X className="size-4" />
          </button>
        </div>

        <Tabs defaultValue={initialTab}>
          <div className="flex flex-col gap-3 px-6 pt-5">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                {eventNumber && (
                  <span className="num text-sm text-muted-foreground">#{eventNumber}</span>
                )}
              </div>
              <DialogTitle className="text-xl leading-7 font-semibold text-balance text-foreground">{title}</DialogTitle>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {status === 'UNPUBLISHED' ? (
                <p className="text-xs text-muted-foreground">Rascunho: a página deste curso não abre no site.</p>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm">
                    <a href={publicPath} target="_blank" rel="noopener noreferrer">
                      <ExternalLink /> Ver no site
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyPublicLink}>
                    <Link2 /> Copiar link
                  </Button>
                </>
              )}
            </div>

            <TabsList className={tabsWrapClass}>
              <TabsTrigger value="details">{t('admin.courses.tabs.info')}</TabsTrigger>
              <TabsTrigger value="registrations">
                {t('admin.courses.registrations')}
                {enrolled > 0 && <span className="text-xs tabular-nums text-faint-foreground">{enrolled}</span>}
              </TabsTrigger>
              <TabsTrigger value="gallery">
                {t('admin.courses.tabs.images')}
                {photoCount > 0 && <span className="text-xs tabular-nums text-faint-foreground">{photoCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="instructors">
                Instrutores
                {(liveCourse?.instructors?.length ?? 0) > 0 && (
                  <span className="text-xs tabular-nums text-faint-foreground">{liveCourse!.instructors.length}</span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="px-6 pb-2">
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
              <div className="flex flex-col gap-6">
                {/* Os dados do curso numa lista de rótulo e valor; datas, horário e preço em mono. */}
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                  {[
                    { label: t('admin.courses.form.startDate').replace(' *', ''), value: formatDateFromString(liveCourse.startDate), num: true },
                    { label: t('admin.courses.form.endDate').replace(' *', ''), value: formatDateFromString(liveCourse.endDate), num: true },
                    { label: t('courseDetail.schedule'), value: liveCourse.startTime && liveCourse.endTime ? `${liveCourse.startTime} – ${liveCourse.endTime}` : '—', num: true },
                    { label: t('admin.courses.form.workload'), value: liveCourse.workloadHours ? `${liveCourse.workloadHours}h` : '—', num: true },
                    ...(liveCourse.location ? [{ label: t('courseDetail.location'), value: liveCourse.location, num: false }] : []),
                    ...(liveCourse.instructorName ? [{ label: t('courseDetail.instructor'), value: liveCourse.instructorName, num: false }] : []),
                    ...(liveCourse.registrationDeadline
                      ? [{ label: t('admin.courses.form.regDeadlineDate'), value: formatDateFromString(liveCourse.registrationDeadline), num: true }]
                      : []),
                    { label: t('admin.courses.form.price'), value: liveCourse.price === 0 ? t('courseCard.free') : formatBRL(liveCourse.price), num: liveCourse.price !== 0 },
                  ].map(({ label, value, num }) => (
                    <div key={label} className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className={cn('text-sm font-medium wrap-break-word text-foreground', num && 'num')}>{value}</dd>
                    </div>
                  ))}
                </dl>

                {/* Vagas: quatro números lado a lado, separados por linha fina. */}
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
                  {[
                    { label: t('admin.courses.registrations'), value: liveCourse.enrolled, cls: 'text-primary' },
                    { label: t('admin.courses.form.minStudents'), value: liveCourse.minStudents ?? '—', cls: 'text-foreground' },
                    { label: 'Máx.', value: liveCourse.maxStudents, cls: 'text-foreground' },
                    { label: 'Dias', value: daysUntil, cls: daysUntil < 0 ? 'text-destructive' : 'text-foreground' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="flex flex-col gap-0.5 bg-card px-4 py-3">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className={cn('text-xl font-semibold tabular-nums', cls)}>{value}</div>
                    </div>
                  ))}
                </div>

                {liveCourse.description && (
                  <div className="flex flex-col gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{t('admin.courses.form.fullDescription')}</h4>
                    {/* Mesmo markdown da página pública do curso */}
                    <div className="prose prose-sm max-w-none overflow-hidden rounded-xl border border-border p-4 wrap-anywhere text-muted-foreground dark:prose-invert prose-headings:font-semibold prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {liveCourse.description}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {liveCourse.observations && (
                  <div className="flex flex-col gap-0.5 pb-2 text-sm">
                    <span className="text-xs text-muted-foreground">{t('admin.courses.form.observations')}</span>
                    <span className="text-foreground">{liveCourse.observations}</span>
                  </div>
                )}
              </div>
            ) : detailFailed ? detailErrorBox : null}
          </TabsContent>

          <TabsContent value="registrations" className="px-6 pb-4">
            <RegistrationsTab courseId={course.id} eventNumber={eventNumber} courseTitle={title} courseStatus={status} />
          </TabsContent>

          <TabsContent value="gallery" className="px-6 pb-4">
            {detailLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
              </div>
            ) : liveCourse ? (
              <GalleryManager course={liveCourse} />
            ) : detailFailed ? detailErrorBox : null}
          </TabsContent>

          <TabsContent value="instructors" className="px-6 pb-4">
            {detailLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : detailFailed ? detailErrorBox : (
              <div className="flex flex-col gap-4">
                {(liveCourse?.instructors ?? []).length === 0 ? (
                  <EmptyState framed icon={GraduationCap} title="Nenhum instrutor vinculado" className="py-10" />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {(liveCourse?.instructors ?? []).map(a => (
                      <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <InitialsAvatar name={a.name} avatar={a.avatar} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium wrap-break-word text-foreground">{a.name}</p>
                            {(a.title || a.category) && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {[a.title, a.category].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <RowActions
                          label={`Ações do instrutor ${a.name}`}
                          actions={[
                            { label: 'Remover instrutor', icon: Trash2, destructive: true, disabled: removeAssignment.isPending, onClick: () => setRemoveInstr({ id: a.id, name: a.name }) },
                          ]}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {can('UPDATE_COURSE') && (
                  <div className="flex flex-col gap-3 border-t border-border pt-4">
                    <p className="text-sm font-semibold text-foreground">Adicionar instrutor</p>
                    <NativeSelect
                      value={selInstrId}
                      onChange={e => setSelInstrId(e.target.value)}
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
                    />
                    <Input
                      placeholder="Categoria (ex: Palestrante)"
                      value={instrCategory}
                      onChange={e => setInstrCategory(upperNoAccents(e.target.value))}
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

        <div className="flex flex-wrap justify-between gap-2 border-t border-border bg-muted/50 p-4">
          <div className="flex flex-wrap gap-2">
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
            <PermissionButton
              allowed={can('DELETE_COURSE')}
              noPermissionMessage="Sem permissão para excluir cursos"
              variant="destructive"
              onClick={() => onDelete(course.id, title)}
            >
              <Trash2 className="size-4" /> {t('common.delete')}
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
    <PageContainer>
      <PageHeader
        title={t('admin.courses.title')}
        help={<AjudaLink topico="cursos" titulo="Cursos" />}
        actions={<>
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
        </>}
      />

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
    </PageContainer>
  )
}
