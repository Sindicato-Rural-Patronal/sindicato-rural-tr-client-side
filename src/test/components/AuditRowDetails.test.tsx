import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuditRowDetails } from '@/components/auditoria/AuditRowDetails'
import { detalhesDaExportacao } from '@/components/export/export-details'
import type { AuditTrailItem } from '@/hooks/useAuditTrail'

// "O que foi exportado" (decisão 006, item 7.2): a linha EXPORT traz `details`
// com formato, modelo, campos, escopo, filtros e linhas.

const DETALHES = {
  formato: 'pdf',
  modelo: 'Nome e CPF',
  campos: ['Nome', 'CPF'],
  escopo: 'com filtros',
  filtros: [{ nome: 'Busca', valor: 'silva' }, { nome: 'Só associados em dia', valor: 'Sim' }],
  linhas: 123,
}

function linha(over: Partial<AuditTrailItem> = {}): AuditTrailItem {
  return {
    id: 'a1', actorId: 'u1', actorName: 'GESTOR', method: 'POST', path: '/admin/export/people', entity: 'Exportação',
    targetLabel: 'Pessoas: 123 registros (com filtros) · PDF · com CPF', statusCode: 200, createdAt: '2026-11-11T10:00:00.000Z',
    ip: null, location: null, device: null, userAgent: null, changes: null,
    ...over,
  }
}

describe('detalhesDaExportacao', () => {
  it('lê o formato da decisão e traduz formato e escopo', () => {
    expect(detalhesDaExportacao(DETALHES)).toEqual({
      formato: 'PDF',
      modelo: 'Nome e CPF',
      campos: ['Nome', 'CPF'],
      escopo: 'Todos com os filtros',
      filtros: [{ nome: 'Busca', valor: 'silva' }, { nome: 'Só associados em dia', valor: '' }],
      linhas: 123,
    })
  })

  it('o escopo da API vira texto da tela', () => {
    expect(detalhesDaExportacao({ escopo: 'seleção' })?.escopo).toBe('Selecionados')
    expect(detalhesDaExportacao({ escopo: 'todos' })?.escopo).toBe('Todos')
  })

  it('valor desconhecido aparece como veio', () => {
    expect(detalhesDaExportacao({ formato: 'xml', escopo: 'algum' })).toMatchObject({ formato: 'xml', escopo: 'algum' })
  })

  it('sem nada de exportação (linha antiga, outra ação) = null', () => {
    expect(detalhesDaExportacao(null)).toBeNull()
    expect(detalhesDaExportacao(undefined)).toBeNull()
    expect(detalhesDaExportacao([])).toBeNull()
    expect(detalhesDaExportacao({ outra: 1 })).toBeNull()
    expect(detalhesDaExportacao('texto')).toBeNull()
  })

  it('ignora entradas estragadas', () => {
    expect(detalhesDaExportacao({ campos: ['Nome', 3, null, ''], filtros: [null, { valor: 'x' }, 'Busca'] })).toEqual({
      formato: null, modelo: null, campos: ['Nome', '3'], escopo: null, filtros: [{ nome: 'Busca', valor: '' }], linhas: null,
    })
  })
})

describe('AuditRowDetails › O que foi exportado', () => {
  it('mostra formato, modelo, campos, filtros e registros', () => {
    render(<AuditRowDetails row={linha({ details: DETALHES })} ipFiltered={false} onFilterIp={() => {}} />)
    expect(screen.getByText('O que foi exportado')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('Nome e CPF')).toBeInTheDocument()
    expect(screen.getByText('Todos com os filtros')).toBeInTheDocument()
    expect(screen.getByText('123')).toBeInTheDocument()
    expect(screen.getByText('Campos (2)')).toBeInTheDocument()
    expect(screen.getByText('CPF')).toBeInTheDocument()
    expect(screen.getByText('silva')).toBeInTheDocument()
  })

  it('linha sem details não mostra o bloco', () => {
    render(<AuditRowDetails row={linha()} ipFiltered={false} onFilterIp={() => {}} />)
    expect(screen.queryByText('O que foi exportado')).not.toBeInTheDocument()
  })
})
