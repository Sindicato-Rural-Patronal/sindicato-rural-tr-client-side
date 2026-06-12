import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionButton } from '@/components/PermissionButton'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import {
  useAdminCourses, useAdminCourse, useCreateCourse, useUpdateCourse, useDeleteCourse,
  useUploadBanner, useUploadGalleryPhoto, useDeleteGalleryPhoto,
} from '@/hooks/useCourse'
import type { CourseCardItem } from '@/hooks/useCourse'
import { useRooms, useCreateRoom } from '@/hooks/useRooms'
import { useCourseRegistrations, useCancelRegistration } from '@/hooks/useAdmin'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { roomSchema, courseBaseSchema } from '@/lib/schemas'
import type { RoomFormData, CourseFormData } from '@/lib/schemas'
import { Label } from '@/components/ui/label'
import {
  Plus, Building2, GraduationCap, Calendar, Search,
  BookOpen, Images, ChevronLeft, ChevronRight, X, Pencil, Trash2,
  Clock, MapPin, User, ImageUp, ImagePlus, Upload, UserCheck, UserX,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form'
import type { Course } from '@/@types/course'
import { StatusBadge } from '@/components/StatusBadge'
import { ErrorAlert } from '@/components/ErrorAlert'
import { EmptyState } from '@/components/EmptyState'

function calcDaysUntil(startDate: string) {
  if (!startDate) return 0
  return Math.ceil((new Date(startDate).getTime() - Date.now()) / 86_400_000)
}

// ─── course card ─────────────────────────────────────────────────────────────

function AdminCourseCard({ course, onClick }: { course: CourseCardItem; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <Card
      className="group overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200"
      onClick={onClick}
    >
      <div className="relative h-40 bg-muted flex items-center justify-center overflow-hidden">
        {course.coverImage ? (
          <img
            src={course.coverImage}
            alt={course.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <BookOpen className="size-12 text-muted-foreground/30" />
        )}
        <div className="absolute top-2 left-2">
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
        <h3 className="font-semibold text-foreground line-clamp-2 mb-1.5 leading-snug">{course.title}</h3>
        {course.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{course.description}</p>
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
            {course.price === 0 ? t('courseCard.free') : `R$ ${course.price.toFixed(2)}`}
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
      <div className="p-4 flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
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
  const deletePhoto = useDeleteGalleryPhoto(course.id)
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
      const msg = err instanceof Error ? err.message : 'Upload error.'
      setUploadError(msg)
      toast.error(msg)
    }
    e.target.value = ''
  }

  const photos = course.photoGallery ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadPhoto.isPending}
        >
          <ImagePlus className="size-4" />
          {uploadPhoto.isPending ? t('admin.courses.galleryUpload') : t('admin.courses.galleryUpload')}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="relative aspect-video rounded-xl overflow-hidden bg-muted group">
              <img src={photo.url} alt={photo.caption || 'Photo'} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => deletePhoto.mutateAsync(photo.id).then(() => toast.success('Foto removida.')).catch(() => toast.error('Erro ao remover foto.'))}
                  disabled={deletePhoto.isPending}
                  className="size-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5">
                  <p className="text-white text-xs truncate">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── registrations tab ───────────────────────────────────────────────────────

function RegistrationsTab({ courseId }: { courseId: string }) {
  const { data: registrations, isLoading } = useCourseRegistrations(courseId)
  const cancelReg = useCancelRegistration(courseId)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {registrations ? `${registrations.length} ${t('admin.courses.registrations').toLowerCase()}` : t('common.loading')}
        </p>
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

      {!isLoading && (registrations ?? []).length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed rounded-xl">
          <UserCheck className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">{t('admin.courses.noRegistrations')}</p>
        </div>
      )}

      {(registrations ?? []).map(reg => (
        <div key={reg.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {reg.userData.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{reg.userData.name}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>{reg.userData.email}</span>
              {reg.userData.phone && <span>{reg.userData.phone}</span>}
              {reg.userData.cpf && <span className="font-mono">{reg.userData.cpf}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {new Date(reg.createdAt).toLocaleDateString('pt-BR')}
            </span>
            {confirmId === reg.id ? (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 px-2 text-xs"
                  disabled={cancelReg.isPending}
                  onClick={async () => {
                    await cancelReg.mutateAsync(reg.id)
                    toast.success('Inscrição cancelada.')
                    setConfirmId(null)
                  }}
                >
                  {t('admin.courses.cancelRegistrationConfirm')}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setConfirmId(null)}>
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmId(reg.id)}
              >
                <UserX className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── view dialog ─────────────────────────────────────────────────────────────

function ViewDialog({
  course,
  onClose,
  onEdit,
  onDelete,
}: {
  course: CourseCardItem | null
  onClose: () => void
  onEdit: (c: Course) => void
  onDelete: (id: string) => void
}) {
  const [galleryIndex, setGalleryIndex] = useState(0)
  const { t } = useTranslation()
  const { can } = usePermissions()

  const { data: detail, isLoading: detailLoading } = useAdminCourse(course?.id ?? '')

  useEffect(() => {
    setGalleryIndex(0)
  }, [course?.id])

  const liveCourse = detail ?? null

  if (!course) return null

  const coverImage = liveCourse?.coverImage ?? course.coverImage
  const allImages = [
    ...(coverImage ? [{ url: coverImage, caption: '' }] : []),
    ...(liveCourse?.photoGallery ?? []),
  ]
  const totalImages = allImages.length
  const daysUntil = liveCourse ? calcDaysUntil(liveCourse.startDate) : 0

  return (
    <Dialog open={!!course} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0" showCloseButton={false}>
        {/* Image / Gallery */}
        <div className="relative h-64 bg-muted flex items-center justify-center overflow-hidden">
          {totalImages > 0 ? (
            <>
              <img
                src={allImages[galleryIndex]?.url}
                alt={course.title}
                className="h-full w-full object-cover"
              />
              {totalImages > 1 && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); setGalleryIndex(i => (i - 1 + totalImages) % totalImages) }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 size-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setGalleryIndex(i => (i + 1) % totalImages) }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 size-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                    {allImages.map((_, i) => (
                      <button
                        key={i}
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
            onClick={onClose}
            className="absolute top-3 right-3 size-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <Tabs defaultValue="details">
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={course.status} />
              {course.eventNumber && (
                <span className="text-sm text-muted-foreground font-mono">#{course.eventNumber}</span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-0.5">{course.title}</h2>

            <TabsList className="mb-0">
              <TabsTrigger value="details">{t('admin.courses.tabs.info')}</TabsTrigger>
              <TabsTrigger value="registrations">
                {t('admin.courses.registrations')}
                {course.enrolled > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                    {course.enrolled}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="gallery">
                {t('admin.courses.tabs.images')}
                {(course.photoCount ?? 0) > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                    {course.photoCount}
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
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
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

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
                  {[
                    { label: t('admin.courses.registrations'), value: liveCourse.enrolled, cls: 'bg-primary/10 text-primary' },
                    { label: 'Pré-insc.', value: liveCourse.preEnrolled ?? 0, cls: 'bg-amber-500/10 text-amber-600' },
                    { label: t('admin.courses.form.minStudents'), value: liveCourse.minStudents ?? '—', cls: 'bg-muted text-foreground' },
                    { label: 'Máx.', value: liveCourse.maxStudents, cls: 'bg-muted text-foreground' },
                    { label: 'Espera', value: liveCourse.waitlist ?? 0, cls: 'bg-muted text-foreground' },
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
                    <div className="bg-muted/30 p-4 rounded-xl text-sm text-muted-foreground whitespace-pre-line leading-relaxed overflow-hidden wrap-anywhere">
                      {liveCourse.description}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm pb-2">
                  <div>
                    <span className="text-muted-foreground">{t('admin.courses.form.price')}: </span>
                    <span className="font-semibold text-primary">
                      {liveCourse.price === 0 ? t('courseCard.free') : `R$ ${liveCourse.price.toFixed(2)}`}
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
            <RegistrationsTab courseId={course.id} />
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
        </Tabs>

        <div className="border-t p-4 flex justify-between gap-2 bg-muted/30 flex-wrap">
          <PermissionButton
            allowed={can('UPDATE_COURSE')}
            noPermissionMessage="Sem permissão para alterar banner"
            variant="outline"
            asChild={can('UPDATE_COURSE')}
          >
            {can('UPDATE_COURSE') ? (
              <Link to="/admin/cursos/$id" params={{ id: course.id }}>
                <ImageUp className="size-4" /> {t('admin.courses.bannerUpload')}
              </Link>
            ) : (
              <><ImageUp className="size-4" /> {t('admin.courses.bannerUpload')}</>
            )}
          </PermissionButton>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
            <PermissionButton
              allowed={can('DELETE_COURSE')}
              noPermissionMessage="Sem permissão para excluir cursos"
              variant="outline"
              onClick={() => onDelete(course.id)}
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
  )
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
    regDeadlineHour: c.registrationDeadline ? c.registrationDeadline.slice(11, 16) : '',
    observations: c.observations ?? '',
    eventNumber: c.eventNumber ?? '',
    minStudents: c.minStudents ?? undefined,
  }
}

function toISO(date: string, hour: string) {
  if (!date) return undefined
  return new Date(`${date}T${hour || '00:00'}:00`).toISOString()
}

function BannerTab({ courseId }: { courseId: string | null }) {
  const { data: editing } = useAdminCourse(courseId ?? '')
  const uploadBanner = useUploadBanner(courseId ?? '')
  const uploadPhoto = useUploadGalleryPhoto(courseId ?? '')
  const deletePhoto = useDeleteGalleryPhoto(courseId ?? '')
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
      const msg = err instanceof Error ? err.message : 'Upload error.'
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
      const msg = err instanceof Error ? err.message : 'Upload error.'
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
          className="relative h-40 rounded-xl overflow-hidden bg-muted flex items-center justify-center border border-border group cursor-pointer"
          onClick={() => bannerRef.current?.click()}
        >
          {editing.coverImage
            ? <img src={`${editing.coverImage}${bannerCacheBust ? `?v=${bannerCacheBust}` : ''}`} alt="Banner" className="h-full w-full object-cover" />
            : <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                <ImageUp className="size-10" />
              </div>
          }
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button variant="secondary" size="sm" type="button" disabled={uploadBanner.isPending}>
              <ImageUp className="size-4" />
              {t('admin.courses.bannerUpload')}
            </Button>
          </div>
        </div>
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
        <ErrorAlert message={bannerError} />
      </div>

      {/* Gallery */}
      <div className="flex flex-col gap-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="flex items-center gap-2"><Images className="size-4" /> {t('admin.courses.tabs.images')}</Label>
            <p className="text-xs text-muted-foreground mt-0.5">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
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
          : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map(photo => (
                <div key={photo.id} className="relative aspect-video rounded-xl overflow-hidden bg-muted group">
                  <img src={photo.url} alt={photo.caption || 'Photo'} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => deletePhoto.mutate(photo.id)}
                      disabled={deletePhoto.isPending}
                      className="size-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5">
                      <p className="text-white text-xs truncate">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}

export function CourseFormDialog({
  open,
  editing,
  onClose,
}: {
  open: boolean
  editing: Course | null
  onClose: () => void
}) {
  const { data: rooms, isLoading: roomsLoading } = useRooms()
  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse(editing?.id ?? '')
  const { t } = useTranslation()

  const isCreating = !editing

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseBaseSchema),
    mode: 'onTouched',
    defaultValues: emptyFormDefaults,
  })

  useEffect(() => {
    if (open) form.reset(editing ? courseToForm(editing) : emptyFormDefaults)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const isPending = createCourse.isPending || updateCourse.isPending

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
    try {
      editing
        ? await updateCourse.mutateAsync(body)
        : await createCourse.mutateAsync({ ...body, roomId: data.roomId! })
      toast.success(editing ? 'Curso atualizado com sucesso!' : 'Curso criado com sucesso!')
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('common.error')
      form.setError('root', { message: msg })
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" showCloseButton={false}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-xl">
            {editing ? t('admin.courses.editCourse') : t('admin.courses.newCourse')}
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
                </div>

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.courses.form.title')}</FormLabel>
                    <FormControl><Input {...field} placeholder="Ex: Manejo Integrado de Pragas no Milho" /></FormControl>
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
                        <FormControl><Input type="date" {...field} /></FormControl>
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
                        <FormControl><Input type="date" {...field} /></FormControl>
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
                      <FormControl><Input type="date" {...field} /></FormControl>
                    )} />
                    <FormField control={form.control} name="regDeadlineHour" render={({ field }) => (
                      <FormControl><Input type="time" {...field} className="w-27.5" /></FormControl>
                    )} />
                  </div>
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
                    <FormControl><Input {...field} placeholder="Ex: Maiores de 18 anos" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
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
                <BannerTab courseId={editing?.id ?? null} />
              </TabsContent>
            </Tabs>

            {form.formState.errors.root && (
              <div className="px-6"><ErrorAlert message={form.formState.errors.root.message ?? null} /></div>
            )}

            <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-2 shrink-0">
              <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
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
  )
}

// ─── rooms sheet ─────────────────────────────────────────────────────────────

function RoomsSheet() {
  const { data: rooms, isLoading } = useRooms()
  const createRoom = useCreateRoom()
  const [success, setSuccess] = useState(false)
  const { t } = useTranslation()

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    mode: 'onTouched',
    defaultValues: { name: '', description: '', maxCapacity: 1 },
  })

  async function onSubmit(data: RoomFormData) {
    setSuccess(false)
    try {
      await createRoom.mutateAsync(data)
      form.reset()
      setSuccess(true)
      toast.success('Sala criada com sucesso!')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('common.error')
      form.setError('root', { message: msg })
      toast.error(msg)
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline"><Building2 className="size-4" /> {t('admin.rooms.title')}</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>{t('admin.rooms.title')}</SheetTitle></SheetHeader>
        <div className="flex flex-col gap-6 p-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">{t('admin.rooms.title')}</h3>
            {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
            {rooms && (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Cap.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.description}</p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.maxCapacity}</TableCell>
                      </TableRow>
                    ))}
                    {rooms.length === 0 && (
                      <TableRow><TableCell colSpan={2} className="py-6 text-center text-muted-foreground">{t('common.error')}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">{t('admin.rooms.newRoom')}</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.rooms.name')}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.rooms.description')}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="maxCapacity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.rooms.maxCapacity')}</FormLabel>
                    <FormControl><Input type="number" min="1" value={field.value} onChange={e => field.onChange(e.target.valueAsNumber)} onBlur={field.onBlur} ref={field.ref} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {form.formState.errors.root && <ErrorAlert message={form.formState.errors.root.message ?? null} />}
                {success && <p className="text-sm text-emerald-600">Room created!</p>}
                <Button type="submit" disabled={createRoom.isPending}>
                  {createRoom.isPending ? t('admin.rooms.saving') : t('admin.rooms.save')}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_admin/admin/cursos/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: courses, isLoading, isError } = useAdminCourses()
  const deleteCourse = useDeleteCourse()
  const [search, setSearch] = useState('')
  const [viewDialog, setViewDialog] = useState<CourseCardItem | null>(null)
  const [formDialog, setFormDialog] = useState<{ open: boolean; editing: Course | null }>({ open: false, editing: null })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const { t } = useTranslation()
  const { can } = usePermissions()

  const filtered = (courses ?? []).filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.instructorName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.eventNumber ?? '').includes(search)
  )

  async function handleDelete(id: string) {
    try {
      await deleteCourse.mutateAsync(id)
      toast.success('Curso excluído.')
      setDeleteConfirm(null)
      setViewDialog(null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao excluir curso.'
      toast.error(msg)
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('admin.courses.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {courses ? `${courses.length} course${courses.length !== 1 ? 's' : ''}` : t('common.loading')}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {can('CREATE_COURSE') && <RoomsSheet />}
          <PermissionButton
            allowed={can('CREATE_COURSE')}
            noPermissionMessage="Sem permissão para criar cursos"
            onClick={() => setFormDialog({ open: true, editing: null })}
          >
            <Plus className="size-4" /> {t('admin.courses.newCourse')}
          </PermissionButton>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder={t('admin.courses.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t('courses.error')}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title={search ? t('courses.notFound') : t('admin.courses.empty')}
          description={search ? t('courses.notFoundHint') : t('admin.courses.emptyHint')}
          action={!search ? (
            <Button onClick={() => setFormDialog({ open: true, editing: null })}>
              <Plus className="size-4" /> {t('admin.courses.newCourse')}
            </Button>
          ) : undefined}
        />
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(course => (
            <AdminCourseCard key={course.id} course={course} onClick={() => setViewDialog(course)} />
          ))}
        </div>
      )}

      <ViewDialog
        course={viewDialog}
        onClose={() => setViewDialog(null)}
        onEdit={c => setFormDialog({ open: true, editing: c })}
        onDelete={id => setDeleteConfirm(id)}
      />

      <CourseFormDialog
        open={formDialog.open}
        editing={formDialog.editing}
        onClose={() => setFormDialog({ open: false, editing: null })}
      />

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.courses.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('admin.courses.deleteConfirmDesc', { title: '' })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t('admin.courses.deleteCancel')}</Button>
            <Button
              variant="destructive"
              disabled={deleteCourse.isPending}
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              {deleteCourse.isPending ? t('admin.courses.deleting') : t('admin.courses.deleteConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
