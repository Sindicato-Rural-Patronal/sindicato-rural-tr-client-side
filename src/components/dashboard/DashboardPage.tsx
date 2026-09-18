import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { toYmd } from '@/utils/dates'
import { brasiliaToday } from '@/utils/course-status'
import type { RoomScheduleItem } from '@/hooks/useRoomBookings'
import { useAdminStats, useMe } from '@/hooks/useAdmin'
import { useRooms } from '@/hooks/useRooms'
import { usePermissions } from '@/hooks/usePermissions'
import { KIND_DOT_CLASS, KIND_LABEL, KIND_LABEL_PLURAL, type ScheduleKind } from '@/lib/agenda'
import { kindDays, type DashboardSearch, type DashboardTypeFilter } from '@/lib/dashboard-agenda'
import { AgendaSection } from '@/components/agenda/AgendaSection'
import { StatsRow } from '@/components/dashboard/StatsRow'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { QuotesNoticeLine } from '@/components/dashboard/QuotesNoticeLine'
import { FinanceMonthCard } from '@/components/dashboard/FinanceMonthCard'
import { PublicCoursesCard } from '@/components/dashboard/PublicCoursesCard'
import { IncompleteUsersCard } from '@/components/dashboard/IncompleteUsersCard'
import { RecentAuditCard } from '@/components/dashboard/RecentAuditCard'
import { CustomizeDialog } from '@/components/dashboard/CustomizeDialog'
import { groupBlocks, visibleBlocks, type DashboardBlockId } from '@/components/dashboard/dashboard-prefs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'

// Agenda das salas do período (cursos, eventos e reuniões) — uma consulta só.
// O painel NÃO pagina mais a lista de cursos para pintar o calendário.
async function fetchRoomSchedule(range: { from: string; to: string; roomId?: string }): Promise<RoomScheduleItem[]> {
  const qs = new URLSearchParams({ from: range.from, to: range.to })
  if (range.roomId) qs.set('roomId', range.roomId)
  const json = await apiFetch(`/admin/room-schedule?${qs}`).then(r => r.json())
  return Array.isArray(json) ? json : (json?.data ?? [])
}

// ─── calendário ───────────────────────────────────────────────────────────────

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

type Mes = { year: number; month: number }

/** Mês (0–11) de uma data "YYYY-MM-DD". */
function mesDe(ymd: string): Mes {
  const [year, month] = ymd.split('-').map(Number)
  return { year, month: (month || 1) - 1 }
}

/**
 * Sempre 42 quadradinhos (6 linhas): o cartão não muda de altura ao trocar de mês.
 */
function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const cells: { date: string; current: boolean }[] = []

  // Meses -1/+1 que estouram o ano: `new Date` normaliza (nada de mês "00"/"13").
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: toYmd(new Date(year, month - 1, daysInPrev - i)), current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: toYmd(new Date(year, month, d)), current: true })
  }
  for (let d = 1; cells.length < 42; d++) {
    cells.push({ date: toYmd(new Date(year, month + 1, d)), current: false })
  }
  return cells
}

/** "18 de Setembro de 2026" — nome do dia para quem usa leitor de tela. */
function diaPorExtenso(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number)
  return `${day} de ${MESES[(month || 1) - 1]} de ${year}`
}

/** Botão redondo dos filtros por tipo. */
function Chip({ active, onClick, children, kind }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  kind?: ScheduleKind
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
      )}
    >
      {kind && <span className={cn('size-2.5 rounded-full ring-2 ring-background', KIND_DOT_CLASS[kind])} aria-hidden />}
      {children}
    </button>
  )
}

// ─── tela ─────────────────────────────────────────────────────────────────────

/**
 * Corpo do Painel Geral. Fica fora do arquivo de rota de propósito: a rota só
 * cuida da URL (dia, sala, tipo) e chama isto, que dá para testar sozinho.
 */
