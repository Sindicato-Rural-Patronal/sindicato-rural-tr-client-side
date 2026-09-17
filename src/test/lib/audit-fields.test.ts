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

describe('auditoria: lista de alterações', () => {
  it('ignora resposta antiga ou malformada', () => {
    expect(auditChanges(null)).toEqual([])
    expect(auditChanges('x')).toEqual([])
    expect(auditChanges([{ field: 'name', before: 'A', after: 'B' }, { lixo: true }, null])).toEqual([
      { field: 'name', before: 'A', after: 'B' },
    ])
  })
})
