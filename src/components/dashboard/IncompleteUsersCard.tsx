import { Link } from '@tanstack/react-router'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { EmptyState } from '@/components/EmptyState'
import { UserCheck, ChevronRight, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminUsers } from '@/hooks/useAdmin'
import { memberTypeLabel } from '@/lib/member-types'

// Cadastros pela metade (sem CPF, telefone…). Cada linha abre a ficha da pessoa
// já no modo "completar". Só para quem tem READ_USER — a tela cuida disso.

export function IncompleteUsersCard() {
  const { data, isError, isFetching, refetch } = useAdminUsers({ page: 1, limit: 5, incompleteRegistration: true })

  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Cadastros incompletos</CardTitle>
          {data !== undefined && data.total > 0 && <Badge variant="warning" className="tabular-nums">{data.total}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {data === undefined && !isError && (
          <div className="flex flex-col gap-2 pt-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        )}
        {isError && (
          <LoadErrorRetry variant="inline" className="justify-center py-4" message="Não foi possível carregar os cadastros incompletos." onRetry={() => void refetch()} retrying={isFetching} />
        )}
        {data !== undefined && data.data.length > 0 && (
          // Lista com linhas finas entre as pessoas, não cartões dentro do cartão.
          <ul className="divide-y divide-border">
            {data.data.map(user => (
              <li key={user.id}>
                <Link
                  to="/admin/usuarios/$id"
                  params={{ id: user.id }}
                  search={{ completar: 1 }}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                    {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
                  </div>
                  {user.memberType && <Badge variant="neutral">{memberTypeLabel(user.memberType)}</Badge>}
                  <ChevronRight className="size-4 shrink-0 text-faint-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {data !== undefined && data.total === 0 && (
          <EmptyState
            icon={UserCheck}
            className="py-8"
            title="Nenhum cadastro incompleto"
            description="Todos os associados estão com cadastro completo"
          />
        )}
        {data !== undefined && data.total > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <Button asChild variant="outline" size="sm" className="w-full">
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
