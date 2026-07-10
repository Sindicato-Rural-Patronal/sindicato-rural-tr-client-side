import { describe, it, expect } from 'vitest'
import { formatDateFromString } from '@/utils/format-data-from-string'

describe('formatDateFromString', () => {
  it('converte YYYY-MM-DD para DD/MM/YY', () => {
    expect(formatDateFromString('2024-06-03')).toBe('03/06/24')
  })

  it('converte data com padding correto', () => {
    expect(formatDateFromString('2025-01-09')).toBe('09/01/25')
  })

  it('converte final de ano', () => {
    expect(formatDateFromString('2023-12-31')).toBe('31/12/23')
  })

  it('aceita ISO datetime e descarta a hora', () => {
    expect(formatDateFromString('2026-07-01T12:34:56.000Z')).toBe('01/07/26')
  })

  it('retorna vazio para entrada inválida ou vazia', () => {
    expect(formatDateFromString('')).toBe('')
    expect(formatDateFromString('lixo')).toBe('')
  })
})
