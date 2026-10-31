import { describe, it, expect } from 'vitest'
import { formatDateTimeBrasilia } from '@/utils/format-datetime-brasilia'

// Data e hora da inscrição na lista de inscritos: dd/mm/aaaa hh:mm, no relógio
// de Brasília (UTC-3), seja qual for o fuso do aparelho.

describe('formatDateTimeBrasilia', () => {
  it('escreve dd/mm/aaaa hh:mm', () => {
    expect(formatDateTimeBrasilia('2026-10-30T17:35:00.000Z')).toBe('30/10/2026 14:35')
  })

  it('usa a hora de Brasília, não a UTC: de madrugada em UTC ainda é o dia anterior', () => {
    expect(formatDateTimeBrasilia('2026-10-30T02:35:00.000Z')).toBe('29/10/2026 23:35')
    expect(formatDateTimeBrasilia('2026-01-01T02:59:59.000Z')).toBe('31/12/2025 23:59')
  })

  it('a meia-noite de Brasília é 00:00, não 24:00', () => {
    expect(formatDateTimeBrasilia('2026-10-30T03:00:00.000Z')).toBe('30/10/2026 00:00')
  })

  it('completa dia, mês, hora e minuto com zero', () => {
    expect(formatDateTimeBrasilia('2026-03-05T11:07:00.000Z')).toBe('05/03/2026 08:07')
  })

  it('aceita ISO sem milissegundos e com deslocamento', () => {
    expect(formatDateTimeBrasilia('2026-10-30T17:35:00Z')).toBe('30/10/2026 14:35')
    expect(formatDateTimeBrasilia('2026-10-30T14:35:00-03:00')).toBe('30/10/2026 14:35')
  })

  it('sem data ou com data inválida devolve vazio (a tela não mostra "Invalid Date")', () => {
    expect(formatDateTimeBrasilia('')).toBe('')
    expect(formatDateTimeBrasilia(null)).toBe('')
    expect(formatDateTimeBrasilia(undefined)).toBe('')
    expect(formatDateTimeBrasilia('ontem')).toBe('')
  })
})
