import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useAdminCourses } from '@/hooks/useCourse'
import { useAdminStats } from '@/hooks/useAdmin'
import { useRooms } from '@/hooks/useRooms'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BookOpen, Users, ChevronLeft, ChevronRight,
  Calendar, Shield, GraduationCap, DoorOpen,
} from 'lucide-react'
import type { Course } from '@/@types/course'

export const Route = createFileRoute('/_admin/admin/dashboard')({
  component: RouteComponent,
})

// ─── calendar helpers ─────────────────────────────────────────────────────────

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function ptMonth(m: number) {
  return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m]
}

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const cells: { date: string; current: boolean }[] = []

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i
    cells.push({ date: isoDate(year, month - 1, d), current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: isoDate(year, month, d), current: true })
  }
  while (cells.length % 7 !== 0) {
    const d = cells.length - daysInMonth - firstDay + 1
    cells.push({ date: isoDate(year, month + 1, d), current: false })
  }
  return cells
}

function coursesInRange(courses: Course[], date: string) {
  return courses.filter(c => {
    const start = c.startDate?.slice(0, 10)
    const end = c.endDate?.slice(0, 10)
    if (!start) return false
    return date >= start && date <= (end ?? start)
  })
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({
  title, value, description, icon: Icon, alert,
}: {
  title: string
  value: number | string
  description: string
  icon: React.ElementType
  alert?: boolean
}) {
  return (
    <Card className={alert ? 'border-amber-300 bg-amber-50/50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`size-4 ${alert ? 'text-amber-600' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className={`text-xs ${alert ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>{description}</p>
      </CardContent>
    </Card>
  )
}

// ─── component ────────────────────────────────────────────────────────────────

function RouteComponent() {
  const { data: cursos } = useAdminCourses()
  const { data: stats } = useAdminStats()
  const { data: salas } = useRooms()

  const today = new Date()
  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate())

  const [mesAtual, setMesAtual] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [dataSelecionada, setDataSelecionada] = useState(todayStr)

  const cells = useMemo(() => buildCalendar(mesAtual.year, mesAtual.month), [mesAtual])

  const cursosPublicos = (cursos ?? []).filter(c => c.status === 'PUBLIC')
  const inscricoesAbertas = (cursos ?? []).filter(c =>
    c.status === 'PUBLIC' && c.registrationDeadline && c.registrationDeadline.slice(0, 10) >= todayStr
  ).sort((a, b) => (a.registrationDeadline ?? '').localeCompare(b.registrationDeadline ?? ''))

  // Dias com cursos (para marcar no calendário)
  const diasComCurso = useMemo(() => {
    const set = new Set<string>()
    ;(cursos ?? []).forEach(c => {
      if (!c.startDate) return
      const start = new Date(c.startDate)
      const end = c.endDate ? new Date(c.endDate) : start
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        set.add(isoDate(d.getFullYear(), d.getMonth(), d.getDate()))
      }
    })
    return set
  }, [cursos])

  const cursosDoDia = useMemo(
    () => coursesInRange(cursos ?? [], dataSelecionada),
    [cursos, dataSelecionada]
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

  function ptDayOfWeek(date: string) {
    const d = new Date(date + 'T12:00:00')
    return ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
  }

  function formatDate(date: string) {
    const [y, m, d] = date.split('-')
    return `${d}/${m}/${y}`
  }

  function diasRestantes(iso: string) {
    const d = new Date(iso.slice(0, 10) + 'T12:00:00')
    const today2 = new Date(todayStr + 'T12:00:00')
    return Math.ceil((d.getTime() - today2.getTime()) / 86_400_000)
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Painel Geral</h1>
        <p className="text-muted-foreground">Visão geral do sistema de gestão de cursos</p>
      </div>

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
              value={cursos?.length ?? 0}
              description={`${stats.courses?.public ?? 0} público${(stats.courses?.public ?? 0) !== 1 ? 's' : ''}`}
              icon={BookOpen}
            />
            <StatCard
              title="Trabalhadores"
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
              value={stats.totalRegistrations}
              description="Total em todos os cursos"
              icon={GraduationCap}
            />
          </>
        )}
      </div>

      {/* Calendário + Agenda */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Calendário */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold capitalize">
                {ptMonth(mesAtual.month)} {mesAtual.year}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-8" onClick={prevMonth}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setMesAtual({ year: today.getFullYear(), month: today.getMonth() })
                    setDataSelecionada(todayStr)
                  }}
                >
                  Hoje
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={nextMonth}>
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
                return (
                  <button
                    key={date}
                    onClick={() => setDataSelecionada(date)}
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
                    {hasCurso && (
                      <span className={`size-1.5 rounded-full mt-0.5 ${selected ? 'bg-primary-foreground/80' : 'bg-primary'}`} />
                    )}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex items-center gap-4 border-t pt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" /> Dias com cursos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-4 rounded ring-1 ring-primary/50" /> Hoje
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Agenda do dia */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                <span className="capitalize">{ptDayOfWeek(dataSelecionada)}, {formatDate(dataSelecionada)}</span>
              </CardTitle>
              {cursosDoDia.length > 0 && (
                <Badge variant="secondary">{cursosDoDia.length} curso{cursosDoDia.length > 1 ? 's' : ''}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {cursosDoDia.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 rounded-full bg-muted p-4">
                  <Calendar className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Nenhum curso neste dia</p>
                <p className="text-xs text-muted-foreground">Selecione outro dia no calendário</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {cursosDoDia.map((course, i) => {
                  const colors = [
                    'bg-primary/10 text-primary border-primary/20',
                    'bg-emerald-100 text-emerald-700 border-emerald-200',
                    'bg-amber-100 text-amber-700 border-amber-200',
                    'bg-rose-100 text-rose-700 border-rose-200',
                    'bg-sky-100 text-sky-700 border-sky-200',
                  ]
                  const cls = colors[i % colors.length]
                  return (
                    <div key={course.id} className={`flex items-start gap-3 rounded-xl border p-4 ${cls}`}>
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background/80">
                        <GraduationCap className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold">{course.title}</p>
                        <div className="mt-1.5 flex flex-col gap-1 text-xs opacity-80">
                          {course.startTime && (
                            <span>{course.startTime} – {course.endTime}</span>
                          )}
                          {course.location && <span>{course.location}</span>}
                          {course.instructorName && <span>{course.instructorName}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cursos públicos + Inscrições abertas */}
      <div className="grid gap-6 lg:grid-cols-2">
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
                  ? 'bg-rose-100 text-rose-700'
                  : pct > 0.5 ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inscrições Abertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {cursos === undefined && Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
              {inscricoesAbertas.slice(0, 5).map(course => {
                const dias = diasRestantes(course.registrationDeadline!)
                const badgeCls = dias <= 7 ? 'bg-rose-100 text-rose-700'
                  : dias <= 30 ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
                return (
                  <div key={course.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{course.title}</p>
                      <p className="text-xs text-muted-foreground">Até {formatDate(course.registrationDeadline!.slice(0, 10))}</p>
                    </div>
                    <span className={`ml-3 shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeCls}`}>
                      {dias}d
                    </span>
                  </div>
                )
              })}
              {cursos !== undefined && inscricoesAbertas.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">Nenhuma inscrição aberta no momento</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
