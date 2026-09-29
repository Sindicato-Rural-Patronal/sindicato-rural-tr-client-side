import { describe, it, expect, vi } from 'vitest'
import { apagarEmLotes } from '@/lib/bulk-delete'

const ids = (n: number) => Array.from({ length: n }, (_, i) => `id-${i}`)

describe('apagarEmLotes', () => {
  it('apaga todos e conta certo', async () => {
    const apagar = vi.fn().mockResolvedValue(undefined)
    const r = await apagarEmLotes(ids(12), apagar)
    expect(r).toEqual({ ok: 12, erros: [] })
    expect(apagar).toHaveBeenCalledTimes(12)
  })

  it('uma falha no meio não impede as outras', async () => {
    // Sem isto, marcar dez e ter uma travada deixaria as nove restantes.
    const apagar = vi.fn(async (id: string) => {
      if (id === 'id-3') throw new Error('em uso')
      return undefined
    })
    const r = await apagarEmLotes(ids(10), apagar)
    expect(r.ok).toBe(9)
    expect(r.erros).toHaveLength(1)
    expect(apagar).toHaveBeenCalledTimes(10)
  })

  it('guarda uma mensagem só: dez falhas iguais dizem o mesmo', async () => {
    const apagar = vi.fn().mockRejectedValue(new Error('sem permissão'))
    const r = await apagarEmLotes(ids(10), apagar)
    expect(r.ok).toBe(0)
    expect(r.erros).toHaveLength(1)
  })

  it('vai em lotes, não todos de uma vez', async () => {
    // O banco leva pancada e a tela trava se os 200 saírem juntos.
    let simultaneos = 0
    let pico = 0
    const apagar = vi.fn(async () => {
      simultaneos++
      pico = Math.max(pico, simultaneos)
      await Promise.resolve()
      simultaneos--
    })
    await apagarEmLotes(ids(20), apagar)
    expect(pico).toBeLessThanOrEqual(5)
  })

  it('lista vazia não chama nada', async () => {
    const apagar = vi.fn()
    expect(await apagarEmLotes([], apagar)).toEqual({ ok: 0, erros: [] })
    expect(apagar).not.toHaveBeenCalled()
  })
})
