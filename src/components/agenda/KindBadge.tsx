import { BookOpen, Megaphone, Users } from 'lucide-react'
import { KIND_BADGE_CLASS, KIND_LABEL, type ScheduleKind } from '@/lib/agenda'
import { cn } from '@/lib/utils'

const ICON = { COURSE: BookOpen, EVENT: Megaphone, MEETING: Users } as const

/** Selo "Curso" / "Evento" / "Reunião" com cor e ícone próprios. */
export function KindBadge({ kind, className }: { kind: ScheduleKind; className?: string }) {
  const Icon = ICON[kind]
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
        KIND_BADGE_CLASS[kind],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {KIND_LABEL[kind]}
    </span>
  )
}
