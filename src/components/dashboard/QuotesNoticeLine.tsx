import { Link } from '@tanstack/react-router'
import { TrendingUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { quotesNotice } from '@/components/dashboard/quotes-notice'
import type { DashboardStats } from '@/hooks/useAdmin'

/**
 * Faixa discreta sobre as cotações do dia. Some quando não há o que dizer
 * (fim de semana, antes das 11h ou admin sem acesso às cotações).
 */
export function QuotesNoticeLine({ quotes, now }: { quotes: DashboardStats['quotesToday']; now?: Date }) {
  const aviso = quotesNotice(quotes, now)
  if (!aviso) return null

  const alerta = aviso.tone === 'warn'
  const Icon = alerta ? AlertTriangle : TrendingUp

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm',
        alerta
          ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
          : 'border-border bg-muted/40 text-muted-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{aviso.text}</span>
      <Link
        to="/admin/cotacoes"
        className="font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {alerta ? 'Lançar agora' : 'Ver cotações'}
      </Link>
    </div>
  )
}
