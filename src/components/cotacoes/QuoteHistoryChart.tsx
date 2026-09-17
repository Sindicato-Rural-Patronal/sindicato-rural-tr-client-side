import { useEffect, useMemo, useRef, useState } from 'react'
import type { QuoteHistoryPoint } from '@/hooks/useMarketQuotes'
import { QUOTE_PERIOD_LABEL } from '@/lib/quote-utils'
import { centsToBRL } from '@/utils/masks'

// Linha de preço de UM produto (small multiple: cada produto tem sua escala,
// nunca dois eixos no mesmo gráfico). SVG feito à mão: linha 2px, área 10%,
// grade em hairline, crosshair + tooltip no hover e nas setas do teclado.

const DAY_MS = 86_400_000
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const HEIGHT = 200
const AXIS_BAND = 24
const MARGIN = { top: 12, right: 12, left: 56 }

/** Posição no eixo X: dia (UTC) + meio dia para a tarde. */
export function pointX(p: QuoteHistoryPoint): number {
  const [y, m, d] = p.date.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / DAY_MS + (p.period === 'AFTERNOON' ? 0.5 : 0)
}

export function pointLabel(p: QuoteHistoryPoint): string {
  const [, m, d] = p.date.split('-')
  return p.period ? `${d}/${m} · ${QUOTE_PERIOD_LABEL[p.period]}` : `${d}/${m}`
}

function dayTick(x: number, long: boolean): string {
  const date = new Date(Math.floor(x) * DAY_MS)
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const mm = date.getUTCMonth()
  return long ? `${MONTHS[mm]}/${String(date.getUTCFullYear()).slice(2)}` : `${dd}/${String(mm + 1).padStart(2, '0')}`
}

// Ticks "redondos" (1, 2, 2,5, 5 × 10ⁿ) cobrindo [min, max], em centavos.
function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.05, 1)
    min -= pad
    max += pad
  }
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  // Passo inteiro e de pelo menos 1 centavo: menor que isso os rótulos (R$ com 2 casas) se repetem
  const step = [1, 2, 2.5, 5, 10]
    .map(s => Math.round(s * mag * 1e6) / 1e6)
    .find(s => s >= raw && s >= 1 && Number.isInteger(s)) ?? Math.max(1, Math.ceil(raw))
  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step * 0.999; v += step) ticks.push(Math.round(v))
  return [...new Set(ticks)]
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

