import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { apiFetch } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error-message'
import { toYmd } from '@/utils/dates'
import { brasiliaToday } from '@/utils/course-status'
import type { RoomScheduleItem } from '@/hooks/useRoomBookings'
import { useAdminStats, useMe, useUpdateDashboardPrefs } from '@/hooks/useAdmin'
import { useRooms } from '@/hooks/useRooms'
import { usePermissions } from '@/hooks/usePermissions'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
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
import { EditModeBar } from '@/components/dashboard/EditModeBar'
import { EditableBlock } from '@/components/dashboard/EditableBlock'
import {
  DASHBOARD_BLOCKS, applyOrder, blockSizes, buildRows, defaultDraft, dropBlock, editableBlocks,
  moveBlock, prefsDraft, prefsToSave, sameDraft, setBlockSize, toggleHidden, visibleBlocks,
  type DashboardBlockId, type DashboardBlockSize, type DashboardCell, type DashboardDraft,
} from '@/components/dashboard/dashboard-prefs'
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

/** Nome e explicação de cada bloco, para o modo de organizar. */
const META = new Map(DASHBOARD_BLOCKS.map(b => [b.id, b] as const))

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

  // Rascunho do modo de organizar. null = painel normal (é assim que a tela
  // sabe se está editando); só o clique em Salvar grava no servidor.
  const [rascunho, setRascunho] = useState<DashboardDraft | null>(null)
  // Altura da barra de organizar, medida por ela (ver o respiro no fim da tela).
  const [alturaBarra, setAlturaBarra] = useState(0)
  const salvarPrefs = useUpdateDashboardPrefs()

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

  // ─── modo de organizar ──────────────────────────────────────────────────
  const editando = rascunho !== null
  const salvo = useMemo(() => prefsDraft(me?.dashboardPrefs), [me?.dashboardPrefs])
  const alterado = rascunho !== null && !sameDraft(rascunho, salvo)
  // Sair da tela com o rascunho pela metade pergunta antes (diálogo do painel).
  useUnsavedGuard(alterado)

  // Ordem dos blocos que ESTE admin mexe (os sem permissão nem aparecem aqui).
  const ordemEdicao = rascunho ? editableBlocks(rascunho.order, disponiveis) : []

  const linhas: DashboardCell[][] = rascunho
    ? buildRows(ordemEdicao, rascunho.sizes)
    : buildRows(visibleBlocks(me?.dashboardPrefs, disponiveis), blockSizes(me?.dashboardPrefs))

  // Arrastar precisa de um empurrãozinho antes de valer: sem isso, um toque na
  // alça já viraria arrasto e a pessoa moveria o bloco sem querer.
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  /** Mexe só na parte visível da ordem e devolve a lista completa. */
  function reordenar(muda: (visiveis: DashboardBlockId[]) => DashboardBlockId[]) {
    setRascunho(prev => {
      if (!prev) return prev
      const visiveis = editableBlocks(prev.order, disponiveis)
      return { ...prev, order: applyOrder(prev.order, disponiveis, muda(visiveis)) }
    })
  }

  function aoSoltar(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    reordenar(v => dropBlock(v, active.id as DashboardBlockId, over.id as DashboardBlockId))
  }

  function mudarLargura(id: DashboardBlockId, size: DashboardBlockSize) {
    setRascunho(prev => (prev ? { ...prev, sizes: setBlockSize(prev.sizes, id, size) } : prev))
  }

  function esconderMostrar(id: DashboardBlockId) {
    setRascunho(prev => (prev ? { ...prev, hidden: toggleHidden(prev.hidden, id) } : prev))
  }

  async function salvarPainel() {
    if (!rascunho) return
    try {
      await salvarPrefs.mutateAsync(prefsToSave(rascunho))
      setRascunho(null)
      toast.success('Painel salvo do seu jeito')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível salvar. O painel continua como estava.'))
    }
  }

  function restaurarPadrao() {
    setRascunho(defaultDraft())
    toast.success('Voltou ao padrão. Clique em Salvar para guardar.')
  }

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

  /** Um bloco na tela: no modo de organizar vai dentro da moldura com os controles. */
  function celula({ id, size }: DashboardCell) {
    if (!rascunho) return <div key={id}>{bloco(id)}</div>
    const meta = META.get(id)
    const posicao = ordemEdicao.indexOf(id)
    return (
      <EditableBlock
        key={id}
        id={id}
        label={meta?.label ?? id}
        hint={meta?.hint ?? ''}
        size={size}
        escondido={rascunho.hidden.includes(id)}
        primeiro={posicao === 0}
        ultimo={posicao === ordemEdicao.length - 1}
        onMover={delta => reordenar(v => moveBlock(v, id, delta))}
        onLargura={largura => mudarLargura(id, largura)}
        onEsconder={() => esconderMostrar(id)}
      >
        {bloco(id)}
      </EditableBlock>
    )
  }

  // As linhas são iguais no painel normal e no modo de organizar: é o mesmo
  // desenho, por isso a pessoa vê de verdade o que vai ficar salvo.
  const corpo = linhas.map(linha => (
    linha.length > 1 ? (
      <div key={linha.map(c => c.id).join('-')} className="grid gap-6 lg:grid-cols-2">
        {linha.map(celula)}
      </div>
    ) : (
      <div key={linha[0].id}>{celula(linha[0])}</div>
    )
  ))

  return (
    // No celular a barra de organizar fica no pé da tela. O respiro embaixo vem
    // da ALTURA MEDIDA dela (ela quebra em duas ou três linhas conforme o
    // aparelho): com um valor fixo o último bloco ficava escondido atrás.
    <div
      className={cn('flex flex-col gap-6 p-4 sm:p-6', editando && 'pb-[calc(var(--barra-organizar)+1.5rem)] md:pb-6')}
      style={editando ? ({ '--barra-organizar': `${alturaBarra}px` } as React.CSSProperties) : undefined}
    >
      {editando && (
        <EditModeBar
          alterado={alterado}
          salvando={salvarPrefs.isPending}
          onSalvar={() => void salvarPainel()}
          onCancelar={() => setRascunho(null)}
          onRestaurar={restaurarPadrao}
          onAltura={setAlturaBarra}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Painel Geral</h1>
          <p className="text-sm text-muted-foreground">
            {editando
              ? 'Mude a ordem, a largura e o que aparece. O painel vai mudando aqui embaixo.'
              : 'O que precisa de atenção hoje, a agenda das salas e os números do sistema.'}
          </p>
        </div>
        {!editando && (
          <Button
            variant="outline"
            className="h-11 gap-2 px-3"
            onClick={() => setRascunho(prefsDraft(me?.dashboardPrefs))}
          >
            <SlidersHorizontal className="size-4" aria-hidden /> Personalizar
          </Button>
        )}
      </div>

      {rascunho ? (
        <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
          {/* A lista do arrastar é plana (a ordem dos blocos); as linhas são só o desenho. */}
          <SortableContext items={ordemEdicao} strategy={rectSortingStrategy}>
            <div className="flex flex-col gap-6">{corpo}</div>
          </SortableContext>
        </DndContext>
      ) : corpo}
    </div>
  )
}
