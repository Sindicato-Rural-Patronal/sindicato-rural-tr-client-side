import { AgendaItemRow } from '@/components/agenda/AgendaItem'
import { formatDateBr, itemsByDay, weekdayLong, type AgendaEntry } from '@/lib/agenda'
import { cn } from '@/lib/utils'

// Visão da semana: segunda a domingo, um bloco por dia. No computador os sete
// dias ficam lado a lado; no celular um embaixo do outro (sem rolagem lateral).

export function WeekAgenda({ days, items, selected, onSelectDay, onOpenItem }: {
  /** Os 7 dias da semana ("YYYY-MM-DD"). */
  days: string[]
  /** Itens de toda a semana (a mesma busca que a visão do dia usa). */
  items: AgendaEntry[]
  /** Dia em foco (o do calendário). */
  selected: string
  /** Clicar no dia passa o foco para ele. */
  onSelectDay: (ymd: string) => void
  onOpenItem: (item: AgendaEntry) => void
}) {
  const perDay = itemsByDay(items, days)

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {perDay.map(({ date, items: doDia }) => {
        const isSelected = date === selected
        return (
          <section
            key={date}
            className={cn(
              'flex flex-col gap-2 rounded-xl border p-2',
              isSelected ? 'border-primary bg-primary/5' : 'border-border bg-muted/20',
            )}
          >
            <button
              type="button"
              onClick={() => onSelectDay(date)}
              aria-current={isSelected ? 'date' : undefined}
              className="flex min-h-10 flex-col rounded-lg px-2 py-1 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-xs font-medium capitalize text-muted-foreground">
                {weekdayLong(date).replace('-feira', '')}
              </span>
              <span className={cn('text-sm font-semibold tabular-nums', isSelected && 'text-primary')}>
                {formatDateBr(date).slice(0, 5)}
              </span>
            </button>

            {doDia.length === 0 ? (
              <p className="px-2 pb-2 text-xs text-muted-foreground">Nada marcado.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {doDia.map(item => (
                  <li key={item.key}>
                    <AgendaItemRow item={item} onOpen={() => onOpenItem(item)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
