// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import i18n from '@/i18n'
import ptBR from '@/i18n/locales/pt-BR'

// Quem usou o seletor antigo tem o idioma guardado no navegador. vi.hoisted
// roda antes dos imports, então a chave já existe quando o i18n carrega.
vi.hoisted(() => {
  localStorage.setItem('sindicato-lang', 'en')
})

// Código do app (sem os testes, que simulam o t() com chaves próprias).
const sources = import.meta.glob<string>(
  ['/src/**/*.{ts,tsx}', '!/src/test/**', '!/src/routeTree.gen.ts'],
  { query: '?raw', import: 'default', eager: true },
)

// Chave existe como texto ou com as variações de plural (_one/_other).
function hasKey(key: string): boolean {
  const parts = key.split('.')
  const last = parts.pop()!
  let node: unknown = ptBR
  for (const part of parts) {
    if (!node || typeof node !== 'object') return false
    node = (node as Record<string, unknown>)[part]
  }
  if (!node || typeof node !== 'object') return false
  const obj = node as Record<string, unknown>
  return typeof obj[last] === 'string' || typeof obj[`${last}_other`] === 'string'
}

describe('i18n', () => {
  it('fica sempre em pt-BR, mesmo com navegador em inglês', () => {
    expect(navigator.language).toMatch(/^en/)
    expect(i18n.language).toBe('pt-BR')
    expect(Object.keys(i18n.options.resources ?? {})).toEqual(['pt-BR'])
    expect(i18n.t('nav.courses')).toBe('Cursos')
  })

  it('apaga o idioma guardado pelo seletor antigo', () => {
    expect(localStorage.getItem('sindicato-lang')).toBeNull()
  })

  it("toda chave usada em t('...') existe em pt-BR.ts", () => {
    const used = new Set<string>()
    for (const code of Object.values(sources)) {
      for (const m of code.matchAll(/\bt\(\s*['"`]([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)['"`]/g)) {
        used.add(m[1])
      }
    }
    expect(used.size).toBeGreaterThan(100)
    const missing = [...used].filter(key => !hasKey(key)).sort()
    expect(missing).toEqual([])
  })
})