export function DashboardPage({ search, onSearch, onOpenCourse }: {
  search: DashboardSearch
  /** Muda os parâmetros da URL; `replace` para filtros (não sujam o botão Voltar). */
  onSearch: (patch: Partial<DashboardSearch>, replace?: boolean) => void
  onOpenCourse: (courseId: string) => void
}) {
  const { can } = usePermissions()
  const podeVerPessoas = can('READ_USER')
  const podeVerCursos = can('READ_COURSE')
  const podeVerFinanceiro = can('READ_FINANCE')
  const podeVerAuditoria = can('READ_AUDIT')

  const { data: me } = useMe()
  const { data: stats, isLoading: statsLoading, isError: statsError } = useAdminStats()
  const { data: salas } = useRooms()

  const [personalizando, setPersonalizando] = useState(false)

  // "Hoje" é o de Brasília (igual ao backend), não o do computador de quem abre.
  const hoje = brasiliaToday()
  const dataSelecionada = search.dia ?? hoje
  const sala = search.sala
  const tipo: DashboardTypeFilter = search.tipo ?? 'all'

  const setSearch = onSearch

  // O calendário segue o dia da URL: chegar pelo sino em outro mês abre o mês certo.
  const [mes, setMes] = useState<Mes>(() => mesDe(dataSelecionada))
  const [diaAnterior, setDiaAnterior] = useState(dataSelecionada)
  if (diaAnterior !== dataSelecionada) {
    setDiaAnterior(dataSelecionada)
    const alvo = mesDe(dataSelecionada)
    if (alvo.year !== mes.year || alvo.month !== mes.month) setMes(alvo)
  }

  const cells = useMemo(() => buildCalendar(mes.year, mes.month), [mes])
  const gridFrom = cells[0].date
  const gridTo = cells[cells.length - 1].date

  const agenda = useQuery({
    queryKey: ['admin', 'room-schedule', { from: gridFrom, to: gridTo, roomId: sala }],
    queryFn: () => fetchRoomSchedule({ from: gridFrom, to: gridTo, roomId: sala }),
    enabled: podeVerCursos,
  })

  const marcados = useMemo(() => {
    const itens = agenda.data ?? []
    const ligado = (kind: ScheduleKind) => tipo === 'all' || tipo === kind
    return {
      COURSE: ligado('COURSE') ? kindDays(itens, gridFrom, gridTo, 'COURSE') : new Set<string>(),
      EVENT: ligado('EVENT') ? kindDays(itens, gridFrom, gridTo, 'EVENT') : new Set<string>(),
      MEETING: ligado('MEETING') ? kindDays(itens, gridFrom, gridTo, 'MEETING') : new Set<string>(),
    }
  }, [agenda.data, gridFrom, gridTo, tipo])

  function irParaMes(delta: number) {
    setMes(prev => {
      const total = prev.year * 12 + prev.month + delta
      return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
    })
  }

  /** Atalho "Nova reserva": a agenda abre o formulário ao ver `?nova=reserva`. */
  function novaReserva() {
    setSearch({ nova: 'reserva' })
    document.getElementById('agenda-painel')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  // Blocos que ESTE admin pode ver (o resto nem entra na personalização).
  const disponiveis = useMemo(() => {
    const lista: DashboardBlockId[] = ['acoes', 'numeros']
    if (stats?.quotesToday) lista.push('cotacoes')
    if (podeVerFinanceiro) lista.push('financeiro')
    if (podeVerCursos) lista.push('agenda', 'cursos')
    if (podeVerPessoas) lista.push('incompletos')
    if (podeVerAuditoria) lista.push('auditoria')
    return lista
  }, [stats?.quotesToday, podeVerFinanceiro, podeVerCursos, podeVerPessoas, podeVerAuditoria])

  const blocos = visibleBlocks(me?.dashboardPrefs, disponiveis)

  const calendario = (
    <div id="agenda-painel" className="flex flex-col gap-4">
      {/* Filtros da agenda */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-2">
          <Chip active={tipo === 'all'} onClick={() => setSearch({ tipo: undefined }, true)}>Todos</Chip>
          {(['COURSE', 'EVENT', 'MEETING'] as ScheduleKind[]).map(kind => (
            <Chip key={kind} kind={kind} active={tipo === kind} onClick={() => setSearch({ tipo: kind }, true)}>
              {KIND_LABEL[kind]}
            </Chip>
          ))}
        </div>
        <div>
          <label htmlFor="agenda-sala" className="sr-only">Sala</label>
          <NativeSelect
            id="agenda-sala"
            className="h-9 w-full sm:min-w-48"
            value={sala ?? ''}
            onChange={e => setSearch({ sala: e.target.value || undefined }, true)}
          >
            <option value="">Todas as salas</option>
            {salas?.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                {MESES[mes.month]} {mes.year}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-8" onClick={() => irParaMes(-1)} aria-label="Mês anterior">
                  <ChevronLeft className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { setMes(mesDe(hoje)); setSearch({ dia: undefined }) }}
                >
                  Hoje
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => irParaMes(1)} aria-label="Próximo mês">
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {agenda.isError && (
              <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                Erro ao carregar a agenda do mês.
              </p>
            )}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map(({ date, current }) => {
                const selecionado = date === dataSelecionada
                const ehHoje = date === hoje
                const tipos = (['COURSE', 'EVENT', 'MEETING'] as ScheduleKind[]).filter(k => marcados[k].has(date))
                // Cor nunca é a única pista: o nome do que tem no dia vai no rótulo.
                const rotulo = [
                  diaPorExtenso(date),
                  ehHoje ? 'hoje' : null,
                  ...tipos.map(k => KIND_LABEL[k].toLowerCase()),
                ].filter(Boolean).join(', ')
                return (
                  <button
                    key={date}
                    type="button"
                    aria-label={rotulo}
                    aria-pressed={selecionado}
                    aria-current={ehHoje ? 'date' : undefined}
                    onClick={() => setSearch({ dia: date })}
                    className={cn(
                      'relative flex h-11 flex-col items-center justify-center rounded-lg text-sm transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      current ? 'text-foreground hover:bg-muted' : 'text-muted-foreground/40',
                      selecionado && 'bg-primary text-primary-foreground hover:bg-primary',
                      ehHoje && !selecionado && 'ring-1 ring-primary/50',
                    )}
                  >
                    <span className="font-medium">{Number(date.slice(8, 10))}</span>
                    {tipos.length > 0 && (
                      <span className="mt-0.5 flex items-center gap-0.5" aria-hidden>
                        {tipos.map(k => (
                          <span
                            key={k}
                            className={cn('size-1.5 rounded-full', selecionado ? 'bg-primary-foreground/80' : KIND_DOT_CLASS[k])}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
              {(['COURSE', 'EVENT', 'MEETING'] as ScheduleKind[])
                .filter(k => tipo === 'all' || tipo === k)
                .map(k => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span className={cn('size-2 rounded-full', KIND_DOT_CLASS[k])} aria-hidden /> {KIND_LABEL_PLURAL[k]}
                  </span>
                ))}
              <span className="flex items-center gap-1.5">
                <span className="size-4 rounded ring-1 ring-primary/50" aria-hidden /> Hoje
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Agenda do dia/semana: é aqui que se marca, edita e exclui reserva. */}
        <AgendaSection
          dia={dataSelecionada}
          sala={sala}
          tipo={tipo}
          onChangeDia={dia => setSearch({ dia })}
          onOpenCourse={onOpenCourse}
          abrirNovaReserva={search.nova === 'reserva'}
          onNovaReservaAberta={() => setSearch({ nova: undefined }, true)}
        />
      </div>
    </div>
  )

  function bloco(id: DashboardBlockId) {
    switch (id) {
      case 'acoes': return <QuickActions onNovaReserva={novaReserva} />
      case 'numeros': return <StatsRow stats={stats} isLoading={statsLoading} isError={statsError} />
      case 'cotacoes': return <QuotesNoticeLine quotes={stats?.quotesToday} />
      case 'financeiro': return <FinanceMonthCard />
      case 'agenda': return calendario
      case 'cursos': return <PublicCoursesCard />
      case 'incompletos': return <IncompleteUsersCard />
      case 'auditoria': return <RecentAuditCard />
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Painel Geral</h1>
          <p className="text-sm text-muted-foreground">
            O que precisa de atenção hoje, a agenda das salas e os números do sistema.
          </p>
        </div>
        <Button variant="outline" className="h-10 gap-2" onClick={() => setPersonalizando(true)}>
          <SlidersHorizontal className="size-4" aria-hidden /> Personalizar
        </Button>
      </div>

      {groupBlocks(blocos).map(grupo => (
        grupo.length > 1 ? (
          <div key={grupo.join('-')} className="grid gap-6 lg:grid-cols-2">
            {grupo.map(id => <div key={id}>{bloco(id)}</div>)}
          </div>
        ) : (
          <div key={grupo[0]}>{bloco(grupo[0])}</div>
        )
      ))}

      {personalizando && (
        <CustomizeDialog
          open
          onOpenChange={setPersonalizando}
          prefs={me?.dashboardPrefs}
        />
      )}
    </div>
  )
}
