import { describe, it, expect } from 'vitest'
import { textosDaAgenda, textosDaAuditoria, textosDoFinanceiro } from '@/components/export/filter-texts'
import { filtrosEmPalavras } from '@/components/export/report-builder'
import { financeExportFilters } from '@/hooks/useFinance'

// A linha "Filtros:" do montador nas telas da fase 2, parte B (SR-103): os
// filtros que a tela manda por id ou código saem pelo nome, como a API diz no PDF.

describe('textosDoFinanceiro', () => {
  it('tipo, categoria, caixa e ordem por Nº pelo nome', () => {
    expect(textosDoFinanceiro({
      type: 'OUT', categoryId: 'c1', categoria: 'INSUMOS', accountId: 'a1', caixa: 'BANCO', orderBy: 'number',
    })).toEqual({ type: 'Tipo: Saída', categoryId: 'Categoria: INSUMOS', accountId: 'Caixa: BANCO', orderBy: 'Ordem: Nº' })
    expect(textosDoFinanceiro({ type: 'IN' })).toEqual({ type: 'Tipo: Entrada' })
  })

  it('sem filtro, nada; a ordem por data (a de sempre) não aparece', () => {
    expect(textosDoFinanceiro({ type: '', categoria: 'INSUMOS', caixa: 'BANCO', orderBy: 'date' })).toEqual({})
  })

  it('"Sem transferências entre caixas" sai com o texto exato da API, sem ": Sim"; desmarcado, nada', () => {
    expect(textosDoFinanceiro({ type: 'IN', excludeTransfers: true }))
      .toEqual({ type: 'Tipo: Entrada', excludeTransfers: 'Sem transferências entre caixas' })
    expect(textosDoFinanceiro({ excludeTransfers: false })).toEqual({})
    expect(textosDoFinanceiro({})).toEqual({})
  })

  it('filtro cujo nome a tela não achou sai sem o id', () => {
    expect(textosDoFinanceiro({ categoryId: 'c1', accountId: 'a1' })).toEqual({ categoryId: 'Categoria', accountId: 'Caixa' })
  })
})

describe('linha "Filtros:" do montador com o filtro sem transferências (SR-136)', () => {
  const filterLabels = { type: 'Tipo', excludeTransfers: 'Sem transferências entre caixas' }

  it('diz "Sem transferências entre caixas", igual à API', () => {
    const filters = financeExportFilters({ type: 'IN', excludeTransfers: true })
    const textos = textosDoFinanceiro({ type: 'IN', excludeTransfers: true })
    expect(filtrosEmPalavras(filters, filterLabels, { textos })).toEqual(['Tipo: Entrada', 'Sem transferências entre caixas'])
  })

  it('sem o filtro, a linha não muda', () => {
    const filters = financeExportFilters({ type: 'IN' })
    expect(filtrosEmPalavras(filters, filterLabels, { textos: textosDoFinanceiro({ type: 'IN' }) })).toEqual(['Tipo: Entrada'])
  })
})

describe('textosDaAuditoria', () => {
  const acoes = { create: 'Criações', export: 'Exportações' }

  it('a ação com o nome do filtro da tela e quem pelo usuário', () => {
    expect(textosDaAuditoria({ action: 'export', acoes, actorId: 'u1', quem: 'bali' }))
      .toEqual({ action: 'Ação: Exportações', actorId: 'Quem: bali' })
  })

  it('ação desconhecida fica com o montador; quem sem nome sai sem o id', () => {
    expect(textosDaAuditoria({ action: 'outra', acoes, actorId: 'u1' })).toEqual({ actorId: 'Quem' })
    expect(textosDaAuditoria({ acoes })).toEqual({})
  })
})

describe('textosDaAgenda', () => {
  it('a sala pelo nome e o tipo como a API', () => {
    expect(textosDaAgenda({ roomId: 'r1', sala: 'AUDITORIO', type: 'MEETING' }))
      .toEqual({ roomId: 'Sala: AUDITORIO', type: 'Tipo: Reunião' })
    expect(textosDaAgenda({ type: 'EVENT' })).toEqual({ type: 'Tipo: Evento' })
    expect(textosDaAgenda({ roomId: '', sala: 'AUDITORIO' })).toEqual({})
  })
})
