import { describe, it, expect } from 'vitest'
import { isActiveMember } from '@/lib/membership'

describe('selo Associado nas inscrições', () => {
  const today = new Date(2026, 8, 17, 15, 0)

  it('só vale para situação ATIVO', () => {
    expect(isActiveMember('ACTIVE', null, today)).toBe(true)
    expect(isActiveMember('INACTIVE', null, today)).toBe(false)
    expect(isActiveMember(null, '2030-01-01', today)).toBe(false)
  })

  it('a validade vale o dia inteiro', () => {
    expect(isActiveMember('ACTIVE', '2026-09-17T00:00:00.000Z', today)).toBe(true)
    expect(isActiveMember('ACTIVE', '2026-09-16T00:00:00.000Z', today)).toBe(false)
  })
})
