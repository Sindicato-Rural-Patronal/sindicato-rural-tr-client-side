import { describe, it, expect } from 'vitest'
import { isActiveMember, personIsActiveMember } from '@/lib/membership'

describe('selo Associado (isActiveMember)', () => {
  // 17/09/2026 às 15h em Brasília (18h UTC).
  const today = new Date('2026-09-17T18:00:00.000Z')

  it('só vale para situação ATIVO', () => {
    expect(isActiveMember('ACTIVE', null, today)).toBe(true)
    expect(isActiveMember('INACTIVE', null, today)).toBe(false)
    expect(isActiveMember(null, '2030-01-01', today)).toBe(false)
    expect(isActiveMember(undefined, null, today)).toBe(false)
  })

  it('validade vazia vale sempre', () => {
    expect(isActiveMember('ACTIVE', null, today)).toBe(true)
    expect(isActiveMember('ACTIVE', undefined, today)).toBe(true)
    expect(isActiveMember('ACTIVE', '', today)).toBe(true)
  })

  it('a validade vale o dia inteiro', () => {
    expect(isActiveMember('ACTIVE', '2026-09-17T00:00:00.000Z', today)).toBe(true)
    expect(isActiveMember('ACTIVE', '2026-09-18T00:00:00.000Z', today)).toBe(true)
    expect(isActiveMember('ACTIVE', '2026-09-16T00:00:00.000Z', today)).toBe(false)
    // também sem a hora
    expect(isActiveMember('ACTIVE', '2026-09-17', today)).toBe(true)
    expect(isActiveMember('ACTIVE', '2026-09-16', today)).toBe(false)
  })

  it('"hoje" é o dia em Brasília, não o do fuso do computador', () => {
    // 22h50 de 17/09 em Brasília já é 18/09 01h50 em UTC: ainda vale a validade de 17/09.
    const noiteEmBrasilia = new Date('2026-09-18T01:50:00.000Z')
    expect(isActiveMember('ACTIVE', '2026-09-17T00:00:00.000Z', noiteEmBrasilia)).toBe(true)
    // 00h00 de 18/09 em Brasília (03h UTC): a validade de 17/09 venceu.
    const meiaNoiteEmBrasilia = new Date('2026-09-18T03:00:00.000Z')
    expect(isActiveMember('ACTIVE', '2026-09-17T00:00:00.000Z', meiaNoiteEmBrasilia)).toBe(false)
    expect(isActiveMember('ACTIVE', '2026-09-18T00:00:00.000Z', meiaNoiteEmBrasilia)).toBe(true)
    // 23h59 de 17/09 em Brasília (02h59 UTC de 18/09) ainda é 17/09.
    const ultimoMinuto = new Date('2026-09-18T02:59:00.000Z')
    expect(isActiveMember('ACTIVE', '2026-09-17T00:00:00.000Z', ultimoMinuto)).toBe(true)
  })

  it('personIsActiveMember usa os dois campos da pessoa', () => {
    expect(personIsActiveMember({ memberStatus: 'ACTIVE', membershipValidUntil: null }, today)).toBe(true)
    expect(personIsActiveMember({ memberStatus: 'ACTIVE', membershipValidUntil: '2026-01-01T00:00:00.000Z' }, today)).toBe(false)
    expect(personIsActiveMember({ memberStatus: 'INACTIVE', membershipValidUntil: null }, today)).toBe(false)
    expect(personIsActiveMember({}, today)).toBe(false)
  })
})
