import { Fragment } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  KIND_DOT_CLASS, KIND_LABEL, hourAtFraction, occupancyRows, occupancyTicks, suggestedFreeHour,
  type AgendaEntry, type OccupancyBlock, type OccupancyRow, type ScheduleKind,
} from '@/lib/agenda'
import { cn } from '@/lib/utils'

// Ocupação das salas no dia. Serve para achar o horário livre de bate-pronto e
// já marcar nele.
//
// Duas apresentações do MESMO dado (`occupancyRows`), porque o horário precisa
// estar ESCRITO, nunca só implícito no tamanho da barra:
//   • bloco com menos de 640px: LISTA por sala ("AUDITORIO — 08:00 às 12:00 —
//     Curso"). Numa tela de 390px a faixa gráfica vira um tracinho sem hora.
//   • de 640px para cima: a faixa das 07:00 às 22:00, com o horário escrito
//     dentro da barra quando cabe, ao lado dela quando não cabe, e embaixo da
//     sala no aperto (ver `labelPlacement` em `lib/agenda.ts`).

const BAR_CLASS: Record<ScheduleKind, string> = KIND_DOT_CLASS

/** Altura de cada linha da sala e da barra dentro dela (px). */
const LANE_HEIGHT = 34
const BAR_HEIGHT = 30

/** Onde o clique caiu dentro da faixa, de 0 (07:00) a 1 (22:00). */
function fractionOf(event: React.MouseEvent<HTMLElement>): number {
  const rect = event.currentTarget.getBoundingClientRect()
  if (rect.width <= 0) return 0
  return (event.clientX - rect.left) / rect.width
}

/** "AUDITORIO: Curso MANEJO, 08:00 às 12:00" — o que o leitor de tela fala. */
function blockAria(roomName: string, block: { kind: ScheduleKind; title: string; time: string; note: string | null }): string {
  return [`${roomName}: ${KIND_LABEL[block.kind]} ${block.title}`, block.time, block.note]
    .filter(Boolean)
    .join(', ')
}

export function RoomOccupancy({ date, items, rooms, canCreate, onOpenItem, onNewBooking }: {
  date: string
  items: AgendaEntry[]
  rooms: { id: string; name: string }[]
  canCreate: boolean
  onOpenItem: (item: AgendaEntry) => void
  onNewBooking: (roomId: string, startHour: string) => void
}) {
  const rows = occupancyRows(items, rooms, date)
  const byKey = new Map(items.map(item => [item.key, item]))

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma sala cadastrada.</p>
  }

  const open = (key: string) => {
    const item = byKey.get(key)
    if (item) onOpenItem(item)
  }

  return (
    // `@container`: quem manda na escolha é a largura DESTE bloco, não a da
    // tela. No Painel Geral a agenda divide a tela com o calendário, então
    // numa tela de 1024px a faixa teria uns 150px — daria o mesmo tracinho
    // ilegível do celular.
    <div className="@container flex flex-col gap-4">
      {/* Faixa com menos de 640px (celular e painel estreito): a lista escrita. */}
      <ul className="flex flex-col gap-3 @min-[640px]:hidden">
        {rows.map(row => (
          <li key={row.roomId}>
            <RoomList row={row} canCreate={canCreate} onOpen={open} onNewBooking={onNewBooking} />
          </li>
        ))}
      </ul>

      {/* De 640px para cima: a faixa por hora, onde cabe a hora escrita. */}
      <div className="hidden @min-[640px]:flex @min-[640px]:flex-col @min-[640px]:gap-2">
        <OccupancyChart
          rows={rows}
          canCreate={canCreate}
          onOpen={open}
          onNewBooking={onNewBooking}
        />
      </div>
    </div>
  )
}

