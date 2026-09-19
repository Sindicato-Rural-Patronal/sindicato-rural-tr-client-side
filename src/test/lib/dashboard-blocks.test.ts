import { describe, it, expect } from 'vitest'
import {
  DEFAULT_ORDER, DEFAULT_SIZES, applyOrder, blockOrder, blockSizes, blockSpan, dashboardLayout,
  defaultDraft, dropBlock, editableBlocks, normalizePrefs, prefsDraft, prefsToSave, sameDraft,
  setBlockSize, toggleHidden, visibleBlocks,
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
      .toEqual({ hidden: [], order: ['cursos'], sizes: {} })
    // Bloco que não estava na ordem salva continua aparecendo (no lugar de fábrica).
    expect(visibleBlocks({ order: ['auditoria'] }, TODOS)[0]).toBe('auditoria')
    expect(visibleBlocks({ order: ['auditoria'] }, TODOS)).toHaveLength(DEFAULT_ORDER.length)
  })

  it('preferência que não é objeto vira o padrão', () => {
    for (const lixo of [null, undefined, 'x', 42, [1, 2]]) {
      expect(normalizePrefs(lixo)).toEqual({ hidden: [], order: [], sizes: {} })
    }
    expect(blockOrder('x' as never)).toEqual(DEFAULT_ORDER)
    expect(blockSizes(undefined)).toEqual(DEFAULT_SIZES)
  })

  it('esconde o que o admin desmarcou e o que ele não pode ver', () => {
    const disponiveis: DashboardBlockId[] = ['acoes', 'numeros', 'agenda', 'cursos']
    expect(visibleBlocks({ hidden: ['numeros'] }, disponiveis)).toEqual(['acoes', 'agenda', 'cursos'])
  })

  it('tirar/trazer de volta um bloco', () => {
    expect(toggleHidden([], 'cursos')).toEqual(['cursos'])
    expect(toggleHidden(['cursos'], 'cursos')).toEqual([])
  })

  it('arrastar leva o bloco para o lugar do outro', () => {
    const ordem: DashboardBlockId[] = ['acoes', 'numeros', 'agenda', 'cursos']
    expect(dropBlock(ordem, 'cursos', 'numeros')).toEqual(['acoes', 'cursos', 'numeros', 'agenda'])
    expect(dropBlock(ordem, 'acoes', 'agenda')).toEqual(['numeros', 'agenda', 'acoes', 'cursos'])
    // Soltar no mesmo lugar (ou bloco que não está na lista) não mexe em nada.
    expect(dropBlock(ordem, 'acoes', 'acoes')).toEqual(ordem)
    expect(dropBlock(ordem, 'incompletos', 'acoes')).toEqual(ordem)
  })

  it('arrastar não bagunça o bloco que o admin não pode ver', () => {
    // 'financeiro' está na ordem salva mas não na lista de disponíveis.
    const completa: DashboardBlockId[] = ['acoes', 'financeiro', 'numeros', 'agenda']
    const disponiveis: DashboardBlockId[] = ['acoes', 'numeros', 'agenda']
    expect(editableBlocks(completa, disponiveis)).toEqual(['acoes', 'numeros', 'agenda'])
    const visiveis = dropBlock(editableBlocks(completa, disponiveis), 'agenda', 'numeros')
    // 'financeiro' continua no mesmo índice; os visíveis é que trocaram.
    expect(applyOrder(completa, disponiveis, visiveis)).toEqual(['acoes', 'financeiro', 'agenda', 'numeros'])
  })

  it('bloco removido não entra no arrasto e volta no lugar de sempre', () => {
    // 'numeros' foi removido do painel: só 'acoes' e 'agenda' se mexem.
    const completa: DashboardBlockId[] = ['acoes', 'numeros', 'agenda']
    const mexiveis: DashboardBlockId[] = ['acoes', 'agenda']
    const nova = applyOrder(completa, mexiveis, dropBlock(mexiveis, 'agenda', 'acoes'))
    expect(nova).toEqual(['agenda', 'numeros', 'acoes'])
    // Trazer de volta só mexe em `hidden`: o lugar dele na ordem continua o mesmo.
    expect(visibleBlocks({ order: nova, hidden: [] }, completa)).toEqual(['agenda', 'numeros', 'acoes'])
  })
})

