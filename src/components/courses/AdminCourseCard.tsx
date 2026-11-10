import { useTranslation } from 'react-i18next'
import { BookOpen, Calendar, CopyPlus, Eye, Images, Pencil, Trash2, User } from 'lucide-react'
import type { CourseCardItem } from '@/hooks/useCourse'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { formatBRL } from '@/utils/format-currency'
import { markdownToPlainText } from '@/lib/markdown-text'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'
import { RowActions } from '@/components/RowActions'
import { SelectCheckbox } from '@/components/export/ExportMenu'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

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
      className={cn(
        'group cursor-pointer gap-0 overflow-hidden py-0 transition-colors hover:border-foreground/20',
        selected && 'ring-2 ring-primary',
      )}
      onClick={onClick}
    >
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-muted">
        {course.coverImage ? (
          <img
            src={course.coverImageThumb ?? course.coverImage}
            alt={course.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <BookOpen className="size-10 text-faint-foreground" aria-hidden />
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          {onToggleSelect && (
            <span
              className="flex size-7 items-center justify-center rounded-md bg-background/90"
              onClick={e => { e.stopPropagation(); onToggleSelect() }}
            >
              <SelectCheckbox checked={selected} onChange={onToggleSelect} label={`Selecionar o curso ${course.title}`} />
            </span>
          )}
          <StatusBadge status={course.status} />
        </div>
        {course.eventNumber && (
          <div className="absolute top-2 right-2 rounded-sm bg-background/90 px-1.5 py-0.5">
            <span className="num text-xs text-foreground">#{course.eventNumber}</span>
          </div>
        )}
        {(course.photoCount ?? 0) > 0 && (
          <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded-sm bg-background/90 px-1.5 py-0.5 text-foreground">
            <Images className="size-3" aria-hidden />
            <span className="text-xs tabular-nums">{course.photoCount}</span>
          </div>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-1">
          <h3 className="line-clamp-2 flex-1 leading-snug font-semibold text-foreground">{course.title}</h3>
          {/* stopPropagation: o menu (e o conteúdo dele, que fica num portal) não abre o card */}
          <div className="-mt-1.5 -mr-2 shrink-0" onClick={e => e.stopPropagation()}>
            <RowActions
              visible={0}
              label={`Ações do curso ${course.title}`}
              actions={[
                { label: 'Ver detalhes', icon: Eye, onClick },
                { label: t('common.edit'), icon: Pencil, hidden: !onEdit, onClick: () => onEdit?.() },
                { label: 'Duplicar curso', icon: CopyPlus, hidden: !onDuplicate, onClick: () => onDuplicate?.() },
                { label: t('common.delete'), icon: Trash2, destructive: true, hidden: !onDelete, onClick: () => onDelete?.() },
              ]}
            />
          </div>
        </div>
        {summary && (
          <p className="-mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{summary}</p>
        )}

        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 shrink-0 text-faint-foreground" aria-hidden />
            <span className="num">{formatDateFromString(course.startDate)}</span>
          </div>
          {course.instructorName && (
            <div className="flex items-center gap-2">
              <User className="size-3.5 shrink-0 text-faint-foreground" aria-hidden />
              <span className="truncate">{course.instructorName}</span>
            </div>
          )}
        </div>

        {/* Inscritos e vagas numa linha só, e o preço à direita (o mono é a assinatura dos valores). */}
        <div className="mt-auto flex items-baseline justify-between gap-3 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            <span className="text-lg font-semibold tabular-nums text-foreground">{course.enrolled}</span>
            {' '}<span className="tabular-nums">{t('admin.courses.spotsMax', { max: course.maxStudents })}</span> vagas
          </p>
          {course.price === 0
            ? <span className="text-sm text-muted-foreground">{t('courseCard.free')}</span>
            : <span className="num text-sm font-medium text-foreground">{formatBRL(course.price)}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

export function CourseCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
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
