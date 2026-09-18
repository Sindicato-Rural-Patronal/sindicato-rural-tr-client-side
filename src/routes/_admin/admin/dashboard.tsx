import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { toYmd } from '@/utils/dates'
import type { CourseCardItem, PaginatedCourses } from '@/hooks/useCourse'
import type { RoomScheduleItem } from '@/hooks/useRoomBookings'
import { useAdminStats, useAdminUsers } from '@/hooks/useAdmin'
import { useRooms } from '@/hooks/useRooms'
import { usePermissions } from '@/hooks/usePermissions'
import { memberTypeLabel } from '@/lib/member-types'
import { KIND_DOT_CLASS, KIND_LABEL, type ScheduleKind } from '@/lib/agenda'
import {
  bookingDays, parseDashboardSearch,
  type DashboardSearch, type DashboardTypeFilter,
} from '@/lib/dashboard-agenda'
import { DayAgendaPanel } from '@/components/agenda/DayAgendaPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  BookOpen, Users, ChevronLeft, ChevronRight,
  Shield, GraduationCap, DoorOpen, UserX, ArrowRight,
} from 'lucide-react'

export const Route = createFileRoute('/_admin/admin/dashboard')({
  // Dia, sala e tipo da agenda ficam na URL (voltar/atualizar/compartilhar).
  validateSearch: parseDashboardSearch,
  component: RouteComponent,
})

// O calendário precisa de TODOS os cursos, não só a primeira página. Pagina em
// blocos de 100 até acabar (teto de 50 páginas = 5000 cursos de segurança).
async function fetchAllAdminCourses(): Promise<CourseCardItem[]> {
  const all: CourseCardItem[] = []
  for (let page = 1; page <= 50; page++) {
    const qs = new URLSearchParams({ page: String(page), limit: '100' })
    const json = (await apiFetch(`/admin/courses?${qs}`).then(r => r.json())) as PaginatedCourses
    all.push(...json.data)
    if (page >= (json.totalPages ?? 1)) break
  }
  return all
}

// Reservas de sala (eventos e reuniões) do período. Horários "de parede", como
// os cursos. Mesma chave de cache das mutações de reserva (salvar atualiza aqui).
async function fetchRoomSchedule(range: { from: string; to: string; roomId?: string }): Promise<RoomScheduleItem[]> {
  const qs = new URLSearchParams({ from: range.from, to: range.to })
  if (range.roomId) qs.set('roomId', range.roomId)
  const json = await apiFetch(`/admin/room-schedule?${qs}`).then(r => r.json())
  return Array.isArray(json) ? json : (json?.data ?? [])
}

// ─── calendar helpers ─────────────────────────────────────────────────────────

function ptMonth(m: number) {
  return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m]
}

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const cells: { date: string; current: boolean }[] = []

  // Meses -1/+1 que estouram o ano: `new Date` normaliza (nada de mês "00"/"13").
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i
    cells.push({ date: toYmd(new Date(year, month - 1, d)), current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: toYmd(new Date(year, month, d)), current: true })
  }
  while (cells.length % 7 !== 0) {
    const d = cells.length - daysInMonth - firstDay + 1
    cells.push({ date: toYmd(new Date(year, month + 1, d)), current: false })
  }
  return cells
}

function coursesInRange<T extends { startDate?: string | null; endDate?: string | null }>(courses: T[], date: string): T[] {
  return courses.filter(c => {
    const start = c.startDate?.slice(0, 10)
    const end = c.endDate?.slice(0, 10)
    if (!start) return false
    return date >= start && date <= (end ?? start)
  })
}

