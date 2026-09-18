import { Link } from '@tanstack/react-router'
import { ArrowRight, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useFinanceSummary } from '@/hooks/useFinance'
import { formatBRL } from '@/utils/format-currency'
import { currentMonthRange, monthTitle } from '@/components/dashboard/month-range'
import { cn } from '@/lib/utils'

// Resumo do mês do Financeiro no painel. Só para quem tem READ_FINANCE — a tela
// esconde o bloco inteiro sem a permissão.

function Valor({ label, cents, className }: { label: string; cents: number; className?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('truncate text-lg font-semibold tabular-nums', className)}>{formatBRL(cents / 100)}</p>
    </div>
  )
}

export function FinanceMonthCard({ now }: { now?: Date }) {
  const range = currentMonthRange(now)
  const { data, isLoading, isError } = useFinanceSummary(range)

  const saldo = data?.periodResultCents ?? 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4 text-primary" aria-hidden />
            Financeiro em {monthTitle(now)}
          </CardTitle>
          <Link
            to="/admin/financeiro"
            search={{ tab: 'dashboard' as const }}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Abrir Financeiro <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isError && <p className="text-sm text-destructive">Erro ao carregar o resumo do mês.</p>}
        {!isError && (isLoading || !data) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="mb-2 h-3 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        )}
        {!isError && data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Valor label="Entradas" cents={data.periodInCents} className="text-emerald-600 dark:text-emerald-400" />
            <Valor label="Saídas" cents={data.periodOutCents} className="text-rose-600 dark:text-rose-400" />
            <Valor
              label="Saldo do mês"
              cents={saldo}
              className={saldo < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
