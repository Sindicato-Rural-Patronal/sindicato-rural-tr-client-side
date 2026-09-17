import { createFileRoute, Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { apiErrorMessage } from '@/lib/api-error-message'
import { apiFetch } from '@/lib/api'
import { useState, useRef } from 'react'
import type { ComponentProps } from 'react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FaWhatsapp } from 'react-icons/fa'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionButton } from '@/components/PermissionButton'
import { useTranslation } from 'react-i18next'
import { useAdminCourses, useAdminCourse, useDeleteCourse, useUploadGalleryPhoto, useAssignInstructor, useRemoveInstructorAssignment, adminCourseQuery, fetchAllCourseRegistrations, useAllCourseRegistrations, useAdminRegisterPerson, useConfirmAllRegistrations } from '@/hooks/useCourse'
import type { CourseCardItem } from '@/hooks/useCourse'
import { useCourseRegistrations, useCancelRegistration, useInstructors, useConfirmRegistration, useStartCourse, useUploadRegistrationFicha, useDeleteRegistrationFicha, openRegistrationFicha } from '@/hooks/useAdmin'
import type { UserDataDetail, Registration } from '@/hooks/useAdmin'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { formatBRL } from '@/utils/format-currency'
import { calcAge } from '@/utils/age'
import { upperNoAccents } from '@/utils/text-format'
import { maskCPF, maskPhone } from '@/utils/masks'
import { markdownToPlainText } from '@/lib/markdown-text'
import { whatsappUrl, telHref, uniqueContactLines, phoneKey } from '@/lib/contact-links'
import { copyText } from '@/lib/copy-text'
import { cn } from '@/lib/utils'
import { Plus, Building2, GraduationCap, Calendar, Search, BookOpen, Images, ChevronLeft, ChevronRight, X, Pencil, Trash2, Clock, MapPin, User, ImageUp, ImagePlus, UserCheck, UserX, FileDown, Loader2, CheckCircle2, Circle, PlayCircle, Paperclip, Eye, FileSpreadsheet, Award, CopyPlus, MoreVertical, CheckCheck, UserPlus, Mail, Phone, ExternalLink, Link2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Course } from '@/@types/course'
import { StatusBadge } from '@/components/StatusBadge'
import { ErrorAlert } from '@/components/ErrorAlert'
import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/ui/pagination'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { NativeSelect } from '@/components/ui/native-select'
import { PersonPicker } from '@/components/PersonPicker'
import type { PickedPerson } from '@/components/PersonPicker'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useRowSelection } from '@/hooks/useRowSelection'
import { isActiveMember } from '@/lib/membership'
import { downloadExport } from '@/lib/export'
import { ExportMenu, ExportOneButton, SelectCheckbox, SelectionInfo } from '@/components/export/ExportMenu'
import { CourseFormDialog } from '@/components/courses/CourseFormDialog'
import { PhotoGrid } from '@/components/courses/PhotoGrid'
import { useConfirmDeletePhoto, photoCountLabel } from '@/hooks/useConfirmDeletePhoto'

function calcDaysUntil(startDate: string) {
  if (!startDate) return 0
  return Math.ceil((new Date(startDate).getTime() - Date.now()) / 86_400_000)
}


