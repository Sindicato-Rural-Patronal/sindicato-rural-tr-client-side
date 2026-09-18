import { Link } from '@tanstack/react-router'
import { BookOpen, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminCourses } from '@/hooks/useCourse'
import { isRegistrationDeadlinePassed } from '@/utils/course-status'
import { capacityLabel, capacityTone, type CapacityTone } from '@/components/dashboard/course-capacity'
import { cn } from '@/lib/utils'

// Cursos publicados no site: quantas vagas já foram e até quando dá para se
// inscrever. Consulta própria (uma página só) — o calendário usa a agenda.

const TONE_CLASS: Record<CapacityTone, string> = {
  ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  almost: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  full: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
}

const TONE_LABEL: Record<CapacityTone, string | null> = {
  ok: null,
  almost: 'quase lotado',
  full: 'lotado',
}

/** "2026-10-05" → "05/10". */
function diaMes(iso: string): string {
  const [, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}`
}

export function PublicCoursesCard({ now }: { now?: Date }) {
  const { data, isLoading, isError } = useAdminCourses({ page: 1, limit: 5, status: 'PUBLIC' })
  const cursos = data?.data ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4 text-primary" aria-hidden />
            Cursos públicos
          </CardTitle>
          <Link
            to="/admin/cursos"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver todos <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {isError && <p className="py-4 text-center text-sm text-destructive">Erro ao carregar os cursos.</p>}
          {!isError && isLoading && Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
          {!isError && !isLoading && cursos.map(curso => {
            const tone = capacityTone(curso.enrolled, curso.maxStudents)
            const encerrado = isRegistrationDeadlinePassed(curso.registrationDeadline, null, now)
            return (
              <Link
                key={curso.id}
                to="/admin/cursos"
                search={{ curso: curso.id, aba: 'inscricoes' }}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{curso.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {curso.registrationDeadline
                      ? encerrado
                        ? 'Prazo encerrado'
                        : `Inscrições até ${diaMes(curso.registrationDeadline)}`
                      : 'Sem prazo de inscrição'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums', TONE_CLASS[tone])}>
                    {capacityLabel(curso.enrolled, curso.maxStudents)}
                  </span>
                  {TONE_LABEL[tone] && (
                    <span className={cn('text-[11px] font-medium', tone === 'full' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400')}>
                      {TONE_LABEL[tone]}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
          {!isError && !isLoading && cursos.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum curso público no momento</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
