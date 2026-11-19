import { describe, it, expect } from 'vitest'
import { STICKY_ACTIONS_CELL, STICKY_CELL, STICKY_EDGE } from '@/lib/table-sticky-actions'

const classes = (s: string) => s.split(/\s+/).filter(Boolean)
const sombras = (s: string) => classes(s).filter(c => /(^|:)shadow-\[/.test(c))

// SR-156: na tabela de bordas coladas o navegador não pinta o `box-shadow` de fora de
// uma célula, então a sombra antiga da coluna "Ações" nunca aparecia.
describe('coluna de Ações presa à direita', () => {
  it('não usa sombra de fora da célula nem cor fixa', () => {
    for (const s of [STICKY_ACTIONS_CELL, STICKY_EDGE]) {
      expect(sombras(s).length).toBeGreaterThan(0)
      for (const sombra of sombras(s)) expect(sombra).toMatch(/shadow-\[inset_/)
      expect(s).not.toMatch(/rgba?\(|#[0-9a-f]{3,8}\b/i)
    }
  })

  it('a borda é a linha `inset` na cor da borda e o degradê no ::before à esquerda', () => {
    expect(classes(STICKY_EDGE)).toEqual(expect.arrayContaining([
      'shadow-[inset_1px_0_0_var(--border)]',
      'before:absolute',
      'before:right-full',
      'before:pointer-events-none',
      'before:from-[color-mix(in_srgb,var(--foreground)_16%,transparent)]',
    ]))
  })

  it('STICKY_ACTIONS_CELL = a célula presa + a borda só abaixo de lg', () => {
    const celula = classes(STICKY_ACTIONS_CELL)
    expect(celula).toEqual(expect.arrayContaining(classes(STICKY_CELL)))
    // A mesma borda de STICKY_EDGE, classe por classe, com `max-lg:` na frente.
    const resto = celula.filter(c => !classes(STICKY_CELL).includes(c))
    expect(resto).toEqual(classes(STICKY_EDGE).map(c => `max-lg:${c}`))
  })

  it('a célula sem borda não tem sombra nem ::before', () => {
    expect(STICKY_CELL).not.toMatch(/shadow|before:/)
  })
})
