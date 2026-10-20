import { describe, it, expect } from 'vitest'
import { CHUNK_RELOAD_COOLDOWN_MS, shouldReloadForNewChunks } from '@/lib/chunk-reload'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => { data[k] = v },
  }
}

describe('shouldReloadForNewChunks', () => {
  it('a primeira falha recarrega e anota o horário', () => {
    const s = fakeStorage()
    expect(shouldReloadForNewChunks(s, 1_000_000)).toBe(true)
    expect(s.data['chunk-reload-at']).toBe('1000000')
  })

  it('falha logo depois da recarga não recarrega de novo (sem loop)', () => {
    const s = fakeStorage()
    shouldReloadForNewChunks(s, 1_000_000)
    expect(shouldReloadForNewChunks(s, 1_000_000 + 2_000)).toBe(false)
    expect(shouldReloadForNewChunks(s, 1_000_000 + CHUNK_RELOAD_COOLDOWN_MS - 1)).toBe(false)
    // a tentativa bloqueada não empurra o relógio
    expect(s.data['chunk-reload-at']).toBe('1000000')
  })

  it('um segundo deploy, depois do intervalo, recarrega outra vez', () => {
    const s = fakeStorage()
    shouldReloadForNewChunks(s, 1_000_000)
    expect(shouldReloadForNewChunks(s, 1_000_000 + CHUNK_RELOAD_COOLDOWN_MS)).toBe(true)
    expect(s.data['chunk-reload-at']).toBe(String(1_000_000 + CHUNK_RELOAD_COOLDOWN_MS))
  })

  it('o flag antigo ("1") não trava a aba', () => {
    const s = fakeStorage({ 'chunk-reload': '1' })
    expect(shouldReloadForNewChunks(s, 1_000_000)).toBe(true)
  })

  it('horário no futuro (relógio mudou) ou lixo não trava a aba', () => {
    expect(shouldReloadForNewChunks(fakeStorage({ 'chunk-reload-at': '9999999999999' }), 1_000_000)).toBe(true)
    expect(shouldReloadForNewChunks(fakeStorage({ 'chunk-reload-at': 'abc' }), 1_000_000)).toBe(true)
  })

  it('sem sessionStorage não recarrega: sem onde guardar o horário o loop não teria freio', () => {
    expect(shouldReloadForNewChunks(null)).toBe(false)
    const quebrado = { getItem: () => { throw new Error('bloqueado') }, setItem: () => { throw new Error('bloqueado') } }
    expect(shouldReloadForNewChunks(quebrado)).toBe(false)
  })
})