/** Uma sala na lista escrita: o que está marcado, hora por hora, ou "livre". */
function RoomList({ row, canCreate, onOpen, onNewBooking }: {
  row: OccupancyRow
  canCreate: boolean
  onOpen: (key: string) => void
  onNewBooking: (roomId: string, startHour: string) => void
}) {
  const livre = row.lines.length === 0
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        {/* Sem cortar: "SALA DE VIDEO CONFERENCIA" não cabe numa linha de 390px. */}
        <p className="min-w-0 text-sm leading-tight font-semibold wrap-break-word text-foreground">{row.roomName}</p>
        <span className={cn('shrink-0 text-xs font-medium', livre ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground')}>
          {livre ? 'Livre o dia todo' : row.lines.length === 1 ? '1 horário marcado' : `${row.lines.length} horários marcados`}
        </span>
      </div>

      {livre && !canCreate && (
        <p className="px-3 py-3 text-sm text-muted-foreground">Nada marcado nesta sala neste dia.</p>
      )}

      {!livre && (
        <ul className="divide-y divide-border">
          {row.lines.map(line => (
            <li key={line.key}>
              <button
                type="button"
                onClick={() => onOpen(line.key)}
                aria-label={blockAria(row.roomName, line)}
                className="flex min-h-11 w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', BAR_CLASS[line.kind])} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold tabular-nums text-foreground">{line.time}</span>
                  <span className="block truncate text-sm text-foreground">{line.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {KIND_LABEL[line.kind]}
                    {line.note ? ` · ${line.note}` : ''}
                    {line.outside ? ' · fora das 07:00 às 22:00' : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Na lista não dá para apontar a hora com o dedo como na faixa, então o
          botão já sugere o primeiro horário livre da sala. */}
      {canCreate && (
        <div className="p-2">
          <Button
            variant="outline"
            className="h-11 w-full justify-center gap-2"
            onClick={() => onNewBooking(row.roomId, suggestedFreeHour(row))}
          >
            <Plus className="size-4" aria-hidden />
            Marcar reserva nesta sala
          </Button>
        </div>
      )}
    </div>
  )
}

/** A faixa por hora (só em tela grande). */
function OccupancyChart({ rows, canCreate, onOpen, onNewBooking }: {
  rows: OccupancyRow[]
  canCreate: boolean
  onOpen: (key: string) => void
  onNewBooking: (roomId: string, startHour: string) => void
}) {
  const ticks = occupancyTicks()

  return (
    <>
      {/* Régua das horas. As marcas de 3 em 3 horas aparecem sempre; as horas do
          meio só quando a faixa passa de 900px (16 números em menos que isso se
          embolam). A primeira e a última ficam encostadas nas pontas para não
          sair da faixa. */}
      <div className="flex items-end gap-2 pl-38">
        <div className="relative h-6 flex-1">
          {ticks.map(tick => {
            const first = tick.left <= 0
            const last = tick.left >= 100
            return (
              <span
                key={tick.minutes}
                className={cn(
                  'absolute bottom-0 flex flex-col gap-0.5 text-[11px] leading-none tabular-nums',
                  tick.major ? 'font-semibold text-foreground' : 'hidden text-muted-foreground @min-[900px]:flex',
                  first ? 'left-0 items-start' : last ? 'right-0 items-end' : 'items-center -translate-x-1/2',
                )}
                style={first || last ? undefined : { left: `${tick.left}%` }}
              >
                {tick.label}
                <span className={cn('h-1.5 w-px', tick.major ? 'bg-foreground/50' : 'bg-border')} aria-hidden />
              </span>
            )
          })}
        </div>
      </div>

      {rows.map(row => {
        // O horário que não coube nem dentro nem ao lado da barra vai escrito
        // aqui embaixo — nunca some.
        const semRotulo = row.blocks.filter(block => block.labelPlacement === 'none')
        const fora = row.lines.filter(line => line.outside)
        // "Livre" é sala sem NADA no dia. Só sem barra não basta: o que cai
        // fora das 07:00–22:00 ocupa a sala do mesmo jeito.
        const livre = row.lines.length === 0
        return (
          <div key={row.roomId} className="flex flex-col gap-1">
            <div className="flex items-stretch gap-2">
              {/* Nome inteiro em duas linhas: "SALA DE VIDEO CONFERENCIA" não
                  cabe cortado sem virar adivinhação. */}
              <p className="w-36 shrink-0 self-center text-sm leading-tight font-medium wrap-break-word text-foreground">
                {row.roomName}
              </p>
              <div
                className="relative flex-1 overflow-hidden rounded-lg border border-border bg-muted/30"
                style={{ height: `${Math.max(1, row.lanes) * LANE_HEIGHT + 8}px` }}
              >
                {/* Linhas de hora: fininhas de hora em hora, mais fortes de 3 em 3. */}
                {ticks.map(tick => (
                  tick.left > 0 && tick.left < 100 ? (
                    <span
                      key={tick.minutes}
                      className={cn('pointer-events-none absolute inset-y-0 w-px', tick.major ? 'bg-border' : 'bg-border/50')}
                      style={{ left: `${tick.left}%` }}
                      aria-hidden
                    />
                  ) : null
                ))}

                {/* Fundo clicável: abre a nova reserva na sala e no horário do clique. */}
                {canCreate ? (
                  <button
                    type="button"
                    className="absolute inset-0 h-full w-full cursor-copy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    aria-label={livre
                      ? `Sala ${row.roomName} livre o dia todo. Clique para marcar uma reserva.`
                      : `Marcar reserva na sala ${row.roomName} neste dia`}
                    title="Clique num espaço livre para marcar uma reserva"
                    onClick={e => onNewBooking(row.roomId, hourAtFraction(fractionOf(e)))}
                  />
                ) : null}

                {/* Faixa sem barra nenhuma: diz por escrito o que está havendo
                    (barra vazia sozinha não explica nada). */}
                {row.blocks.length === 0 && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {livre ? 'Livre o dia todo' : 'Nada marcado entre 07:00 e 22:00'}
                  </span>
                )}

                {row.blocks.map(block => (
                  <Fragment key={block.key}>
                    <button
                      type="button"
                      title={block.label}
                      aria-label={blockAria(row.roomName, block)}
                      onClick={() => onOpen(block.key)}
                      className={cn(
                        'absolute flex items-center overflow-hidden rounded-md px-1.5 text-left text-[11px] font-semibold text-white',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        BAR_CLASS[block.kind],
                        block.cutBefore && 'rounded-l-none',
                        block.cutAfter && 'rounded-r-none',
                      )}
                      style={{
                        left: `${block.left}%`,
                        width: `${block.width}%`,
                        top: `${4 + block.lane * LANE_HEIGHT}px`,
                        height: `${BAR_HEIGHT}px`,
                      }}
                    >
                      {block.labelPlacement === 'inside' && (
                        <span className="truncate">
                          <span className="tabular-nums">{block.time}</span> · {block.title}
                        </span>
                      )}
                    </button>
                    {block.labelPlacement === 'after' || block.labelPlacement === 'before' ? (
                      <BlockSideLabel block={block} />
                    ) : null}
                  </Fragment>
                ))}
              </div>
            </div>

            {(semRotulo.length > 0 || fora.length > 0) && (
              <div className="flex flex-col gap-0.5 pl-38 text-xs text-muted-foreground">
                {semRotulo.length > 0 && (
                  <p>
                    <span className="font-medium">Também nesta sala:</span>{' '}
                    {semRotulo.map(block => `${block.time} ${block.title}`).join(' · ')}
                  </p>
                )}
                {fora.length > 0 && (
                  <p>
                    <span className="font-medium">Fora das 07:00 às 22:00:</span>{' '}
                    {fora.map(line => `${line.time} ${line.title}`).join(' · ')}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
        {(['COURSE', 'EVENT', 'MEETING'] as ScheduleKind[]).map(kind => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-full', BAR_CLASS[kind])} aria-hidden />
            {KIND_LABEL[kind]}
          </span>
        ))}
        {canCreate && <span>Clique num espaço livre para marcar.</span>}
      </div>
    </>
  )
}

/**
 * Horário escrito ao lado da barra estreita, no espaço vazio que sobrou (antes
 * ou depois dela). `labelSpace` é esse espaço em % da faixa, então o texto
 * nunca invade a barra vizinha nem sai da faixa.
 */
function BlockSideLabel({ block }: { block: OccupancyBlock }) {
  const after = block.labelPlacement === 'after'
  const style: React.CSSProperties = {
    maxWidth: `${block.labelSpace}%`,
    top: `${4 + block.lane * LANE_HEIGHT}px`,
    height: `${BAR_HEIGHT}px`,
  }
  if (after) style.left = `${block.left + block.width}%`
  else style.right = `${100 - block.left}%`
  return (
    <span
      className={cn('pointer-events-none absolute flex items-center', after ? 'justify-start' : 'justify-end')}
      style={style}
    >
      <span className="min-w-0 truncate rounded bg-background/80 px-1 text-[11px] font-medium text-foreground">
        <span className="tabular-nums">{block.time}</span> · {block.title}
      </span>
    </span>
  )
}
