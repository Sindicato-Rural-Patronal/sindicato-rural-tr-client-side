// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { AgendaDocument, type AgendaPdfDay } from '@/lib/agenda-pdf'
import type { AgendaEntry } from '@/lib/agenda'

const item = (over: Partial<AgendaEntry>): AgendaEntry => ({
  key: over.key ?? 'k1', kind: 'EVENT', id: '1', title: 'DIA DE CAMPO',
  roomId: 'r1', roomName: 'AUDITORIO',
  startTime: '2026-10-05T08:00:00.000Z', endTime: '2026-10-05T12:00:00.000Z',
  publicOnSite: false, responsible: 'MARIA DA SILVA', ...over,
})

const dia: AgendaPdfDay = {
  date: '2026-10-05',
  items: [
    item({ key: 'c1', kind: 'COURSE', title: 'MANEJO DE PASTAGEM', responsible: null }),
    item({ key: 'b1', kind: 'MEETING', title: 'REUNIAO DA DIRETORIA', roomName: 'SALA 1', startTime: '2026-10-05T14:00:00.000Z', endTime: '2026-10-05T16:00:00.000Z' }),
  ],
}

function pageCount(buf: Awaited<ReturnType<typeof renderToBuffer>>): string | undefined {
  return buf.toString('latin1').match(/\/Count\s+(\d+)/)?.[1]
}

// Gerar PDF é lento; com a suíte inteira em paralelo passa dos 5 s padrão.
describe('agenda em pdf', { timeout: 30_000 }, () => {
  it('gera um PDF válido do dia', async () => {
    const buf = await renderToBuffer(<AgendaDocument days={[dia]} from="2026-10-05" to="2026-10-05" />)
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
    expect(pageCount(buf)).toBe('1')
  })

  it('a semana sai com os sete dias, inclusive os vazios', async () => {
    const days: AgendaPdfDay[] = [
      dia,
      ...['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']
        .map(date => ({ date, items: [] })),
    ]
    const buf = await renderToBuffer(
      <AgendaDocument
        days={days}
        from="2026-10-05"
        to="2026-10-11"
        filters={{ room: 'AUDITORIO', kind: 'Evento', search: 'CAMPO' }}
      />,
    )
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
    expect(Number(pageCount(buf))).toBeGreaterThanOrEqual(1)
  })

  it('agenda cheia continua na folha seguinte', async () => {
    const days: AgendaPdfDay[] = Array.from({ length: 7 }, (_, d) => ({
      date: `2026-10-0${d + 5}`.slice(0, 10),
      items: Array.from({ length: 12 }, (_, i) => item({ key: `d${d}-i${i}`, title: `RESERVA ${d}-${i}` })),
    }))
    const buf = await renderToBuffer(<AgendaDocument days={days} from="2026-10-05" to="2026-10-11" />)
    expect(Number(pageCount(buf))).toBeGreaterThan(1)
  })
})
