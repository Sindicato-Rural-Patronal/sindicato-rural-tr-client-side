import { describe, it, expect } from 'vitest'
import { auditChanges, auditFieldLabel, formatAuditValue } from '@/lib/audit-fields'

describe('auditoria: nome dos campos', () => {
  it('campos comuns em português; desconhecido sai como veio', () => {
    expect(auditFieldLabel('name')).toBe('Nome')
    expect(auditFieldLabel('email')).toBe('E-mail')
    expect(auditFieldLabel('phone')).toBe('Telefone')
    expect(auditFieldLabel('cpf')).toBe('CPF')
    expect(auditFieldLabel('status')).toBe('Situação')
    expect(auditFieldLabel('priceCents')).toBe('Preço')
    expect(auditFieldLabel('startTime')).toBe('Início')
    expect(auditFieldLabel('endTime')).toBe('Término')
    expect(auditFieldLabel('permissions')).toBe('Permissões')
    expect(auditFieldLabel('password')).toBe('Senha')
    expect(auditFieldLabel('campoNovo')).toBe('campoNovo')
  })
})

describe('auditoria: valores de antes/depois', () => {
  it('vazio, sim/não e presença', () => {
    expect(formatAuditValue('email', null)).toBe('—')
    expect(formatAuditValue('email', '')).toBe('—')
    expect(formatAuditValue('confirmed', true)).toBe('Sim')
    expect(formatAuditValue('read', false)).toBe('Não')
    expect(formatAuditValue('attended', true)).toBe('Presente')
    expect(formatAuditValue('attended', false)).toBe('Faltou')
  })

  it('números, centavos e situações conhecidas', () => {
    expect(formatAuditValue('maxCapacity', 1200)).toBe('1.200')
    expect(formatAuditValue('amountCents', 12050).replace(/\s/g, ' ')).toBe('R$ 120,50')
    expect(formatAuditValue('status', 'IN_PROGRESS')).toBe('Em andamento')
    expect(formatAuditValue('status', 'COMPLETED')).toBe('Concluído')
    expect(formatAuditValue('name', 'JOÃO')).toBe('JOÃO')
  })

  it('datas: meia-noite vira só a data; horário do curso sai como gravado; demais no horário de Brasília', () => {
    expect(formatAuditValue('birthDate', '1990-05-01T00:00:00.000Z')).toBe('01/05/1990')
    expect(formatAuditValue('startTime', '2032-03-01T08:30:00.000Z')).toBe('01/03/2032 08:30')
    expect(formatAuditValue('expiresAt', '2026-09-17T13:05:00.000Z')).toMatch(/17\/09\/2026,? 10:05/)
  })
})

describe('auditoria: correção do Nº do lançamento', () => {
  // PATCH /admin/finance/transactions/:id com `number` guarda { field: "number", before, after } (decisão 005).
  it('o campo "number" aparece como "Nº"', () => {
    expect(auditFieldLabel('number')).toBe('Nº')
  })

  it('o valor sai sem separador de milhar: é um número de identificação ("Nº: 1234 → 5000")', () => {
    expect(formatAuditValue('number', 1234)).toBe('1234')
    expect(formatAuditValue('number', 5000)).toBe('5000')
    expect(formatAuditValue('number', null)).toBe('—')
    // Os outros números continuam com o separador.
    expect(formatAuditValue('maxCapacity', 1234)).toBe('1.234')
  })
})

describe('auditoria: modelo de relatório da equipe (SR-115)', () => {
  // PATCH e DELETE de /admin/report-templates/:dataset/:id guardam o que mudou
  // (back: reportTemplateAuditSnapshot e AUDIT_FIELD_LABELS, SR-114).
  const mudanca = [
    { field: 'name', before: 'Contatos', after: 'Telefones da equipe' },
    { field: 'fields', before: 'Nome, Telefone', after: 'Nome, Telefone, E-mail' },
    { field: 'format', before: 'CSV', after: 'Excel' },
    { field: 'onlyConfirmed', before: false, after: true },
  ]

  it('os campos com o mesmo nome da planilha da auditoria', () => {
    expect(auditChanges(mudanca).map(c => auditFieldLabel(c.field))).toEqual(['Nome', 'Campos', 'Formato', 'Só confirmadas'])
  })

  it('os valores saem como vieram (rótulos e o nome do formato); "Só confirmadas" em sim/não', () => {
    expect(formatAuditValue('fields', 'Nome, Telefone, E-mail')).toBe('Nome, Telefone, E-mail')
    expect(formatAuditValue('format', 'Excel')).toBe('Excel')
    expect(formatAuditValue('format', null)).toBe('—')
    expect(formatAuditValue('onlyConfirmed', true)).toBe('Sim')
    expect(formatAuditValue('onlyConfirmed', false)).toBe('Não')
  })
})

describe('auditoria: reabrir o mês (Fechamento de caixa)', () => {
  // DELETE /admin/finance/closings/:id apaga o fechamento; a trilha guarda o que
  // estava fechado em `changes` (back: audit-snapshot.ts + removedSnapshot).
  const reabertura = [
    { field: 'month', before: '2026-10', after: null },
    { field: 'account', before: 'BANCO', after: null },
    { field: 'expectedBalanceCents', before: 130000, after: null },
    { field: 'countedBalanceCents', before: 129500, after: null },
    { field: 'differenceCents', before: -500, after: null },
    { field: 'notes', before: 'FALTOU TROCO', after: null },
    { field: 'closedAt', before: '2026-10-31T20:00:00.000Z', after: null },
  ]

  it('cada campo guardado tem nome em português', () => {
    expect(auditChanges(reabertura).map(c => auditFieldLabel(c.field))).toEqual([
      'Mês', 'Caixa', 'Saldo esperado', 'Saldo contado', 'Diferença', 'Observações', 'Fechado em',
    ])
  })

  it('valores legíveis: mês "10/2026", dinheiro em reais e a hora do fechamento em Brasília', () => {
    expect(formatAuditValue('month', '2026-10')).toBe('10/2026')
    expect(formatAuditValue('countedBalanceCents', 129500).replace(/\s/g, ' ')).toBe('R$ 1.295,00')
    expect(formatAuditValue('differenceCents', -500).replace(/\s/g, ' ')).toBe('-R$ 5,00')
    expect(formatAuditValue('closedAt', '2026-10-31T20:00:00.000Z')).toMatch(/31\/10\/2026,? 17:00/)
    expect(formatAuditValue('month', null)).toBe('—')
  })

  it('o formato de mês vale só para campo de mês (texto "2026-10" em outro campo sai como veio)', () => {
    expect(formatAuditValue('startMonth', '2026-01')).toBe('01/2026')
    expect(formatAuditValue('description', '2026-10')).toBe('2026-10')
  })
})

describe('auditoria: lista de alterações', () => {
  it('ignora resposta antiga ou malformada', () => {
    expect(auditChanges(null)).toEqual([])
    expect(auditChanges('x')).toEqual([])
    expect(auditChanges([{ field: 'name', before: 'A', after: 'B' }, { lixo: true }, null])).toEqual([
      { field: 'name', before: 'A', after: 'B' },
    ])
  })
})
