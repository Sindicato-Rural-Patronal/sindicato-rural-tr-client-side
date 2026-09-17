import { describe, it, expect } from 'vitest'
import { COMMON_MEMBER_TITLES, memberTitleSuggestions } from '@/hooks/useCompanies'

describe('memberTitleSuggestions', () => {
  it('sem títulos usados, sugere os comuns em ordem alfabética', () => {
    expect(memberTitleSuggestions(undefined)).toEqual([...COMMON_MEMBER_TITLES].sort())
  })

  it('junta os usados com os comuns sem repetir', () => {
    const list = memberTitleSuggestions(['TESOUREIRO', 'SOCIO'])
    expect(list).toContain('TESOUREIRO')
    expect(list.filter(t => t === 'SOCIO')).toHaveLength(1)
    expect(list).toEqual([...list].sort())
  })
})
