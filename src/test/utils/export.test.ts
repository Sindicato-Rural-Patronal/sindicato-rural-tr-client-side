import { describe, it, expect } from 'vitest'
import { exportQuery } from '@/lib/export'

describe('exportação: query', () => {
  it('listas viram "a,b" e vazios ficam de fora', () => {
    expect(exportQuery({ ids: ['a', 'b'], search: '', type: undefined, isPartner: false, read: null })).toBe('ids=a%2Cb&isPartner=false')
    expect(exportQuery({ ownerIds: [], search: 'joão' })).toBe('search=jo%C3%A3o')
  })
})