const number = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function QuoteHistoryChart({ points, domain, label }: {
  /** Ordenados por data e período. */
  points: QuoteHistoryPoint[]
  /** Faixa do eixo X compartilhada entre os produtos (dias UTC). */
  domain: [number, number]
  /** Nome do produto, para o leitor de tela. */
  label: string
}) {
  const [wrapRef, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const geo = useMemo(() => {
    const plotW = Math.max(width - MARGIN.left - MARGIN.right, 10)
    const [x0, x1] = domain[0] === domain[1] ? [domain[0] - 0.5, domain[1] + 0.5] : domain
    const prices = points.map(p => p.priceCents)
    const ticks = niceTicks(Math.min(...prices), Math.max(...prices))
    const y0 = ticks[0]
    const y1 = ticks[ticks.length - 1]
    const sx = (x: number) => MARGIN.left + ((x - x0) / (x1 - x0)) * plotW
    const sy = (v: number) => MARGIN.top + (1 - (v - y0) / (y1 - y0)) * (HEIGHT - MARGIN.top)
    const xy = points.map(p => [sx(pointX(p)), sy(p.priceCents)] as const)

    const span = x1 - x0
    const tickCount = Math.max(2, Math.min(5, Math.floor(plotW / 72)))
    // Só dias inteiros dentro da faixa: a tarde do último dia não vira "amanhã".
    const [d0, d1] = [Math.ceil(x0), Math.floor(x1)]
    const xTicks = d1 <= d0
      ? [d0]
      : Array.from({ length: tickCount }, (_, i) => Math.round(d0 + ((d1 - d0) * i) / (tickCount - 1)))
    return { ticks, sy, sx, xy, xTicks: [...new Set(xTicks)], longTicks: span > 200 }
  }, [points, domain, width])

  const line = geo.xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
  const last = geo.xy.length - 1
  const area = geo.xy.length > 1
    ? `${line}L${geo.xy[last][0].toFixed(1)},${HEIGHT}L${geo.xy[0][0].toFixed(1)},${HEIGHT}Z`
    : ''

  function nearest(clientX: number, rect: DOMRect) {
    const x = clientX - rect.left
    let best = 0
    geo.xy.forEach(([px], i) => { if (Math.abs(px - x) < Math.abs(geo.xy[best][0] - x)) best = i })
    setActive(best)
  }

  const current = active != null ? points[active] : null
  const [ax, ay] = active != null ? geo.xy[active] : [0, 0]
  const first = points[0]
  const final = points[last]

  return (
    <div
      ref={wrapRef}
      className="relative rounded-md outline-none [--quote-line:#287c42] focus-visible:ring-2 focus-visible:ring-ring dark:[--quote-line:#429c5a]"
      tabIndex={0}
      role="group"
      aria-roledescription="gráfico"
      aria-label={`${label}: de ${centsToBRL(first.priceCents)} (${pointLabel(first)}) a ${centsToBRL(final.priceCents)} (${pointLabel(final)}). Use as setas para ler cada lançamento.`}
      onFocus={() => setActive(a => a ?? last)}
      onBlur={() => setActive(null)}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); setActive(a => Math.max(0, (a ?? last) - 1)) }
        if (e.key === 'ArrowRight') { e.preventDefault(); setActive(a => Math.min(last, (a ?? last) + 1)) }
        if (e.key === 'Home') { e.preventDefault(); setActive(0) }
        if (e.key === 'End') { e.preventDefault(); setActive(last) }
      }}
    >
      {width > 0 && (
        <svg width={width} height={HEIGHT + AXIS_BAND} className="block select-none overflow-visible" aria-hidden>
          {geo.ticks.map(t => (
            <g key={t}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={geo.sy(t)} y2={geo.sy(t)} className="stroke-border" strokeWidth={1} />
              <text x={MARGIN.left - 8} y={geo.sy(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                {number(t)}
              </text>
            </g>
          ))}
          {geo.xTicks.map((t, i) => (
            <text
              key={t}
              x={geo.sx(t)}
              y={HEIGHT + 16}
              textAnchor={i === 0 ? 'start' : i === geo.xTicks.length - 1 ? 'end' : 'middle'}
              className="fill-muted-foreground text-[11px] tabular-nums"
            >
              {dayTick(t, geo.longTicks)}
            </text>
          ))}

          {area && <path d={area} fill="var(--quote-line)" fillOpacity={0.1} />}
          {geo.xy.length > 1 && (
            <path d={line} fill="none" stroke="var(--quote-line)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          )}

          {current && (
            <line x1={ax} x2={ax} y1={MARGIN.top} y2={HEIGHT} className="stroke-muted-foreground/50" strokeWidth={1} />
          )}
          {[active ?? last].map(i => (
            <circle key={i} cx={geo.xy[i][0]} cy={geo.xy[i][1]} r={4} fill="var(--quote-line)" stroke="var(--card)" strokeWidth={2} />
          ))}

          <rect
            x={MARGIN.left}
            y={0}
            width={Math.max(width - MARGIN.left - MARGIN.right, 0)}
            height={HEIGHT + AXIS_BAND}
            fill="transparent"
            onPointerMove={e => nearest(e.clientX, e.currentTarget.ownerSVGElement!.getBoundingClientRect())}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      )}
      {!width && <div style={{ height: HEIGHT + AXIS_BAND }} />}
      <p className="sr-only" aria-live="polite">{current ? `${centsToBRL(current.priceCents)}, ${pointLabel(current)}` : ''}</p>

      {current && (
        <div
          className="pointer-events-none absolute z-10 min-w-28 rounded-md border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md"
          style={{
            left: Math.min(Math.max(ax - 56, 0), Math.max(width - 128, 0)),
            top: ay < 72 ? ay + 12 : ay - 64,
          }}
        >
          <p className="text-sm font-semibold tabular-nums">{centsToBRL(current.priceCents)}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-0.5 w-3 rounded-full bg-(--quote-line)" />
            {pointLabel(current)}
          </p>
        </div>
      )}
    </div>
  )
}
