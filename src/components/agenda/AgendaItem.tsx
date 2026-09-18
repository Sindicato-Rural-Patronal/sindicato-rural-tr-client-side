import { CalendarCheck, GraduationCap } from 'lucide-react'
import { KindBadge } from '@/components/agenda/KindBadge'
import { OnSiteBadge } from '@/components/agenda/OnSiteBadge'
import { timeRangeLabel, type AgendaEntry } from '@/lib/agenda'
import { cn } from '@/lib/utils'

// Um item da agenda (curso, evento ou reunião): cartão na visão do dia e linha
// enxuta na visão da semana. Clicar faz a mesma coisa nas duas. A cor nunca é a
// única pista — o tipo vem sempre escrito no selo.

function iconClass(kind: AgendaEntry['kind']): string {
  return kind === 'COURSE'
    ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
}

/** Cartão do item na visão do dia. */
export function AgendaItemCard({ item, onOpen }: { item: AgendaEntry; onOpen: () => void }) {
  const Icon = item.kind === 'COURSE' ? GraduationCap : CalendarCheck
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', iconClass(item.kind))}>
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
        <div className="mt-1.5 flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="tabular-nums">{timeRangeLabel(item)}</span>
          <span className="truncate">{item.roomName}</span>
          {item.responsible && <span className="truncate">Responsável: {item.responsible}</span>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <KindBadge kind={item.kind} />
          {item.publicOnSite && <OnSiteBadge />}
        </div>
      </div>
    </button>
  )
}

/** Linha enxuta do item na visão da semana (mesmo clique do cartão do dia). */
export function AgendaItemRow({ item, onOpen }: { item: AgendaEntry; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${timeRangeLabel(item)} · ${item.title} · ${item.roomName}`}
      className="flex min-h-11 w-full flex-col gap-1 rounded-lg border border-border bg-card px-2.5 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-xs font-medium tabular-nums text-muted-foreground">{timeRangeLabel(item)}</span>
      <span className="truncate text-sm font-semibold text-foreground">{item.title}</span>
      <span className="truncate text-xs text-muted-foreground">{item.roomName}</span>
      <span className="flex flex-wrap items-center gap-1">
        <KindBadge kind={item.kind} className="px-1.5 py-0 text-[11px]" />
        {item.publicOnSite && <OnSiteBadge className="px-1.5 py-0 text-[11px]" />}
      </span>
    </button>
  )
}
