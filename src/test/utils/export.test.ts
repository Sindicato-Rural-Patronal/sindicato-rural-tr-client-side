import { describe, it, expect } from 'vitest'
import { exportBody } from '@/lib/export'

describe('exportação: corpo do POST', () => {
  it('vazios, nulos e listas vazias ficam de fora; o resto vira texto', () => {
    expect(exportBody({ ids: ['a', 'b'], search: '', type: undefined, isPartner: false, read: null }))
      .toEqual({ ids: ['a', 'b'], isPartner: 'false' })
    expect(exportBody({ ownerIds: [], search: 'joão', page: 2 })).toEqual({ search: 'joão', page: '2' })
  })

  it('nunca manda ids vazio', () => {
    expect(exportBody({ ids: [] })).toEqual({})
    expect(exportBody({ ids: [], courseIds: ['c1'] })).toEqual({ courseIds: ['c1'] })
  })
})
