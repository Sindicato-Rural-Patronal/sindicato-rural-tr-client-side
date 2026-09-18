import { describe, it, expect } from 'vitest'
import {
  DEFAULT_ORDER, blockOrder, groupBlocks, moveBlock, normalizePrefs, toggleHidden, visibleBlocks,
  type DashboardBlockId,
} from '@/components/dashboard/dashboard-prefs'
import { quotesNotice } from '@/components/dashboard/quotes-notice'
import { capacityLabel, capacityTone } from '@/components/dashboard/course-capacity'
import { currentMonthRange, monthTitle } from '@/components/dashboard/month-range'
import { kindDays } from '@/lib/dashboard-agenda'

const TODOS = DEFAULT_ORDER

describe('personalização do painel', () => {
  it('sem preferências vale a ordem de fábrica', () => {
    expect(blockOrder(null)).toEqual(DEFAULT_ORDER)
    expect(visibleBlocks(undefined, TODOS)).toEqual(DEFAULT_ORDER)
  })

  it('preferências estragadas não derrubam o layout padrão', () => {
    expect(normalizePrefs({ hidden: 'nada', order: ['bloco-que-nao-existe', 'cursos', 'cursos'] }))
      .toEqual({ hidden: [], order: ['cursos'] })
    // Bloco que não estava na ordem salva continua aparecendo (no lugar de fábrica).
    expect(visibleBlocks({ order: ['auditoria'] }, TODOS)[0]).toBe('auditoria')
    expect(visibleBlocks({ order: ['auditoria'] }, TODOS)).toHaveLength(DEFAULT_ORDER.length)
  })

  it('esconde o que o admin desmarcou e o que ele não pode ver', () => {
    const disponiveis: DashboardBlockId[] = ['acoes', 'numeros', 'agenda', 'cursos']
    expect(visibleBlocks({ hidden: ['numeros'] }, disponiveis)).toEqual(['acoes', 'agenda', 'cursos'])
  })

  it('sobe e desce blocos, sem sair das pontas', () => {
    const ordem: DashboardBlockId[] = ['acoes', 'numeros', 'agenda']
    expect(moveBlock(ordem, 'agenda', -1)).toEqual(['acoes', 'agenda', 'numeros'])
    expect(moveBlock(ordem, 'acoes', -1)).toEqual(ordem)
    expect(moveBlock(ordem, 'agenda', 1)).toEqual(ordem)
  })

  it('marcar/desmarcar um bloco', () => {
    expect(toggleHidden([], 'cursos')).toEqual(['cursos'])
    expect(toggleHidden(['cursos'], 'cursos')).toEqual([])
  })

  it('junta os cartões pequenos vizinhos numa linha só', () => {
    expect(groupBlocks(['numeros', 'cursos', 'incompletos', 'agenda', 'auditoria']))
      .toEqual([['numeros'], ['cursos', 'incompletos'], ['agenda'], ['auditoria']])
  })
})

describe('aviso das cotações', () => {
  // Segunda-feira, 14:00 em Brasília (17:00 UTC).
  const segundaTarde = new Date('2026-09-14T17:00:00.000Z')

  it('lançadas: confirma com o período', () => {
    expect(quotesNotice({ launched: true, period: 'MORNING' }, segundaTarde))
      .toEqual({ tone: 'ok', text: 'Cotações de hoje lançadas (manhã)' })
    expect(quotesNotice({ launched: true, period: 'AFTERNOON' }, segundaTarde)?.text)
      .toBe('Cotações de hoje lançadas (tarde)')
  })

  it('dia útil depois das 11h sem lançar: lembrete âmbar', () => {
    expect(quotesNotice({ launched: false, period: null }, segundaTarde))
      .toEqual({ tone: 'warn', text: 'Cotações de hoje ainda não lançadas' })
  })

  it('antes das 11h, fim de semana ou sem acesso: não mostra nada', () => {
    const segundaCedo = new Date('2026-09-14T12:59:00.000Z') // 09:59 em Brasília
    const domingo = new Date('2026-09-13T17:00:00.000Z')
    expect(quotesNotice({ launched: false, period: null }, segundaCedo)).toBeNull()
    expect(quotesNotice({ launched: false, period: null }, domingo)).toBeNull()
    expect(quotesNotice(undefined, segundaTarde)).toBeNull()
  })
})

describe('vagas do curso', () => {
  it('lotado a partir de 100% e quase lotado a partir de 80%', () => {
    expect(capacityTone(8, 40)).toBe('ok')
    expect(capacityTone(32, 40)).toBe('almost')
    expect(capacityTone(40, 40)).toBe('full')
    expect(capacityTone(41, 40)).toBe('full')
  })

  it('curso sem limite de vagas nunca fica "lotado"', () => {
    expect(capacityTone(0, 0)).toBe('ok')
    expect(capacityLabel(0, 0)).toBe('0 inscritos')
    expect(capacityLabel(1, 0)).toBe('1 inscrito')
    expect(capacityLabel(8, 40)).toBe('8/40')
  })
})

describe('mês do Financeiro', () => {
  it('primeiro e último dia do mês em Brasília', () => {
    // 01/10/2026 00:30 UTC ainda é 30/09 em Brasília.
    expect(currentMonthRange(new Date('2026-10-01T00:30:00.000Z'))).toEqual({ from: '2026-09-01', to: '2026-09-30' })
    expect(currentMonthRange(new Date('2026-02-10T12:00:00.000Z'))).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(currentMonthRange(new Date('2026-12-31T12:00:00.000Z'))).toEqual({ from: '2026-12-01', to: '2026-12-31' })
    expect(monthTitle(new Date('2026-09-18T12:00:00.000Z'))).toBe('setembro de 2026')
  })
})

describe('dias marcados no calendário', () => {
  const itens = [
    { kind: 'COURSE' as const, startTime: '2026-09-14T08:00:00.000Z', endTime: '2026-09-15T17:00:00.000Z' },
    { kind: 'EVENT' as const, startTime: '2026-09-16T08:00:00.000Z', endTime: '2026-09-16T10:00:00.000Z' },
    { kind: 'MEETING' as const, startTime: '2026-09-20T08:00:00.000Z', endTime: '2026-09-20T10:00:00.000Z' },
  ]

  it('separa os dias por tipo e respeita o período pedido', () => {
    expect([...kindDays(itens, '2026-09-01', '2026-09-30', 'COURSE')]).toEqual(['2026-09-14', '2026-09-15'])
    expect([...kindDays(itens, '2026-09-01', '2026-09-30', 'EVENT')]).toEqual(['2026-09-16'])
    expect([...kindDays(itens, '2026-09-01', '2026-09-15', 'MEETING')]).toEqual([])
  })
})