// Botão pequeno de ação com dica e nome para leitor de tela; o texto ao lado do
// ícone só aparece em telas largas (no celular fica só o ícone).
function RowAction({ label, className, ...props }: { label: string } & ComponentProps<typeof Button>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          aria-label={label}
          className={cn('h-9 min-w-9 gap-1 px-2 text-xs lg:h-7 lg:min-w-7', className)}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

// ─── course card ─────────────────────────────────────────────────────────────

function AdminCourseCard({ course, onClick, onEdit, onDuplicate, selected = false, onToggleSelect }: {
  course: CourseCardItem
  onClick: () => void
  onEdit?: () => void
  onDuplicate?: () => void
  selected?: boolean
  onToggleSelect?: () => void
}) {
  const { t } = useTranslation()
  const summary = markdownToPlainText(course.description)
  return (
    <Card
      className={`group overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 ${selected ? 'ring-2 ring-primary' : ''}`}
      onClick={onClick}
    >
      <div className="relative h-40 bg-muted flex items-center justify-center overflow-hidden">
        {course.coverImage ? (
          <img
            src={course.coverImageThumb ?? course.coverImage}
            alt={course.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <BookOpen className="size-12 text-muted-foreground/30" />
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          {onToggleSelect && (
            <span
              className="flex size-7 items-center justify-center rounded-md bg-background/80 backdrop-blur-sm"
              onClick={e => { e.stopPropagation(); onToggleSelect() }}
            >
              <SelectCheckbox checked={selected} onChange={onToggleSelect} label={`Selecionar o curso ${course.title}`} />
            </span>
          )}
          <StatusBadge status={course.status} />
        </div>
        {course.eventNumber && (
          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded px-2 py-0.5">
            <span className="text-xs font-mono">#{course.eventNumber}</span>
          </div>
        )}
        {(course.photoCount ?? 0) > 0 && (
          <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded px-2 py-0.5 flex items-center gap-1">
            <Images className="size-3" />
            <span className="text-xs">{course.photoCount}</span>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start gap-1 mb-1.5">
          <h3 className="flex-1 font-semibold text-foreground line-clamp-2 leading-snug">{course.title}</h3>
          {/* stopPropagation: o menu (e o conteúdo dele, que fica num portal) não abre o card */}
          <div className="-mr-2 -mt-1.5 shrink-0" onClick={e => e.stopPropagation()}>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label={`Ações do curso ${course.title}`}>
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onClick}>
                  <Eye className="size-4" /> Ver detalhes
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onSelect={onEdit}>
                    <Pencil className="size-4" /> {t('common.edit')}
                  </DropdownMenuItem>
                )}
                {onDuplicate && (
                  <DropdownMenuItem onSelect={onDuplicate}>
                    <CopyPlus className="size-4" /> Duplicar curso
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {summary && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{summary}</p>
        )}

        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 shrink-0" />
            <span>{formatDateFromString(course.startDate)}</span>
          </div>
          {course.instructorName && (
            <div className="flex items-center gap-2">
              <User className="size-3.5 shrink-0" />
              <span className="truncate">{course.instructorName}</span>
            </div>
          )}
        </div>

        <Separator className="mb-3" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{course.enrolled}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {t('admin.courses.enrolled', { count: course.enrolled }).split(' ')[0]}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{course.maxStudents}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {t('admin.courses.spotsMax', { max: '' }).replace(' ', '')}
              </div>
            </div>
          </div>
          <span className="text-sm font-semibold text-primary">
            {course.price === 0 ? t('courseCard.free') : formatBRL(course.price)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function CourseCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-4 flex flex-col">
        {/* title — até 2 linhas */}
        <Skeleton className="h-4 w-3/4 mb-1" />
        <Skeleton className="h-4 w-1/2 mb-1.5" />
        {/* descrição — até 2 linhas */}
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-2/3 mb-3" />
        {/* data + instrutor */}
        <div className="flex flex-col gap-1.5 mb-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
        {/* separator + footer */}
        <div className="pt-3 border-t border-border flex justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>
      </div>
    </div>
  )
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

// ─── registrations tab ───────────────────────────────────────────────────────

// Mapeia com concorrência limitada para não inundar a API (preserva a ordem).
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? `1 ${one}` : `${n} ${many}`
}

// Inscrição feita pela equipe: escolhe a pessoa do cadastro.
function AddRegistrationDialog({ courseId, open, onClose, registeredIds }: {
  courseId: string
  open: boolean
  onClose: () => void
  registeredIds?: Set<string>
}) {
  const register = useAdminRegisterPerson(courseId)
  const [picked, setPicked] = useState<PickedPerson | null>(null)

  function close() {
    setPicked(null)
    onClose()
  }

  async function submit() {
    if (!picked) return
    try {
      await register.mutateAsync(picked.id)
      toast.success(`${picked.name} foi inscrito(a) no curso.`)
      close()
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível inscrever a pessoa.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => { if (!isOpen && !register.isPending) close() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Inscrever pessoa</DialogTitle>
          <DialogDescription>
            Busque a pessoa no cadastro. A inscrição já entra confirmada, mesmo depois do prazo de inscrição.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-72">
          {picked ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="min-w-0">
                <p className="font-medium wrap-break-word">{picked.name}</p>
                {picked.cpf && <p className="text-xs text-muted-foreground font-mono">{maskCPF(picked.cpf)}</p>}
              </div>
              <Button variant="outline" size="sm" onClick={() => setPicked(null)} disabled={register.isPending}>
                Trocar
              </Button>
            </div>
          ) : (
            <PersonPicker
              onPick={setPicked}
              excludeIds={registeredIds}
              excludedLabel="já inscrita"
              autoFocus
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={register.isPending}>Cancelar</Button>
          <Button onClick={submit} disabled={!picked || register.isPending}>
            {register.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            {register.isPending ? 'Inscrevendo...' : 'Inscrever'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RegistrationsTab({
  courseId,
  eventNumber,
  courseTitle,
  courseStatus,
}: {
  courseId: string
  eventNumber: string | null
  courseTitle: string
  courseStatus: string
}) {
  const [page, setPage] = useState(1)
  const limit = 20
  const { data: resp, isLoading } = useCourseRegistrations(courseId, { page, limit })
  const registrations = resp?.data ?? []
  const total = resp?.total ?? 0
  const totalPages = resp ? Math.ceil(total / limit) : 1
  // Todas as inscrições (não só a página): quem já está inscrito, pendentes e contatos.
  const allRegs = useAllCourseRegistrations(courseId)
  const cancelReg = useCancelRegistration(courseId)
  const confirmReg = useConfirmRegistration(courseId)
  const confirmAll = useConfirmAllRegistrations(courseId)
  const startCourse = useStartCourse()
  const uploadFicha = useUploadRegistrationFicha(courseId)
  const deleteFicha = useDeleteRegistrationFicha(courseId)
  const [fichaBusyId, setFichaBusyId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Registration | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [confirmAllOpen, setConfirmAllOpen] = useState(false)
  const [copying, setCopying] = useState<'phones' | 'emails' | null>(null)
  const [fichaId, setFichaId] = useState<string | null>(null)
  const [exportingAll, setExportingAll] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [certId, setCertId] = useState<string | null>(null)
  const [exportingCerts, setExportingCerts] = useState(false)
  const { data: courseDetail } = useAdminCourse(courseId)
  const { can } = usePermissions()
  const canManage = can('UPDATE_COURSE')
  const { t } = useTranslation()

  const inProgress = courseStatus === 'IN_PROGRESS'
  const registeredIds = allRegs.data ? new Set(allRegs.data.map(r => r.userDataId)) : undefined
  const pendingCount = allRegs.data?.filter(r => !r.confirmed).length ?? 0

  // Cancelar a última inscrição de uma página > 1 deixaria a lista vazia.
  if (resp && total > 0 && page > totalPages) {
    setPage(totalPages)
  }

  async function handleStart() {
    try {
      await startCourse.mutateAsync(courseId)
      toast.success('Curso iniciado! Status: Em andamento.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível iniciar o curso.'))
    }
  }

  function toggleConfirmed(reg: Registration) {
    confirmReg.mutate(
      { id: reg.id, confirmed: !reg.confirmed },
      {
        onError: e => toast.error(apiErrorMessage(
          e,
          reg.confirmed ? 'Não foi possível desmarcar a confirmação.' : 'Não foi possível confirmar a inscrição.',
        )),
      },
    )
  }

  async function handleCancel() {
    if (!cancelTarget) return
    try {
      await cancelReg.mutateAsync(cancelTarget.id)
      toast.success('Inscrição cancelada.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível cancelar a inscrição.'))
    } finally {
      setCancelTarget(null)
    }
  }

  async function handleConfirmAll() {
    try {
      const { confirmed } = await confirmAll.mutateAsync()
      toast.success(confirmed === 1 ? '1 inscrição confirmada.' : `${confirmed} inscrições confirmadas.`)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível confirmar as inscrições.'))
    } finally {
      setConfirmAllOpen(false)
    }
  }

  // Todos os telefones ou e-mails das inscrições do curso, um por linha.
  async function copyContacts(kind: 'phones' | 'emails') {
    setCopying(kind)
    try {
      const regs = allRegs.data ?? await fetchAllCourseRegistrations(courseId)
      const lines = kind === 'phones'
        ? uniqueContactLines(regs.map(r => r.userData.phone), phoneKey)
        : uniqueContactLines(regs.map(r => r.userData.email))
      if (lines.length === 0) {
        toast.error(kind === 'phones' ? 'Nenhuma inscrição tem telefone.' : 'Nenhuma inscrição tem e-mail.')
        return
      }
      if (!await copyText(lines.join('\n'))) {
        toast.error('Não foi possível copiar. Tente de novo.')
        return
      }
      toast.success(kind === 'phones'
        ? `${plural(lines.length, 'telefone copiado', 'telefones copiados')}.`
        : `${plural(lines.length, 'e-mail copiado', 'e-mails copiados')}.`)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao buscar as inscrições.'))
    } finally {
      setCopying(null)
    }
  }

  const course = { eventNumber, title: courseTitle }

  async function exportOne(userDataId: string) {
    setFichaId(userDataId)
    try {
      const { downloadFichaPdf } = await import('@/lib/ficha-inscricao-pdf')
      const user: UserDataDetail = await apiFetch(`/admin/users/${userDataId}`).then(r => r.json())
      await downloadFichaPdf([{ course, user }], `ficha-${user.name}`)
    } catch {
      toast.error(t('admin.courses.fichaError'))
    } finally {
      setFichaId(null)
    }
  }

  function baixarAutorizacao() {
    // Termo oficial SENAR (formulário em branco) servido como asset estático
    const a = document.createElement('a')
    a.href = '/termo-autorizacao-menor.pdf'
    a.download = 'termo-autorizacao-menor.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  async function anexarFicha(regId: string, file: File | undefined) {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Envie um arquivo PDF.')
      return
    }
    setFichaBusyId(regId)
    try {
      await uploadFicha.mutateAsync({ id: regId, file })
      toast.success('Ficha anexada!')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao anexar a ficha.'))
    } finally {
      setFichaBusyId(null)
    }
  }

  async function verFicha(regId: string) {
    setFichaBusyId(regId)
    try {
      await openRegistrationFicha(regId)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao abrir a ficha.'))
    } finally {
      setFichaBusyId(null)
    }
  }

  async function removerFicha(regId: string) {
    setFichaBusyId(regId)
    try {
      await deleteFicha.mutateAsync(regId)
      toast.success('Ficha removida.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover a ficha.'))
    } finally {
      setFichaBusyId(null)
    }
  }

  async function exportAll() {
    setExportingAll(true)
    try {
      const { downloadFichaPdf } = await import('@/lib/ficha-inscricao-pdf')
      const regs = await fetchAllCourseRegistrations(courseId)
      if (regs.length === 0) {
        toast.error(t('admin.courses.noRegistrations'))
        return
      }
      const users: UserDataDetail[] = await mapWithConcurrency(regs, 5, r =>
        apiFetch(`/admin/users/${r.userDataId}`).then(res => res.json()),
      )
      await downloadFichaPdf(
        users.map(user => ({ course, user })),
        `fichas-${courseTitle}`,
      )
    } catch {
      toast.error(t('admin.courses.fichaError'))
    } finally {
      setExportingAll(false)
    }
  }

  // Planilha das inscrições gerada no servidor (/admin/export/registrations).
  async function exportCsv() {
    setExportingCsv(true)
    try {
      const count = await downloadExport('registrations', { courseIds: [courseId] })
      toast.success(count === 1 ? 'Planilha com 1 inscrição baixada.' : count >= 0 ? `Planilha com ${count} inscrições baixada.` : 'Planilha baixada.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao exportar planilha.'))
    } finally {
      setExportingCsv(false)
    }
  }

  function certCourse() {
    return {
      title: courseTitle,
      eventNumber,
      workloadHours: courseDetail?.workloadHours ?? null,
      startDate: courseDetail?.startDate ?? null,
      endDate: courseDetail?.endDate ?? null,
      location: courseDetail?.location ?? null,
    }
  }

  async function certOne(reg: Registration) {
    setCertId(reg.id)
    try {
      const { downloadCertificadoPdf } = await import('@/lib/certificado-pdf')
      await downloadCertificadoPdf(
        [{ course: certCourse(), participant: { name: reg.userData.name, cpf: reg.userData.cpf } }],
        `certificado-${reg.userData.name}`,
      )
    } catch {
      toast.error('Erro ao gerar o certificado.')
    } finally {
      setCertId(null)
    }
  }

  async function certAll() {
    setExportingCerts(true)
    try {
      const { downloadCertificadoPdf } = await import('@/lib/certificado-pdf')
      const regs = await fetchAllCourseRegistrations(courseId)
      const confirmed = regs.filter(r => r.confirmed)
      if (confirmed.length === 0) {
        toast.error('Nenhuma inscrição confirmada para emitir certificado.')
        return
      }
      const course = certCourse()
      await downloadCertificadoPdf(
        confirmed.map(r => ({ course, participant: { name: r.userData.name, cpf: r.userData.cpf } })),
        `certificados-${courseTitle}`,
      )
    } catch {
      toast.error('Erro ao gerar os certificados.')
    } finally {
      setExportingCerts(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {resp ? `${total} ${t('admin.courses.registrations').toLowerCase()}` : t('common.loading')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {canManage && can('READ_USER') && (
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setAddOpen(true)}>
                <UserPlus className="size-3.5" /> Inscrever pessoa
              </Button>
            )}
            {canManage && pendingCount > 0 && (
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setConfirmAllOpen(true)}>
                <CheckCheck className="size-3.5" /> Confirmar todas ({pendingCount})
              </Button>
            )}
            {total > 0 && !inProgress && (
              <Button size="sm" className="h-8 gap-1.5" disabled={startCourse.isPending} onClick={handleStart}>
                {startCourse.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <PlayCircle className="size-3.5" />}
                {t('admin.courses.startCourse')}
              </Button>
            )}
            {inProgress && (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">
                <PlayCircle className="size-3" /> {t('admin.courses.form.statusInProgress')}
              </span>
            )}
          </div>
        </div>

        {total > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={copying === 'phones'} onClick={() => copyContacts('phones')}>
              {copying === 'phones' ? <Loader2 className="size-3.5 animate-spin" /> : <Phone className="size-3.5" />}
              Copiar telefones
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={copying === 'emails'} onClick={() => copyContacts('emails')}>
              {copying === 'emails' ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
              Copiar e-mails
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={exportingAll} onClick={exportAll}>
              {exportingAll ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
              {t('admin.courses.exportAllFichas')}
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={exportingCsv} onClick={exportCsv} title="Exportar inscrições (CSV)">
              {exportingCsv ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />}
              Planilha
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={exportingCerts} onClick={certAll} title="Certificados dos confirmados">
              {exportingCerts ? <Loader2 className="size-3.5 animate-spin" /> : <Award className="size-3.5" />}
              Certificados
            </Button>
          </div>
        )}

        {total > 0 && !inProgress && (
          <p className="text-xs text-muted-foreground">
            {t('admin.courses.startCourseHint')}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1"><Skeleton className="h-4 w-36 mb-1" /><Skeleton className="h-3 w-48" /></div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && registrations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed rounded-xl">
          <UserCheck className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">{t('admin.courses.noRegistrations')}</p>
        </div>
      )}

      {registrations.map(reg => {
        const age = calcAge(reg.userData.birthDate)
        const minor = age !== null && age < 18
        const whatsapp = whatsappUrl(reg.userData.phone)
        const tel = telHref(reg.userData.phone)
        return (
          // Celular: dados da pessoa em cima e botões (só ícones) embaixo, para o
          // nome não ficar cortado. Tela larga: tudo na mesma linha.
          <div key={reg.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 lg:flex-row lg:items-center lg:gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {reg.userData.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium text-foreground wrap-break-word lg:truncate">{reg.userData.name}</p>
                  {minor && (
                    <span
                      className="inline-flex items-center rounded-full border border-red-300 bg-red-100 px-1.5 text-[10px] font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                      title="Menor de idade — precisa da assinatura do responsável na ficha"
                    >
                      Menor · {age} anos
                    </span>
                  )}
                  {isActiveMember(reg.userData.memberStatus, reg.userData.membershipValidUntil) && (
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-1.5 text-[10px] font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400" title="Associado em dia">Associado</span>
                  )}
                  {reg.userData.companyMemberships.length > 0 && (
                    <span
                      className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-1.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                      title={`Vinculado a empresa parceira: ${reg.userData.companyMemberships.map(m => m.company.tradeName || m.company.name).join(', ')}`}
                    >
                      Parceira
                    </span>
                  )}
                  {reg.userData.boardPosition && (
                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-1.5 text-[10px] font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">{reg.userData.boardPosition}</span>
                  )}
                  {reg.userData.publicContact?.title && (
                    <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-100 px-1.5 text-[10px] font-medium text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-400">{reg.userData.publicContact.title}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="break-all">{reg.userData.email}</span>
                  {reg.userData.phone && <span>{maskPhone(reg.userData.phone)}</span>}
                  {reg.userData.cpf && <span className="font-mono">{maskCPF(reg.userData.cpf)}</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 lg:shrink-0 lg:justify-end">
              <span className="text-xs text-muted-foreground hidden lg:inline mr-1">
                {new Date(reg.createdAt).toLocaleDateString('pt-BR')}
              </span>
              {whatsapp && (
                <RowAction label="Conversar no WhatsApp" asChild className="text-emerald-600 hover:text-emerald-700">
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                    <FaWhatsapp className="size-4" />
                  </a>
                </RowAction>
              )}
              {tel && (
                <RowAction label="Ligar" asChild>
                  <a href={tel}>
                    <Phone className="size-3.5" />
                  </a>
                </RowAction>
              )}
              <RowAction
                label={reg.confirmed ? 'Desmarcar confirmação' : 'Confirmar inscrição'}
                variant={reg.confirmed ? 'ghost' : 'outline'}
                className={reg.confirmed ? 'text-emerald-600 hover:text-emerald-700' : ''}
                disabled={confirmReg.isPending}
                onClick={() => toggleConfirmed(reg)}
              >
                {reg.confirmed ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
                <span>{reg.confirmed ? t('admin.courses.confirmed') : t('admin.courses.confirm')}</span>
              </RowAction>
              <RowAction
                label="Baixar ficha de inscrição"
                disabled={fichaId === reg.userDataId}
                onClick={() => exportOne(reg.userDataId)}
              >
                {fichaId === reg.userDataId ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
                <span className="hidden lg:inline">{t('admin.courses.ficha')}</span>
              </RowAction>
              {reg.confirmed && (
                <RowAction
                  label="Emitir certificado de conclusão"
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  disabled={certId === reg.id}
                  onClick={() => certOne(reg)}
                >
                  {certId === reg.id ? <Loader2 className="size-3.5 animate-spin" /> : <Award className="size-3.5" />}
                  <span className="hidden lg:inline">Certificado</span>
                </RowAction>
              )}
              {minor && (
                <RowAction
                  label="Baixar termo de autorização do responsável (menor de idade)"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={baixarAutorizacao}
                >
                  <FileDown className="size-3.5" />
                  <span className="hidden lg:inline">Autorização</span>
                </RowAction>
              )}
              {reg.ficha ? (
                <>
                  <RowAction
                    label={`Ver ficha anexada (${reg.ficha.filename})`}
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    disabled={fichaBusyId === reg.id}
                    onClick={() => verFicha(reg.id)}
                  >
                    {fichaBusyId === reg.id ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
                    <span className="hidden lg:inline">Ver ficha</span>
                  </RowAction>
                  <RowAction
                    label="Remover ficha anexada"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={fichaBusyId === reg.id}
                    onClick={() => removerFicha(reg.id)}
                  >
                    <X className="size-3.5" />
                  </RowAction>
                </>
              ) : (
                <RowAction label="Anexar ficha preenchida (PDF)" asChild>
                  <label className={fichaBusyId === reg.id ? 'pointer-events-none opacity-60' : 'cursor-pointer'}>
                    {fichaBusyId === reg.id ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
                    <span className="hidden lg:inline">Anexar ficha</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={e => {
                        const input = e.currentTarget
                        const f = input.files?.[0]
                        input.value = ''
                        anexarFicha(reg.id, f)
                      }}
                    />
                  </label>
                </RowAction>
              )}
              <RowAction
                label="Cancelar inscrição"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setCancelTarget(reg)}
              >
                <UserX className="size-3.5" />
              </RowAction>
            </div>
          </div>
        )
      })}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
      )}

      <AddRegistrationDialog
        courseId={courseId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        registeredIds={registeredIds}
      />

      <DeleteConfirmDialog
        open={!!cancelTarget}
        onOpenChange={open => { if (!open && !cancelReg.isPending) setCancelTarget(null) }}
        title="Cancelar inscrição"
        description={<>Cancelar a inscrição de <strong>{cancelTarget?.userData.name}</strong> neste curso?</>}
        onConfirm={handleCancel}
        pending={cancelReg.isPending}
        confirmLabel={t('admin.courses.cancelRegistrationConfirm')}
        pendingLabel="Cancelando..."
        cancelLabel="Voltar"
      />

      <AlertDialog open={confirmAllOpen} onOpenChange={open => { if (!confirmAll.isPending) setConfirmAllOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar todas as inscrições</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCount === 1
                ? '1 inscrição ainda não confirmada será confirmada.'
                : `${pendingCount} inscrições ainda não confirmadas serão confirmadas.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmAll.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmAll.isPending}
              onClick={e => { e.preventDefault(); handleConfirmAll() }}
            >
              {confirmAll.isPending ? 'Confirmando...' : `Confirmar ${pendingCount}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── view dialog ─────────────────────────────────────────────────────────────

function ViewDialog({
  course,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  course: CourseCardItem | null
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

  const { data: detail, isLoading: detailLoading } = useAdminCourse(course?.id ?? '')
  const { data: instructors } = useInstructors()
  const assignInstructor = useAssignInstructor(course?.id ?? '')
  const removeAssignment = useRemoveInstructorAssignment(course?.id ?? '')

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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0" showCloseButton={false}>
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

        <Tabs defaultValue="details">
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

            <TabsList className="mb-0">
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
            ) : null}
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
            ) : null}
          </TabsContent>

          <TabsContent value="instructors" className="px-6 pb-4 mt-4">
            {detailLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : (
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
    </>
  )
}


// ─── route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_admin/admin/cursos/')({
  component: RouteComponent,
})

const LIMIT_OPTIONS = [8, 16, 24, 32] as const

type FormDialogState = { open: boolean; editing: Course | null; duplicateOf: Course | null }
const closedForm: FormDialogState = { open: false, editing: null, duplicateOf: null }

function RouteComponent() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState<typeof LIMIT_OPTIONS[number]>(8)
  const [search, setSearch] = useState('')
  // Busca é server-side (o hook aceita `search`); debounce evita 1 request por tecla.
  const debouncedSearch = useDebouncedValue(search, 350)
  // Busca nova (já com debounce) volta para a página 1 — ajustado no próprio render.
  const [pageSearch, setPageSearch] = useState(debouncedSearch)
  if (pageSearch !== debouncedSearch) {
    setPageSearch(debouncedSearch)
    setPage(1)
  }
  const { data, isLoading, isError } = useAdminCourses({ page, limit, search: debouncedSearch })
  const deleteCourse = useDeleteCourse()
  const queryClient = useQueryClient()
  const [viewDialog, setViewDialog] = useState<CourseCardItem | null>(null)
  const [formDialog, setFormDialog] = useState<FormDialogState>(closedForm)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null)
  const { t } = useTranslation()
  const { can } = usePermissions()

  const courses = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0

  // Se a página atual ficou fora do intervalo (ex.: excluir o último card de uma
  // página > 1), volta para a última página válida em vez de mostrar tela vazia.
  // Math.min: se a busca acabou de voltar para a página 1 neste render, fica na 1.
  if (!isLoading && total > 0 && page > totalPages) {
    setPage(p => Math.min(p, totalPages))
  }

  // Filtragem feita no servidor via `search` — não filtrar de novo no cliente
  // (isso quebrava a busca entre páginas).
  const visible = courses
  const selection = useRowSelection()
  const pageIds = visible.map(c => c.id)
  const pageState = selection.pageState(pageIds)

  async function handleDelete(id: string) {
    try {
      await deleteCourse.mutateAsync(id)
      selection.remove(id)
      toast.success('Curso excluído.')
      setDeleteConfirm(null)
      setViewDialog(null)
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('admin.courses.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${total} curso${total !== 1 ? 's' : ''}` : t('common.loading')}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {can('READ_COURSE') && (
            <Button asChild variant="outline">
              <Link to="/admin/salas"><Building2 className="size-4" /> {t('admin.rooms.title')}</Link>
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t('admin.courses.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          <span className="hidden sm:inline">Itens por página:</span>
          <Select
            value={String(limit)}
            onValueChange={v => { setLimit(Number(v) as typeof LIMIT_OPTIONS[number]); setPage(1) }}
          >
            <SelectTrigger className="h-9 w-18">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {visible.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <SelectCheckbox
                checked={pageState === 'all'}
                indeterminate={pageState === 'some'}
                onChange={() => selection.togglePage(pageIds)}
                label="Selecionar todos desta página"
              />
              <span className="hidden md:inline">Selecionar página</span>
            </label>
          )}
          <SelectionInfo count={selection.count} onClear={selection.clear} />
          <ExportMenu
            dataset="courses"
            className="h-9"
            filters={{ search: debouncedSearch.trim() }}
            selectedIds={selection.ids}
            total={data?.total}
            filtered={!!debouncedSearch.trim()}
            extra={[
              { label: 'Inscrições dos cursos selecionados', dataset: 'registrations', params: { courseIds: selection.ids }, disabled: selection.count === 0 },
              { label: 'Inscrições de todos os cursos', dataset: 'registrations', params: {} },
            ]}
          />
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t('courses.error')}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: limit }).map((_, i) => <CourseCardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && visible.length === 0 && total === 0 && (
        <EmptyState
          icon={GraduationCap}
          title={search ? t('courses.notFound') : t('admin.courses.empty')}
          description={search ? t('courses.notFoundHint') : t('admin.courses.emptyHint')}
          action={!search ? (
            <Button onClick={() => setFormDialog({ open: true, editing: null, duplicateOf: null })}>
              <Plus className="size-4" /> {t('admin.courses.newCourse')}
            </Button>
          ) : undefined}
        />
      )}

      {!isLoading && total > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visible.map(course => (
            <AdminCourseCard
              key={course.id}
              course={course}
              onClick={() => setViewDialog(course)}
              onEdit={can('UPDATE_COURSE') ? () => openFormFromCard(course.id, 'edit') : undefined}
              onDuplicate={can('CREATE_COURSE') ? () => openFormFromCard(course.id, 'duplicate') : undefined}
              selected={selection.isSelected(course.id)}
              onToggleSelect={() => selection.toggle(course.id)}
            />
          ))}
        </div>
      )}

      {(totalPages > 1 || total > 0) && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          isLoading={isLoading}
          showLimitSelector={false}
        />
      )}

      {/* key por curso: trocar de curso remonta o dialog (galeria na 1ª imagem, instrutor em branco) */}
      <ViewDialog
        key={viewDialog?.id ?? ''}
        course={viewDialog}
        onClose={() => setViewDialog(null)}
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
