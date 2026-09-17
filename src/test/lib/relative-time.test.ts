import { describe, it, expect } from 'vitest'
import { fullDateTime, relativeTime } from '@/lib/relative-time'

// Datas no fuso local (como a tela mostra).
const now = new Date(2026, 8, 17, 14, 30) // 17/09/2026 14:30
const at = (...args: [number, number, number, number, number]) => new Date(...args).toISOString()

describe('relativeTime', () => {
  it('menos de 1 minuto (ou no futuro) → "agora"', () => {
    expect(relativeTime(at(2026, 8, 17, 14, 30), now)).toBe('agora')
    expect(relativeTime(new Date(now.getTime() - 30_000).toISOString(), now)).toBe('agora')
    expect(relativeTime(at(2026, 8, 17, 14, 32), now)).toBe('agora')
  })

  it('minutos e horas', () => {
    expect(relativeTime(at(2026, 8, 17, 14, 25), now)).toBe('há 5 min')
    expect(relativeTime(at(2026, 8, 17, 13, 31), now)).toBe('há 59 min')
    expect(relativeTime(at(2026, 8, 17, 12, 30), now)).toBe('há 2 h')
    // Menos de 24 h, mesmo passando da meia-noite.
    expect(relativeTime(at(2026, 8, 16, 20, 0), now)).toBe('há 18 h')
  })

  it('dia anterior com mais de 24 h → "ontem"', () => {
    expect(relativeTime(at(2026, 8, 16, 9, 0), now)).toBe('ontem')
  })

  it('mais antigo → dia/mês; outro ano → dia/mês/ano', () => {
    expect(relativeTime(at(2026, 8, 12, 10, 0), now)).toBe('12/09')
    expect(relativeTime(at(2025, 11, 31, 10, 0), now)).toBe('31/12/2025')
  })

  it('data inválida → texto vazio', () => {
    expect(relativeTime('não é data', now)).toBe('')
    expect(fullDateTime('não é data')).toBe('')
  })

  it('fullDateTime mostra dia, mês, ano e hora', () => {
    expect(fullDateTime(at(2026, 8, 12, 9, 5))).toBe('12/09/2026 09:05')
  })
})
