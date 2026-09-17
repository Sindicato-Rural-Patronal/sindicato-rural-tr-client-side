// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { ListaPresencaDocument, type ListaPresencaCourse } from '@/lib/lista-presenca-pdf'

const course: ListaPresencaCourse = {
  title: 'PANIFICAÇÃO RURAL',
  eventNumber: '267468',
  startDate: '2026-09-21',
  endDate: '2026-09-21',
  startTime: '08:00',
  endTime: '17:00',
  location: 'AUDITORIO',
  instructors: ['MARIA INSTRUTORA'],
}

const participants = [
  { name: 'JOÃO DA SILVA', cpf: '52998224725' },
  { name: 'ANA SOUZA', cpf: null },
]

function pageCount(buf: Awaited<ReturnType<typeof renderToBuffer>>): string | undefined {
  return buf.toString('latin1').match(/\/Count\s+(\d+)/)?.[1]
}

// Gerar PDF é lento; com a suíte inteira rodando em paralelo passa dos 5 s padrão.
describe('lista de presença pdf', { timeout: 30_000 }, () => {
  it('gera um PDF válido de uma folha para curso de um dia', async () => {
    const buf = await renderToBuffer(<ListaPresencaDocument course={course} participants={participants} />)
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
    expect(pageCount(buf)).toBe('1')
  })

  it('uma folha por dia em curso de vários dias', async () => {
    const buf = await renderToBuffer(
      <ListaPresencaDocument course={{ ...course, endDate: '2026-09-23' }} participants={participants} />,
    )
    expect(pageCount(buf)).toBe('3')
  })

  it('lista longa continua na folha seguinte', async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ name: `PESSOA ${String(i).padStart(2, '0')}`, cpf: null }))
    const buf = await renderToBuffer(<ListaPresencaDocument course={course} participants={many} />)
    expect(Number(pageCount(buf))).toBeGreaterThan(1)
  })
})
