import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CalendarCheck, ChevronLeft, ChevronRight, Download, Loader2, Plus, Printer, Search, X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AgendaItemCard } from '@/components/agenda/AgendaItem'
import { BookingDialog } from '@/components/agenda/BookingDialog'
import { RoomOccupancy } from '@/components/agenda/RoomOccupancy'
import { WeekAgenda } from '@/components/agenda/WeekAgenda'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePermissions } from '@/hooks/usePermissions'
import { useIsMobile } from '@/hooks/use-mobile'
import { useRooms } from '@/hooks/useRooms'
import { useRoomBookings, useRoomSchedule, type RoomBooking } from '@/hooks/useRoomBookings'
import { apiErrorMessage } from '@/lib/api-error-message'
import { downloadExport } from '@/lib/export'
import {
  KIND_LABEL, addDays, agendaCountLabel, agendaEntries, formatDateBr, isValidYmd, itemsByDay, itemsOfDay,
  plusOneHour, rangeLabel, visibleRange, weekDays, weekdayLong,
  type AgendaEntry, type AgendaTypeFilter, type AgendaView, type BookingType,
} from '@/lib/agenda'
import { cn } from '@/lib/utils'

// Agenda das salas do Painel Geral: cursos, eventos e reuniões do dia ou da
// semana. É por aqui que se marca, edita, exclui, exporta e imprime. Tudo o que
// aparece vem das MESMAS duas buscas do período visível (uma por período, nunca
// uma por dia), então a lista, a semana e a faixa de ocupação nunca discordam.

type DialogState = {
  open: boolean
  /** Reserva a editar; null = nova reserva. */
  booking: RoomBooking | null
  defaults: { date?: string; roomId?: string; startHour?: string; endHour?: string }
}

const CLOSED: DialogState = { open: false, booking: null, defaults: {} }

function bookingTypeOf(tipo: AgendaTypeFilter): BookingType | undefined {
  return tipo === 'EVENT' || tipo === 'MEETING' ? tipo : undefined
}

