import { useTranslation } from 'react-i18next'
import { BookOpen, Calendar, CopyPlus, Eye, Images, MoreVertical, Pencil, Trash2, User } from 'lucide-react'
import type { CourseCardItem } from '@/hooks/useCourse'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { formatBRL } from '@/utils/format-currency'
import { markdownToPlainText } from '@/lib/markdown-text'
import { StatusBadge } from '@/components/StatusBadge'
import { SelectCheckbox } from '@/components/export/ExportMenu'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

// Cartão de curso da lista do painel (fora do arquivo da rota para poder ser testado).

export function AdminCourseCard({ course, onClick, onEdit, onDuplicate, onDelete, selected = false, onToggleSelect }: {
  course: CourseCardItem
  onClick: () => void
  onEdit?: () => void
  onDuplicate?: () => void
  /** Sem permissão de excluir, o item nem aparece no menu. */
  onDelete?: () => void
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
                {onDelete && (
                  <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="size-4" /> {t('common.delete')}
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

export function CourseCardSkeleton() {
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
