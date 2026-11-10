import { useState } from 'react'
import { cn } from '@/lib/utils'
import { centsToBRL } from '@/utils/masks'
import { axisLabel, monthLabel, monthLong, niceScale } from '@/lib/finance-chart'

export type MonthPoint = { month: string; inCents: number; outCents: number }

/**
 * O momento do Financeiro: entradas no verde do Sindicato e saídas no vermelho da terra
 * roxa, mês a mês, sobre uma grade apagada com rótulos em mono. Passar o mouse (ou o foco
 * do teclado, ou o toque) num mês mostra os valores dele na faixa de cima; sem nada
 * escolhido, a faixa mostra o último mês do período.
 */
export function MonthlyChart({ data, title, titleId }: {
  data: MonthPoint[]
  title: string
  /** `id` do título, para a seção que envolve o gráfico apontar para ele. */
  titleId?: string
}) {
  const [active, setActive] = useState<number | null>(null)

  const header = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <h3 id={titleId} className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex items-center gap-4 text-xs text-muted-foreground" aria-hidden>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-1" /> Entradas</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-2" /> Saídas</span>
      </div>
    </div>
  )

  if (data.length === 0) {
    return (
      <>
        {header}
        <p className="py-16 text-center text-sm text-muted-foreground">Sem lançamentos no período.</p>
      </>
    )
  }

  const max = Math.max(0, ...data.flatMap(d => [d.inCents, d.outCents]))
  const { top, step } = niceScale(max)
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v)
  const shown = active !== null && active < data.length ? active : data.length - 1
  const current = data[shown]
  const result = current.inCents - current.outCents
  const altura = (cents: number) => (cents > 0 ? `max(2px, ${(cents / top) * 100}%)` : '0')

  return (
    <div className="flex flex-col gap-4">
      {header}

      {/* Os valores do mês escolhido. */}
      <p
        aria-live="polite"
        className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground"
      >
        <span className="font-medium text-foreground">{monthLong(current.month)}</span>
        <span>Entradas <span className="num text-foreground">{centsToBRL(current.inCents)}</span></span>
        <span>Saídas <span className="num text-foreground">{centsToBRL(current.outCents)}</span></span>
        <span>
          Resultado{' '}
          <span className={cn('num', result < 0 ? 'text-destructive' : 'text-success')}>{centsToBRL(result)}</span>
        </span>
      </p>

      <div className="flex gap-2">
        {/* Eixo dos valores: a mesma altura da área do gráfico. */}
        <div className="relative h-60 w-11 shrink-0" aria-hidden>
          {ticks.map(t => (
            <span
              key={t}
              className="num absolute right-0 translate-y-1/2 text-xs leading-none text-faint-foreground"
              style={{ bottom: `${(t / top) * 100}%` }}
            >
              {axisLabel(t)}
            </span>
          ))}
        </div>

        {/* Muitos meses (período personalizado longo): só o gráfico rola de lado, não a página. */}
        <div className="min-w-0 flex-1 overflow-x-auto" onMouseLeave={() => setActive(null)}>
          <div style={{ minWidth: data.length * 40 }}>
            <div className="relative h-60">
              {ticks.map(t => (
                <div
                  key={t}
                  aria-hidden
                  className={cn('absolute inset-x-0 border-t', t === 0 ? 'border-foreground/20' : 'border-border')}
                  style={{ bottom: `${(t / top) * 100}%` }}
                />
              ))}
              <div className="absolute inset-0 flex">
                {data.map((m, i) => (
                  <div
                    key={m.month}
                    role="img"
                    tabIndex={0}
                    aria-label={`${monthLong(m.month)}: entradas ${centsToBRL(m.inCents)}, saídas ${centsToBRL(m.outCents)}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    className={cn(
                      'flex flex-1 items-end justify-center rounded-md px-1 transition-colors',
                      i === shown && 'bg-muted/70',
                    )}
                  >
                    <div className="flex h-full w-full max-w-12 items-end justify-center gap-1">
                      <div className="w-full max-w-5 rounded-t-[3px] bg-chart-1" style={{ height: altura(m.inCents) }} />
                      <div className="w-full max-w-5 rounded-t-[3px] bg-chart-2" style={{ height: altura(m.outCents) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 flex" aria-hidden>
              {data.map((m, i) => (
                <span
                  key={m.month}
                  className={cn('num flex-1 text-center text-xs', i === shown ? 'text-foreground' : 'text-faint-foreground')}
                >
                  {monthLabel(m.month)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
