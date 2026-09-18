import { describe, it, expect } from 'vitest'
import { eventDateLabel, groupByMonth, monthKey, monthLabel } from '@/lib/public-events'

const event = (id: string, startTime: string, endTime = startTime) => ({ id, startTime, endTime })

describe('agrupamento por mês', () => {
  it('lê o mês do início do evento', () => {
    expect(monthKey('2026-10-05T08:00:00.000Z')).toBe('2026-10')
    expect(monthLabel('2026-10')).toBe('outubro de 2026')
  })

  it('junta os eventos do mesmo mês mantendo a ordem', () => {
    const groups = groupByMonth([
      event('a', '2026-10-05T08:00:00.000Z'),
      event('b', '2026-10-20T08:00:00.000Z'),
      event('c', '2026-11-02T08:00:00.000Z'),
    ])
    expect(groups.map(g => g.key)).toEqual(['2026-10', '2026-11'])
    expect(groups[0].label).toBe('outubro de 2026')
    expect(groups[0].events.map(e => e.id)).toEqual(['a', 'b'])
    expect(groups[1].events.map(e => e.id)).toEqual(['c'])
  })

  it('sem eventos não há nenhum mês', () => {
    expect(groupByMonth([])).toEqual([])
  })
})

describe('rótulo da data do evento', () => {
  it('em um dia só, traz o dia da semana', () => {
    expect(eventDateLabel({ startTime: '2026-10-05T08:00:00.000Z', endTime: '2026-10-05T12:00:00.000Z' }))
      .toBe('Segunda-feira, 05/10/2026')
  })

  it('em vários dias, mostra as duas datas', () => {
    expect(eventDateLabel({ startTime: '2026-10-05T08:00:00.000Z', endTime: '2026-10-07T12:00:00.000Z' }))
      .toBe('05/10/2026 a 07/10/2026')
  })
})
