import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarDays, Loader2, Minus, Save, Sun, Sunset, TrendingDown, TrendingUp } from 'lucide-react'
import { useAdminMarketQuotes, useSaveDailyQuotes, type MarketQuote } from '@/hooks/useMarketQuotes'
import { usePermissions } from '@/hooks/usePermissions'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { apiErrorMessage } from '@/lib/api-error-message'
import {
  QUOTE_PERIOD_LABEL, currentQuotePeriod, quoteProductLabel, trendOf, type QuotePeriod,
} from '@/lib/quote-utils'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { maskMoney, moneyToCents } from '@/utils/masks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { NoPermission } from '@/components/NoPermission'

export const Route = createFileRoute('/_admin/admin/cotacoes/')({
  component: RouteComponent,
})

const PERIOD_ICON = { MORNING: Sun, AFTERNOON: Sunset } as const

function Variation({ value }: { value: string | null }) {
  if (!value) return null
  const trend = trendOf(value)
  const Icon = trend === 'down' ? TrendingDown : trend === 'up' ? TrendingUp : Minus
  const color = trend === 'down'
    ? 'text-red-600 dark:text-red-400'
    : trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${color}`}>
      <Icon className="size-3" /> {value}
    </span>
  )
}

function LastEntry({ q }: { q: MarketQuote }) {
  if (q.priceCents == null) return <span className="text-sm text-muted-foreground">Sem lançamento ainda</span>
  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium tabular-nums text-foreground">{q.value}</span>
      <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        {q.referenceDate && <span>{formatDateFromString(q.referenceDate)}</span>}
        {q.period && <span>· {QUOTE_PERIOD_LABEL[q.period]}</span>}
        {q.variation && <span>·</span>}
        <Variation value={q.variation} />
      </span>
    </div>
  )
}

function RouteComponent() {
  const { can, isLoading: permLoading } = usePermissions()
  const { data: quotes, isLoading, isError } = useAdminMarketQuotes({
    enabled: !permLoading && can('READ_MARKET_QUOTE'),
  })
  const save = useSaveDailyQuotes()
  const canEdit = can('UPDATE_MARKET_QUOTE')

  const [period, setPeriod] = useState<QuotePeriod>(() => currentQuotePeriod())
  // Preço digitado por produto (texto mascarado "R$ 1.234,56"); vazio = não muda.
  const [prices, setPrices] = useState<Record<string, string>>({})
  const filled = Object.entries(prices).filter(([, v]) => moneyToCents(v) > 0)
  useUnsavedGuard(filled.length > 0 && !save.isPending)

  const todayRaw = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (filled.length === 0) return
    try {
      await save.mutateAsync({
        period,
        prices: filled.map(([id, v]) => ({ id, priceCents: moneyToCents(v) })),
      })
      setPrices({})
      toast.success(`${filled.length === 1 ? 'Cotação lançada' : `${filled.length} cotações lançadas`} (${QUOTE_PERIOD_LABEL[period].toLowerCase()}).`)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao lançar as cotações.'))
    }
  }

  if (!permLoading && !can('READ_MARKET_QUOTE')) {
    return <NoPermission message="Você não tem permissão para ver as cotações." />
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Cotações</h1>
        <p className="text-sm text-muted-foreground">
          Produtos fixos exibidos na página inicial. Lance só os preços e o período — a data é a de hoje.
        </p>
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar cotações." />}

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Lançamento de hoje</CardTitle>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="size-3.5" /> {today}
              </p>
            </div>
            <div role="radiogroup" aria-label="Período" className="inline-flex rounded-lg border border-border p-0.5">
              {(Object.keys(QUOTE_PERIOD_LABEL) as QuotePeriod[]).map(p => {
                const Icon = PERIOD_ICON[p]
                const active = period === p
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!canEdit}
                    onClick={() => setPeriod(p)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="size-4" /> {QUOTE_PERIOD_LABEL[p]}
                  </button>
                )
              })}
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-0 p-0">
            <div className="hidden grid-cols-[1fr_1.3fr_1.2fr] gap-4 border-y border-border bg-muted/40 px-6 py-2 text-xs font-medium text-muted-foreground sm:grid">
              <span>Produto</span>
              <span>Último lançamento</span>
              <span>Novo preço</span>
            </div>

            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 border-b border-border px-6 py-4 sm:grid-cols-[1fr_1.3fr_1.2fr] sm:gap-4">
                <Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-40" /><Skeleton className="h-9 w-full" />
              </div>
            ))}

            {(quotes ?? []).map(q => {
              const inputId = `quote-${q.id}`
              return (
                <div key={q.id} className="grid grid-cols-1 items-center gap-2 border-b border-border px-6 py-4 last:border-b-0 sm:grid-cols-[1fr_1.3fr_1.2fr] sm:gap-4">
                  <label htmlFor={inputId} className="text-sm font-semibold text-foreground">{quoteProductLabel(q.label)}</label>
                  <LastEntry q={q} />
                  <div className="flex items-center gap-2">
                    <Input
                      id={inputId}
                      className="h-9 tabular-nums"
                      inputMode="numeric"
                      placeholder="R$ 0,00"
                      disabled={!canEdit || save.isPending}
                      value={prices[q.id] ?? ''}
                      onChange={e => setPrices(p => ({ ...p, [q.id]: maskMoney(e.target.value) }))}
                    />
                    <span className="w-14 shrink-0 text-xs text-muted-foreground">{q.unit && `/${q.unit}`}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {canEdit && (
          <div className="mt-4 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            <span className="text-sm text-muted-foreground">
              {filled.length === 0
                ? 'Preencha o preço dos produtos que mudaram; os outros ficam como estão.'
                : `${filled.length} produto${filled.length > 1 ? 's' : ''} para lançar como ${QUOTE_PERIOD_LABEL[period].toLowerCase()} de hoje.`}
            </span>
            <Button type="submit" disabled={filled.length === 0 || save.isPending}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar cotações
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
