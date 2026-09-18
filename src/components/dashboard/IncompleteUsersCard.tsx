import { Link } from '@tanstack/react-router'
import { UserX, ChevronRight, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminUsers } from '@/hooks/useAdmin'
import { memberTypeLabel } from '@/lib/member-types'

// Cadastros pela metade (sem CPF, telefone…). Cada linha abre a ficha da pessoa
// já no modo "completar". Só para quem tem READ_USER — a tela cuida disso.

export function IncompleteUsersCard() {
  const { data, isError } = useAdminUsers({ page: 1, limit: 5, incompleteRegistration: true })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserX className="size-4 text-amber-500" aria-hidden />
            Cadastros incompletos
          </CardTitle>
          {data !== undefined && data.total > 0 && <Badge variant="secondary">{data.total}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {data === undefined && !isError && Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
          {isError && (
            <p className="py-4 text-center text-sm text-destructive">Erro ao carregar os cadastros incompletos.</p>
          )}
          {data?.data.map(user => (
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
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                  {memberTypeLabel(user.memberType)}
                </span>
              )}
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          ))}
          {data !== undefined && data.total === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-2 rounded-full bg-emerald-50 p-3 dark:bg-emerald-950/30">
                <UserX className="size-5 text-emerald-500" aria-hidden />
              </div>
              <p className="text-sm font-medium text-foreground">Nenhum cadastro incompleto</p>
              <p className="text-xs text-muted-foreground">Todos os associados estão com cadastro completo</p>
            </div>
          )}
        </div>
        {data !== undefined && data.total > 0 && (
          <div className="mt-3 border-t pt-3">
            <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
              <Link to="/admin/usuarios" search={{ incomplete: true }}>
                Ver todos os {data.total} cadastros incompletos
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
