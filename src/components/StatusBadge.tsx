import { useTranslation } from 'react-i18next'
import type { Course } from '@/@types/course'
import { Badge } from '@/components/ui/badge'

type Tone = 'neutral' | 'success' | 'warning' | 'outline'

/**
 * Selo do status do curso, nos tons da etiqueta (ui/badge): público em verde, privado
 * em âmbar, rascunho e concluído neutros; "Em andamento" é neutro com a linha, para
 * se distinguir do rascunho sem trazer outra cor.
 */
export function StatusBadge({ status }: { status: Course['status'] }) {
  const { t } = useTranslation()

  const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
    PUBLIC: { label: t('admin.courses.form.statusPublic'), tone: 'success' },
    PRIVATE: { label: t('admin.courses.form.statusPrivate'), tone: 'warning' },
    UNPUBLISHED: { label: t('admin.courses.form.statusDraft'), tone: 'neutral' },
    IN_PROGRESS: { label: t('admin.courses.form.statusInProgress'), tone: 'outline' },
    COMPLETED: { label: 'Concluído', tone: 'neutral' },
  }

  const { label, tone } = STATUS_MAP[status] ?? STATUS_MAP.UNPUBLISHED
  return <Badge variant={tone}>{label}</Badge>
}
