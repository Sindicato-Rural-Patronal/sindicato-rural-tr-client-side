import { describe, it, expect } from 'vitest'
import { bannerStartIso, bannerEndIso, brasiliaYmd, bannerPeriodLabel, bannerState } from '@/lib/banner-dates'

describe('datas dos banners (Brasília)', () => {
  it('início e fim do dia no horário de Brasília', () => {
    expect(bannerStartIso('2026-09-20')).toBe('2026-09-20T00:00:00.000-03:00')
    expect(bannerEndIso('2026-09-30')).toBe('2026-09-30T23:59:59.999-03:00')
    expect(new Date(bannerStartIso('2026-09-20')!).toISOString()).toBe('2026-09-20T03:00:00.000Z')
    expect(new Date(bannerEndIso('2026-09-30')!).toISOString()).toBe('2026-10-01T02:59:59.999Z')
    expect(bannerStartIso('')).toBeNull()
    expect(bannerEndIso('')).toBeNull()
  })

  it('instante gravado → dia em Brasília (sem cortar a string ISO)', () => {
    expect(brasiliaYmd('2026-09-20T03:00:00.000Z')).toBe('2026-09-20')
    // término gravado vira o dia seguinte em UTC, mas é o último dia em Brasília
    expect(brasiliaYmd('2026-10-01T02:59:59.999Z')).toBe('2026-09-30')
    expect(brasiliaYmd(null)).toBe('')
    expect(brasiliaYmd('lixo')).toBe('')
  })

  it('texto do período', () => {
    const start = '2026-09-20T03:00:00.000Z'
    const end = '2026-10-01T02:59:59.999Z'
    expect(bannerPeriodLabel({ startDate: start, endDate: end })).toBe('20/09/2026 a 30/09/2026')
    expect(bannerPeriodLabel({ startDate: start, endDate: null })).toBe('A partir de 20/09/2026')
    expect(bannerPeriodLabel({ startDate: null, endDate: end })).toBe('Até 30/09/2026')
    expect(bannerPeriodLabel({ startDate: null, endDate: null })).toBe('')
  })
})

describe('bannerState (mesma regra do GET /banners)', () => {
  const now = new Date('2026-09-25T15:00:00.000Z')
  const b = (active: boolean, startDate: string | null, endDate: string | null) => ({ active, startDate, endDate })

  it('inativo vence as datas', () => {
    expect(bannerState(b(false, null, null), now)).toBe('inactive')
  })

  it('agendado, no ar e expirado', () => {
    expect(bannerState(b(true, '2026-09-26T03:00:00.000Z', null), now)).toBe('scheduled')
    expect(bannerState(b(true, '2026-09-20T03:00:00.000Z', '2026-10-01T02:59:59.999Z'), now)).toBe('live')
    expect(bannerState(b(true, null, null), now)).toBe('live')
    expect(bannerState(b(true, null, '2026-09-25T02:59:59.999Z'), now)).toBe('expired')
  })

  it('limites inclusivos: começa e termina no instante exato', () => {
    expect(bannerState(b(true, now.toISOString(), now.toISOString()), now)).toBe('live')
  })
})
