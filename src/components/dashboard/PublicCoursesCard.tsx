import { Link } from '@tanstack/react-router'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminCourses } from '@/hooks/useCourse'
import { isRegistrationDeadlinePassed } from '@/utils/course-status'
import { capacityLabel, capacityTone, type CapacityTone } from '@/components/dashboard/course-capacity'

// Cursos publicados no site: quantas vagas já foram e até quando dá para se
// inscrever. Consulta própria (uma página só) — o calendário usa a agenda.

/** Só o que pede atenção ganha etiqueta: "quase lotado" no aviso, "lotado" no vermelho. */
const TONE_BADGE: Record<CapacityTone, { label: string; variant: 'warning' | 'danger' } | null> = {
  ok: null,
  almost: { label: 'quase lotado', variant: 'warning' },
  full: { label: 'lotado', variant: 'danger' },
}

/** "2026-10-05" → "05/10". */
function diaMes(iso: string): string {
  const [, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}`
}

export function PublicCoursesCard({ now }: { now?: Date }) {
  const { data, isLoading, isError, isFetching, refetch } = useAdminCourses({ page: 1, limit: 5, status: 'PUBLIC' })
  const cursos = data?.data ?? []

  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Cursos públicos</CardTitle>
          <Link
            to="/admin/cursos"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver todos <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isError && (
          <LoadErrorRetry variant="inline" className="justify-center py-4" message="Não foi possível carregar os cursos." onRetry={() => void refetch()} retrying={isFetching} />
        )}
        {!isError && isLoading && (
          <div className="flex flex-col gap-2 pt-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        )}
        {!isError && !isLoading && cursos.length > 0 && (
          // Lista com linhas finas entre os cursos, não cartões dentro do cartão.
          <ul className="divide-y divide-border">
            {cursos.map(curso => {
              const tone = capacityTone(curso.enrolled, curso.maxStudents)
              const encerrado = isRegistrationDeadlinePassed(curso.registrationDeadline, null, now)
              const etiqueta = TONE_BADGE[tone]
              return (
                <li key={curso.id}>
                  <Link
                    to="/admin/cursos"
                    search={{ curso: curso.id, aba: 'inscricoes' }}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{curso.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {curso.registrationDeadline
                          ? encerrado
                            ? 'Prazo encerrado'
                            : <>Inscrições até <span className="num">{diaMes(curso.registrationDeadline)}</span></>
                          : 'Sem prazo de inscrição'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm tabular-nums text-foreground">{capacityLabel(curso.enrolled, curso.maxStudents)}</span>
                      {etiqueta && <Badge variant={etiqueta.variant}>{etiqueta.label}</Badge>}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        {!isError && !isLoading && cursos.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum curso público no momento</p>
        )}
      </CardContent>
    </Card>
  )
}