describe('largura dos blocos', () => {
  it('metade ocupa 1 coluna e inteira ocupa as 2', () => {
    expect(blockSpan('half')).toBe(1)
    expect(blockSpan('full')).toBe(2)
  })

  it('de fábrica: os grandes ocupam as 2 colunas e os cartões pequenos 1', () => {
    expect(dashboardLayout(DEFAULT_ORDER, DEFAULT_SIZES).map(c => [c.id, c.span])).toEqual([
      ['acoes', 2], ['numeros', 2], ['cotacoes', 2], ['financeiro', 2], ['agenda', 2],
      ['cursos', 1], ['incompletos', 1], ['auditoria', 1],
    ])
  })

  it('bloco de meia largura SOZINHO continua com meia largura', () => {
    // Era o bug: um "half" sem vizinho "half" virava linha de um item só e a
    // tela desenhava em largura cheia — diminuir não mudava nada na tela.
    expect(dashboardLayout(['numeros'], { ...DEFAULT_SIZES, numeros: 'half' }))
      .toEqual([{ id: 'numeros', size: 'half', span: 1 }])

    // Mesmo cercado por blocos de largura inteira, ele fica com 1 coluna.
    const sizes = { ...DEFAULT_SIZES, numeros: 'half' as const }
    expect(dashboardLayout(['acoes', 'numeros', 'agenda'], sizes).map(c => c.span)).toEqual([2, 1, 2])

    // E o último da lista também (não sobra "esticar porque acabou a lista").
    expect(dashboardLayout(['acoes', 'auditoria'], DEFAULT_SIZES).map(c => c.span)).toEqual([2, 1])
  })

  it('meia largura seguida de meia largura divide a linha (a grade junta as duas)', () => {
    const sizes = { ...DEFAULT_SIZES, numeros: 'half' as const, agenda: 'half' as const }
    expect(dashboardLayout(['numeros', 'agenda', 'cursos'], sizes).map(c => c.span)).toEqual([1, 1, 1])
  })

  it('largura que o servidor não conhece cai no padrão do bloco', () => {
    // `sizes` sem a chave do bloco: vale a largura de fábrica dele.
    const vazio = {} as Record<DashboardBlockId, 'full' | 'half'>
    expect(dashboardLayout(['agenda', 'cursos'], vazio).map(c => c.span)).toEqual([2, 1])
  })

  it('troca a largura de um bloco só', () => {
    const sizes = setBlockSize(DEFAULT_SIZES, 'agenda', 'half')
    expect(sizes.agenda).toBe('half')
    expect(sizes.numeros).toBe('full')
    expect(DEFAULT_SIZES.agenda).toBe('full') // não estraga o padrão
  })

  it('largura inventada no servidor cai no padrão', () => {
    expect(blockSizes({ sizes: { agenda: 'gigante', cursos: 'full', nada: 'half' } }))
      .toEqual({ ...DEFAULT_SIZES, cursos: 'full' })
    expect(blockSizes({ sizes: ['half'] as never })).toEqual(DEFAULT_SIZES)
  })
})

describe('rascunho do modo de organizar', () => {
  it('começa do que está salvo e sabe dizer se mudou', () => {
    const salvo = prefsDraft({ hidden: ['cursos'], order: ['auditoria'], sizes: { agenda: 'half' } })
    expect(salvo.order[0]).toBe('auditoria')
    expect(salvo.hidden).toEqual(['cursos'])
    expect(salvo.sizes.agenda).toBe('half')

    expect(sameDraft(salvo, prefsDraft({ hidden: ['cursos'], order: ['auditoria'], sizes: { agenda: 'half' } }))).toBe(true)
    expect(sameDraft(salvo, { ...salvo, hidden: [] })).toBe(false)
    expect(sameDraft(salvo, { ...salvo, sizes: setBlockSize(salvo.sizes, 'agenda', 'full') })).toBe(false)
    expect(sameDraft(salvo, { ...salvo, order: dropBlock(salvo.order, 'auditoria', 'acoes') })).toBe(false)
  })

  it('"Restaurar padrão" volta ao layout de fábrica', () => {
    const padrao = defaultDraft()
    expect(padrao).toEqual({ order: DEFAULT_ORDER, hidden: [], sizes: DEFAULT_SIZES })
    expect(sameDraft(padrao, prefsDraft(null))).toBe(true)
  })

  it('o que vai para o servidor é pequeno e tem os três campos', () => {
    const corpo = prefsToSave(defaultDraft())
    expect(Object.keys(corpo).sort()).toEqual(['hidden', 'order', 'sizes'])
    expect(corpo.order).toHaveLength(DEFAULT_ORDER.length)
    expect(corpo.sizes).toEqual(DEFAULT_SIZES)
    // O backend só aceita até 4096 bytes de JSON.
    expect(JSON.stringify(corpo).length).toBeLessThan(4096)
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
