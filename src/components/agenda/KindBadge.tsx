import { Badge } from '@/components/ui/badge'
import { KIND_DOT_CLASS, KIND_LABEL, type ScheduleKind } from '@/lib/agenda'
import { cn } from '@/lib/utils'

/** Selo "Curso" / "Evento" / "Reunião": etiqueta neutra com o ponto de cor do tipo. */
export function KindBadge({ kind, className }: { kind: ScheduleKind; className?: string }) {
  return (
    <Badge variant="neutral" className={className}>
      <span className={cn('size-2 shrink-0 rounded-full', KIND_DOT_CLASS[kind])} aria-hidden />
      {KIND_LABEL[kind]}
    </Badge>
  )
}
