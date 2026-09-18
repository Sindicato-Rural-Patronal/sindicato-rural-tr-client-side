import { describe, it, expect } from 'vitest'
import {
  attendanceCounts,
  attendanceSummary,
  courseDays,
  sortByName,
} from '@/utils/course-attendance'

describe('attendanceCounts / attendanceSummary', () => {
  it('conta só as inscrições confirmadas', () => {
    const counts = attendanceCounts([
      { confirmed: true, attended: true },
      { confirmed: true, attended: true },
      { confirmed: true, attended: false },
      { confirmed: true, attended: null },
      { confirmed: false, attended: null },
      { confirmed: false, attended: true },
    ])
    expect(counts).toEqual({ present: 2, absent: 1, unmarked: 1 })
    expect(attendanceSummary(counts)).toBe('2 presentes · 1 falta · 1 sem marcar')
  })

  it('singular e zero', () => {
    expect(attendanceSummary({ present: 1, absent: 0, unmarked: 0 })).toBe('1 presente · 0 faltas · 0 sem marcar')
  })
})

describe('courseDays', () => {
  it('do início ao fim, inclusive, atravessando o mês', () => {
    expect(courseDays('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'])
  })

  it('aceita ISO com hora e fim ausente ou igual ao início', () => {
    expect(courseDays('2026-09-21T08:00:00.000Z', '2026-09-21T17:00:00.000Z')).toEqual(['2026-09-21'])
    expect(courseDays('2026-09-21', null)).toEqual(['2026-09-21'])
  })

  it('fim antes do início ou inválido → só o início; início inválido → nenhum', () => {
    expect(courseDays('2026-09-21', '2026-09-20')).toEqual(['2026-09-21'])
    expect(courseDays('2026-09-21', 'lixo')).toEqual(['2026-09-21'])
    expect(courseDays('', '2026-09-21')).toEqual([])
  })

  it('limita a quantidade de dias', () => {
    expect(courseDays('2026-01-01', '2027-01-01')).toHaveLength(60)
    expect(courseDays('2026-01-01', '2026-01-10', 3)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03'])
  })
})

describe('sortByName', () => {
  it('ordem alfabética sem diferenciar acento, sem mexer na lista original', () => {
    const list = [{ name: 'ÉRICA' }, { name: 'ANA' }, { name: 'ednaldo' }]
    expect(sortByName(list).map(p => p.name)).toEqual(['ANA', 'ednaldo', 'ÉRICA'])
    expect(list[0].name).toBe('ÉRICA')
  })
})
