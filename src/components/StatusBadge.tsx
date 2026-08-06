import { useTranslation } from 'react-i18next'
import type { Course } from '@/@types/course'

export function StatusBadge({ status }: { status: Course['status'] }) {
  const { t } = useTranslation()

  const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    PUBLIC: { label: t('admin.courses.form.statusPublic'), cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    PRIVATE: { label: t('admin.courses.form.statusPrivate'), cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    UNPUBLISHED: { label: t('admin.courses.form.statusDraft'), cls: 'bg-muted text-muted-foreground border-border' },
    IN_PROGRESS: { label: t('admin.courses.form.statusInProgress'), cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  }

  const { label, cls } = STATUS_MAP[status] ?? STATUS_MAP.UNPUBLISHED
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}