/** Ids dos cursos que a agenda devolveu (usados quando há filtro de sala). */
function courseIdsOf(items: RoomScheduleItem[] | undefined): Set<string> {
  return new Set((items ?? []).filter(i => i.kind === 'COURSE').map(i => i.id))
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

// ─── stat card ────────────────────────────────────────────────────────────────

// Só números. Pendências (o que precisa de atenção) ficam no sino de notificações.
function StatCard({
  title, value, description, icon: Icon,
}: {
  title: string
  value: number | string
  description: string
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

// ─── component ────────────────────────────────────────────────────────────────

function RouteComponent() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data: cursos } = useQuery({
    queryKey: ['admin', 'courses', 'all'],
    queryFn: fetchAllAdminCourses,
  })
  const { data: stats, isError: statsError } = useAdminStats()
  const { data: salas } = useRooms()
  // Cadastros incompletos só para quem pode ver pessoas (sem READ_USER a API recusa).
  const { can } = usePermissions()
  const canReadUsers = can('READ_USER')
  const canReadCourses = can('READ_COURSE')
  const { data: incompletosData, isError: incompletosError } = useAdminUsers(
    { page: 1, limit: 5, incompleteRegistration: true },
    { enabled: canReadUsers },
  )

  const today = new Date()
  const todayStr = toYmd(today)

  const dataSelecionada = search.dia ?? todayStr
  const sala = search.sala
  const tipo: DashboardTypeFilter = search.tipo ?? 'all'

  function setSearch(patch: Partial<DashboardSearch>) {
    navigate({ search: prev => ({ ...prev, ...patch }), replace: true })
  }

  // O mês começa no dia que veio da URL (link direto abre o mês certo).
  const [mesAtual, setMesAtual] = useState(() => {
    const d = new Date(dataSelecionada + 'T12:00:00')
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const cells = useMemo(() => buildCalendar(mesAtual.year, mesAtual.month), [mesAtual])

  // Reservas dos dias visíveis no calendário (inclui as pontas dos meses vizinhos).
  const gridFrom = cells[0].date
  const gridTo = cells[cells.length - 1].date
  const scheduleQuery = useQuery({
    queryKey: ['admin', 'room-schedule', { from: gridFrom, to: gridTo, roomId: sala }],
    queryFn: () => fetchRoomSchedule({ from: gridFrom, to: gridTo, roomId: sala }),
    enabled: canReadCourses,
  })
  // Dia selecionado fora da grade (trocou de mês sem clicar em outro dia).
  const selectedOutsideGrid = dataSelecionada < gridFrom || dataSelecionada > gridTo
  const selectedDayQuery = useQuery({
    queryKey: ['admin', 'room-schedule', { from: dataSelecionada, to: dataSelecionada, roomId: sala }],
    queryFn: () => fetchRoomSchedule({ from: dataSelecionada, to: dataSelecionada, roomId: sala }),
    enabled: canReadCourses && selectedOutsideGrid,
  })

  const mostrarCursos = tipo === 'all' || tipo === 'COURSE'
  const mostrarReservas = tipo !== 'COURSE'

  // Curso não guarda sala na listagem: com filtro de sala, vale o que a agenda devolveu.
  const filtrarCursos = useMemo(() => {
    return (agenda: RoomScheduleItem[] | undefined) => {
      if (!mostrarCursos) return []
      const todos = cursos ?? []
      if (!sala) return todos
      const ids = courseIdsOf(agenda)
      return todos.filter(c => ids.has(c.id))
    }
  }, [cursos, sala, mostrarCursos])

  const reservasDoPeriodo = selectedOutsideGrid ? selectedDayQuery.data : scheduleQuery.data
  const reservasErro = selectedOutsideGrid ? selectedDayQuery.isError : scheduleQuery.isError

  const reservasDaGrade = useMemo(
    () => (mostrarReservas ? (scheduleQuery.data ?? []).filter(i => tipo === 'all' || i.kind === tipo) : []),
    [scheduleQuery.data, tipo, mostrarReservas],
  )
  const reservasDoDia = useMemo(
    () => (mostrarReservas ? (reservasDoPeriodo ?? []).filter(i => tipo === 'all' || i.kind === tipo) : []),
    [reservasDoPeriodo, tipo, mostrarReservas],
  )

  const diasComReserva = useMemo(
    () => bookingDays(reservasDaGrade, gridFrom, gridTo),
    [reservasDaGrade, gridFrom, gridTo],
  )

  const cursosPublicos = (cursos ?? []).filter(c => c.status === 'PUBLIC')

  // Dias com cursos (para marcar no calendário)
  const diasComCurso = useMemo(() => {
    const set = new Set<string>()
    filtrarCursos(scheduleQuery.data).forEach(c => {
      if (!c.startDate) return
      // Usa a MESMA base da lista (data fatiada, sem fuso). Ancorar ao meio-dia
      // local evita o off-by-one: antes `new Date(startDate)` (instante UTC) +
      // getters locais deslocava a bolinha 1 dia vs a lista.
      const startStr = c.startDate.slice(0, 10)
      const endStr = (c.endDate ?? c.startDate).slice(0, 10)
      const start = new Date(startStr + 'T12:00:00')
      const end = new Date(endStr + 'T12:00:00')
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        set.add(toYmd(d))
      }
    })
    return set
  }, [filtrarCursos, scheduleQuery.data])

  const cursosDoDia = useMemo(
    () => coursesInRange(filtrarCursos(reservasDoPeriodo), dataSelecionada),
    [filtrarCursos, reservasDoPeriodo, dataSelecionada],
  )

  function prevMonth() {
    setMesAtual(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 }
      return { ...prev, month: prev.month - 1 }
    })
  }

  function nextMonth() {
    setMesAtual(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { ...prev, month: prev.month + 1 }
    })
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Painel Geral</h1>
        <p className="text-sm text-muted-foreground">
          Cursos, eventos e reuniões das salas, e os números do sistema.
        </p>
      </div>

      {statsError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Erro ao carregar as estatísticas do painel.
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats === undefined ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-12 mb-1" /><Skeleton className="h-3 w-32" /></CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title="Total de Cursos"
              value={stats.courses?.total ?? 0}
              description={`${stats.courses?.public ?? 0} público${(stats.courses?.public ?? 0) !== 1 ? 's' : ''}`}
              icon={BookOpen}
            />
            <StatCard
              title="Associados"
              value={stats.totalUsers}
              description="Cadastrados no sistema"
              icon={Users}
            />
            <StatCard
              title="Administradores"
              value={stats.totalAdmins}
              description="Com acesso ao painel"
              icon={Shield}
            />
            <StatCard
              title="Salas"
              value={salas?.length ?? '—'}
              description="Disponíveis"
              icon={DoorOpen}
            />
            <StatCard
              title="Inscrições"
              value={stats.registrationsLast30Days}
              description="Nos últimos 30 dias"
              icon={GraduationCap}
            />
          </>
        )}
      </div>

      {/* Filtros da agenda */}
      {canReadCourses && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-2">
            <Chip active={tipo === 'all'} onClick={() => setSearch({ tipo: undefined })}>Todos</Chip>
            {(['COURSE', 'EVENT', 'MEETING'] as ScheduleKind[]).map(kind => (
              <Chip key={kind} kind={kind} active={tipo === kind} onClick={() => setSearch({ tipo: kind })}>
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
              onChange={e => setSearch({ sala: e.target.value || undefined })}
            >
              <option value="">Todas as salas</option>
              {salas?.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
            </NativeSelect>
          </div>
        </div>
      )}

      {/* Calendário + Agenda do dia */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Calendário */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold capitalize">
                {ptMonth(mesAtual.month)} {mesAtual.year}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-8" onClick={prevMonth} aria-label="Mês anterior">
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setMesAtual({ year: today.getFullYear(), month: today.getMonth() })
                    setSearch({ dia: undefined })
                  }}
                >
                  Hoje
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={nextMonth} aria-label="Próximo mês">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-2 grid grid-cols-7 gap-1">
              {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map(({ date, current }) => {
                const selected = date === dataSelecionada
                const isToday = date === todayStr
                const hasCurso = diasComCurso.has(date)
                const hasReserva = diasComReserva.has(date)
                return (
                  <button
                    key={date}
                    onClick={() => setSearch({ dia: date })}
                    className={[
                      'relative flex h-11 flex-col items-center justify-center rounded-lg text-sm transition-all',
                      current ? 'text-foreground hover:bg-muted' : 'text-muted-foreground/40',
                      selected ? 'bg-primary text-primary-foreground hover:bg-primary' : '',
                      isToday && !selected ? 'ring-1 ring-primary/50' : '',
                    ].join(' ')}
                  >
                    <span className={`font-medium ${selected ? 'text-primary-foreground' : ''}`}>
                      {date.split('-')[2].replace(/^0/, '')}
                    </span>
                    {(hasCurso || hasReserva) && (
                      <span className="mt-0.5 flex items-center gap-0.5">
                        {hasCurso && (
                          <span className={`size-1.5 rounded-full ${selected ? 'bg-primary-foreground/80' : 'bg-primary'}`} />
                        )}
                        {hasReserva && (
                          <span className={`size-1.5 rounded-full ${selected ? 'bg-amber-300' : 'bg-amber-500'}`} />
                        )}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
              {mostrarCursos && (
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary" /> Cursos
                </span>
              )}
              {canReadCourses && mostrarReservas && (
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500" /> Eventos e reuniões
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="size-4 rounded ring-1 ring-primary/50" /> Hoje
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Agenda do dia: é aqui que se marca, edita e exclui reserva de sala. */}
        <DayAgendaPanel
          date={dataSelecionada}
          courses={cursosDoDia}
          bookings={reservasDoDia}
          roomId={sala}
          bookingType={tipo === 'EVENT' || tipo === 'MEETING' ? tipo : undefined}
          loadError={canReadCourses && reservasErro}
          onOpenCourse={id => navigate({ to: '/admin/cursos', search: { curso: id } })}
        />
      </div>

      {/* Cursos públicos + Cadastros incompletos */}
      <div className={`grid gap-6 ${canReadUsers ? 'lg:grid-cols-2' : ''}`}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cursos Públicos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {cursos === undefined && Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
              {cursosPublicos.slice(0, 5).map(course => {
                const pct = course.maxStudents > 0 ? course.enrolled / course.maxStudents : 0
                const badgeCls = course.enrolled >= course.maxStudents
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                  : pct > 0.5 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                return (
                  <div key={course.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{course.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {course.instructorName ? `${course.instructorName} · ` : ''}{course.workloadHours ? `${course.workloadHours}h` : ''}
                      </p>
                    </div>
                    <span className={`ml-3 shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeCls}`}>
                      {course.enrolled}/{course.maxStudents}
                    </span>
                  </div>
                )
              })}
              {cursos !== undefined && cursosPublicos.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">Nenhum curso público no momento</p>
              )}
            </div>
          </CardContent>
        </Card>

        {canReadUsers && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserX className="size-4 text-amber-500" />
                  Cadastros Incompletos
                </CardTitle>
                {incompletosData !== undefined && incompletosData.total > 0 && (
                  <Badge variant="secondary">{incompletosData.total}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {incompletosData === undefined && !incompletosError && Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
                {incompletosError && (
                  <p className="py-4 text-center text-sm text-destructive">Erro ao carregar os cadastros incompletos.</p>
                )}
                {/* Cada linha abre a ficha da pessoa para completar o cadastro. */}
                {incompletosData?.data.map(user => (
                  <Link
                    key={user.id}
                    to="/admin/usuarios/$id"
                    params={{ id: user.id }}
                    search={{ completar: 1 }}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                      {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
                    </div>
                    {user.memberType && (
                      <span className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        {memberTypeLabel(user.memberType)}
                      </span>
                    )}
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                ))}
                {incompletosData !== undefined && incompletosData.total === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="mb-2 rounded-full bg-emerald-50 p-3 dark:bg-emerald-950/30">
                      <UserX className="size-5 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Nenhum cadastro incompleto</p>
                    <p className="text-xs text-muted-foreground">Todos os associados estão com cadastro completo</p>
                  </div>
                )}
              </div>
              {incompletosData !== undefined && incompletosData.total > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <Link to="/admin/usuarios" search={{ incomplete: true }}>
                    <Button variant="outline" size="sm" className="w-full gap-1.5">
                      Ver todos os {incompletosData.total} cadastros incompletos
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