export function AgendaSection({
  dia, sala, tipo: tipoProp = 'ALL', onOpenCourse, onChangeDia,
  abrirNovaReserva = false, onNovaReservaAberta,
}: {
  /** Dia em foco ("YYYY-MM-DD"), o mesmo do calendário do painel. */
  dia: string
  /** Sala do filtro (id); vazio = todas. */
  sala?: string
  /** Tipo do filtro; "ALL" (ou "all", como vem da URL do painel) = todos. */
  tipo?: AgendaTypeFilter | 'all'
  /** Curso continua abrindo a tela de cursos. */
  onOpenCourse: (courseId: string) => void
  /** Trocar o dia em foco (a URL do painel manda no dia). */
  onChangeDia: (dia: string) => void
  /** Atalho "Nova reserva" do topo do painel (`?nova=reserva` na URL). */
  abrirNovaReserva?: boolean
  /** Avisa que o formulário abriu, para o painel tirar o atalho da URL. */
  onNovaReservaAberta?: () => void
}) {
  const tipo: AgendaTypeFilter = tipoProp === 'all' ? 'ALL' : tipoProp
  const { can } = usePermissions()
  const canRead = can('READ_COURSE')
  const canCreate = can('CREATE_COURSE')
  const canUpdate = can('UPDATE_COURSE')
  const canDelete = can('DELETE_COURSE')
  const isMobile = useIsMobile()

  const [view, setView] = useState<AgendaView>('day')
  const [searchInput, setSearchInput] = useState('')
  const [dialog, setDialog] = useState<DialogState>(CLOSED)
  const [showOccupancy, setShowOccupancy] = useState(!isMobile)
  const [periodOpen, setPeriodOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const search = useDebouncedValue(searchInput, 350).trim()
  const { from, to } = visibleRange(dia, view)
  const showCourses = (tipo === 'ALL' || tipo === 'COURSE') && !search
  const showBookings = tipo !== 'COURSE'
  const bookingType = bookingTypeOf(tipo)

  const { data: salas } = useRooms()

  // Uma busca por período: cursos (agenda das salas) e reservas (com o
  // responsável, que a agenda não traz). Nada é buscado dia a dia.
  const schedule = useRoomSchedule({ from, to, roomId: sala }, { enabled: canRead })
  const bookings = useRoomBookings(
    { from, to, roomId: sala, type: bookingType, search: search || undefined },
    { enabled: canRead && showBookings },
  )

  const items = useMemo(
    () => agendaEntries(showCourses ? schedule.data ?? [] : [], showBookings ? bookings.data ?? [] : []),
    [schedule.data, bookings.data, showCourses, showBookings],
  )

  const days = useMemo(() => (view === 'day' ? [dia] : weekDays(dia)), [view, dia])
  const perDay = useMemo(() => itemsByDay(items, days), [items, days])
  const dayItems = useMemo(() => itemsOfDay(items, dia), [items, dia])

  // Contagem do que está na tela (item de vários dias conta uma vez só).
  const visiveis = useMemo(() => {
    const seen = new Map<string, AgendaEntry>()
    for (const day of perDay) for (const item of day.items) seen.set(item.key, item)
    return [...seen.values()]
  }, [perDay])
  const cursosVisiveis = visiveis.filter(i => i.kind === 'COURSE').length
  const contagem = agendaCountLabel(cursosVisiveis, visiveis.length - cursosVisiveis)

  const carregando = (canRead && showBookings && bookings.isLoading) || (canRead && showCourses && schedule.isLoading)
  const erro = (showBookings && bookings.isError) || (showCourses && schedule.isError)

  function openItem(item: AgendaEntry) {
    if (item.kind === 'COURSE') {
      onOpenCourse(item.id)
      return
    }
    const cheia = bookings.data?.find(b => b.id === item.id) ?? null
    if (!cheia) {
      toast.error('Não foi possível abrir esta reserva. Atualize a página e tente de novo.')
      return
    }
    setDialog({ open: true, booking: cheia, defaults: {} })
  }

  function newBooking(defaults: DialogState['defaults']) {
    setDialog({ open: true, booking: null, defaults: { date: dia, roomId: sala, ...defaults } })
  }

  // Atalho "Nova reserva" do topo do painel: abre o formulário aqui embaixo e
  // devolve o aviso, para o painel tirar `?nova=reserva` da URL (senão o
  // formulário reabriria ao voltar para esta página).
  const [atalhoAtendido, setAtalhoAtendido] = useState(false)
  if (abrirNovaReserva && !atalhoAtendido) {
    setAtalhoAtendido(true)
    if (canCreate) setDialog({ open: true, booking: null, defaults: { date: dia, roomId: sala } })
    onNovaReservaAberta?.()
  }
  if (!abrirNovaReserva && atalhoAtendido) setAtalhoAtendido(false)

  async function runExport(params: { from: string; to: string }) {
    setExporting(true)
    try {
      const count = await downloadExport('room-bookings', {
        from: params.from,
        to: params.to,
        roomId: sala,
        type: bookingType,
        search: search || undefined,
      })
      toast.success(count === 1 ? 'Planilha com 1 reserva baixada.' : count >= 0 ? `Planilha com ${count} reservas baixada.` : 'Planilha baixada.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao exportar.'))
    }
    setExporting(false)
  }

  const [printing, setPrinting] = useState(false)
  async function imprimirAgenda() {
    setPrinting(true)
    try {
      const { printAgendaPdf } = await import('@/lib/agenda-pdf')
      await printAgendaPdf(perDay, from, to, {
        room: salas?.find(r => r.id === sala)?.name ?? null,
        kind: tipo === 'ALL' ? null : KIND_LABEL[tipo],
        search: search || null,
      })
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível gerar o PDF da agenda.'))
    }
    setPrinting(false)
  }

  const salasDaFaixa = sala ? (salas ?? []).filter(r => r.id === sala) : (salas ?? [])

  return (
    <Card>
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex min-w-0 items-center gap-2 text-base">
            <CalendarCheck className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="capitalize">
              {view === 'day' ? `${weekdayLong(dia)}, ${formatDateBr(dia)}` : `Semana de ${rangeLabel(from, to)}`}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {contagem && <Badge variant="secondary">{contagem}</Badge>}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label={view === 'day' ? 'Dia anterior' : 'Semana anterior'}
                onClick={() => onChangeDia(addDays(dia, view === 'day' ? -1 : -7))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label={view === 'day' ? 'Próximo dia' : 'Próxima semana'}
                onClick={() => onChangeDia(addDays(dia, view === 'day' ? 1 : 7))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            {/* Dia / Semana */}
            <div role="group" aria-label="Como ver a agenda" className="flex rounded-lg border bg-muted/40 p-1">
              {(['day', 'week'] as AgendaView[]).map(option => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={view === option}
                  onClick={() => setView(option)}
                  className={cn(
                    'h-9 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    view === option ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {option === 'day' ? 'Dia' : 'Semana'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showBookings && (
            // No celular a busca fica numa linha só dela: espremida entre os
            // botões, não dava para ler o que foi digitado.
            <div className="relative w-full min-w-0 sm:w-auto sm:max-w-xs sm:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="agenda-busca"
                className="h-9 pl-9 pr-9"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Buscar por título ou responsável"
                aria-label="Buscar reserva por título ou responsável"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  aria-label="Limpar busca"
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          )}

          {canRead && showBookings && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2" disabled={exporting}>
                  {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Planilha CSV das reservas (eventos e reuniões). Cursos não entram nesta planilha.
                </DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => runExport({ from, to })}>
                  {view === 'day' ? `Este dia (${formatDateBr(dia)})` : `Esta semana (${rangeLabel(from, to)})`}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setPeriodOpen(true)}>Escolher período…</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button variant="outline" className="h-9 gap-2" onClick={imprimirAgenda} disabled={printing}>
            {printing ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
            Imprimir
          </Button>

          {canCreate && (
            <Button className="h-9" onClick={() => newBooking({})}>
              <Plus className="size-4" /> Nova reserva
            </Button>
          )}
        </div>

        {search && (
          <p className="text-xs text-muted-foreground">
            A busca procura em eventos e reuniões (título e responsável). Cursos não entram na busca.
          </p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {erro && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span>Erro ao carregar a agenda das salas.</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => { void schedule.refetch(); void bookings.refetch() }}
            >
              Tentar de novo
            </Button>
          </div>
        )}

        {carregando && !erro ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : view === 'week' ? (
          <WeekAgenda
            days={days}
            items={items}
            selected={dia}
            onSelectDay={ymd => { onChangeDia(ymd); setView('day') }}
            onOpenItem={openItem}
          />
        ) : dayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 rounded-full bg-muted p-4">
              <CalendarCheck className="size-6 text-muted-foreground" aria-hidden />
            </div>
            {search ? (
              <>
                <p className="text-sm font-medium text-foreground">Nada encontrado para “{search}”.</p>
                <p className="text-xs text-muted-foreground">A busca vale só para eventos e reuniões.</p>
                <Button variant="outline" size="sm" className="mt-3 h-9" onClick={() => setSearchInput('')}>
                  Limpar busca
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Nada marcado neste dia.</p>
                <p className="text-xs text-muted-foreground">Selecione outro dia no calendário</p>
              </>
            )}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {dayItems.map(item => (
              <li key={item.key}>
                <AgendaItemCard item={item} onOpen={() => openItem(item)} />
              </li>
            ))}
          </ul>
        )}

        {/* Faixa de ocupação das salas do dia (fechada no celular). */}
        {view === 'day' && !erro && (
          <div className="border-t pt-3">
            <Button
              variant="ghost"
              className="h-10 w-full justify-between px-2 text-sm font-medium"
              aria-expanded={showOccupancy}
              onClick={() => setShowOccupancy(v => !v)}
            >
              Ocupação das salas (07:00 às 22:00)
              <ChevronRight className={cn('size-4 transition-transform', showOccupancy && 'rotate-90')} aria-hidden />
            </Button>
            {showOccupancy && (
              <div className="pt-3">
                <RoomOccupancy
                  date={dia}
                  items={dayItems}
                  rooms={salasDaFaixa}
                  canCreate={canCreate}
                  onOpenItem={openItem}
                  onNewBooking={(roomId, startHour) =>
                    newBooking({ roomId, startHour, endHour: plusOneHour(startHour) })}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>

      <BookingDialog
        open={dialog.open}
        booking={dialog.booking}
        defaults={dialog.defaults}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onClose={() => setDialog(prev => ({ ...prev, open: false }))}
      />

      <ExportPeriodDialog
        open={periodOpen}
        from={from}
        to={to}
        busy={exporting}
        onClose={() => setPeriodOpen(false)}
        onConfirm={range => { setPeriodOpen(false); void runExport(range) }}
      />
    </Card>
  )
}

/** Exportar as reservas de um período maior (de/até escolhidos à mão). */
function ExportPeriodDialog({ open, from, to, busy, onClose, onConfirm }: {
  open: boolean
  from: string
  to: string
  busy: boolean
  onClose: () => void
  onConfirm: (range: { from: string; to: string }) => void
}) {
  const [inicio, setInicio] = useState(from)
  const [fim, setFim] = useState(to)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    // Cada abertura começa no período que está na tela.
    if (open) { setInicio(from); setFim(to) }
  }
  const valido = isValidYmd(inicio) && isValidYmd(fim) && fim >= inicio

  return (
    <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar por período</DialogTitle>
          <DialogDescription>
            Planilha das reservas (eventos e reuniões) entre as duas datas. Os cursos não entram nesta planilha.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agenda-export-de" className="text-sm font-medium">De *</Label>
            <DatePicker id="agenda-export-de" className="h-10" value={inicio} onChange={setInicio} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agenda-export-ate" className="text-sm font-medium">Até *</Label>
            <DatePicker id="agenda-export-ate" className="h-10" value={fim} onChange={setFim} />
          </div>
        </div>
        {!valido && (
          <p role="alert" className="text-sm text-destructive">
            Informe as duas datas; a data final precisa ser igual ou depois da inicial.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" className="h-10" onClick={onClose}>Cancelar</Button>
          <Button className="h-10" disabled={!valido || busy} onClick={() => onConfirm({ from: inicio, to: fim })}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
