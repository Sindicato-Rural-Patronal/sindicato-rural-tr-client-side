import { Link } from '@tanstack/react-router'
import { ScrollText, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuditTrail, type AuditTrailItem } from '@/hooks/useAuditTrail'
import { relativeTime, fullDateTime } from '@/lib/relative-time'

// "Últimas ações": as 5 mexidas mais recentes no sistema, para quem tem
// READ_AUDIT. A trilha completa continua em /admin/auditoria.

/** Frase da linha: o backend já manda pronta; sem ela, monta uma simples. */
function auditLine(item: AuditTrailItem): string {
  return item.summary?.trim() || item.targetLabel?.trim() || `${item.method} ${item.entity}`
}

export function RecentAuditCard() {
  const { data, isLoading, isError } = useAuditTrail({ page: 1, limit: 5 })
  const itens = data?.data ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="size-4 text-primary" aria-hidden />
            Últimas ações
          </CardTitle>
          <Link
            to="/admin/auditoria"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver tudo <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {isError && <li className="py-4 text-center text-sm text-destructive">Erro ao carregar as últimas ações.</li>}
          {!isError && isLoading && Array.from({ length: 3 }).map((_, i) => (
            <li key={i}><Skeleton className="h-10 w-full rounded-lg" /></li>
          ))}
          {!isError && !isLoading && itens.map(item => (
            <li key={item.id} className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{auditLine(item)}</p>
                <p className="truncate text-xs text-muted-foreground">{item.actorName}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground" title={fullDateTime(item.createdAt)}>
                {relativeTime(item.createdAt)}
              </span>
            </li>
          ))}
          {!isError && !isLoading && itens.length === 0 && (
            <li className="py-4 text-center text-sm text-muted-foreground">Nenhuma ação registrada ainda</li>
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
