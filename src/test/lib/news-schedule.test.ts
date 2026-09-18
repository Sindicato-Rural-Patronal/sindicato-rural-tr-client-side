import { describe, it, expect } from 'vitest'
import {
  isNewsLive, isScheduled, nowWallClock, scheduleLabel, scheduleToForm,
  scheduleToPublishAt, validateSchedule,
} from '@/lib/news-schedule'

// `publishAt` é hora "de parede" de Brasília com Z: "…T08:00:00.000Z" = 08:00
// em Terra Roxa. O "agora" dos testes é fixo, nada depende do relógio real.
const NOW = '2026-09-23T08:00:00.000Z' // 08:00 em Terra Roxa

describe('nowWallClock', () => {
  it('converte o relógio do computador para o de Brasília (UTC-3)', () => {
    expect(nowWallClock(new Date('2026-09-23T11:00:00.000Z'))).toBe('2026-09-23T08:00:00.000Z')
  })
})

describe('o que o site mostra às 08:00 de Brasília', () => {
  it('publicada sem agendamento está no ar', () => {
    expect(isNewsLive({ status: 'PUBLISHED', publishAt: null }, NOW)).toBe(true)
  })

  it('agendada para as 07:00 já entrou', () => {
    expect(isNewsLive({ status: 'PUBLISHED', publishAt: '2026-09-23T07:00:00.000Z' }, NOW)).toBe(true)
  })

  it('agendada para as 09:00 ainda não aparece', () => {
    expect(isNewsLive({ status: 'PUBLISHED', publishAt: '2026-09-23T09:00:00.000Z' }, NOW)).toBe(false)
    expect(isScheduled('2026-09-23T09:00:00.000Z', NOW)).toBe(true)
  })

  it('no minuto exato do agendamento já está no ar', () => {
    expect(isScheduled(NOW, NOW)).toBe(false)
  })

  it('rascunho nunca aparece', () => {
    expect(isNewsLive({ status: 'UNPUBLISHED', publishAt: null }, NOW)).toBe(false)
  })
})

describe('selo da notícia agendada', () => {
  it('mostra dia e hora marcados', () => {
    expect(scheduleLabel('2026-10-05T08:30:00.000Z')).toBe('Agendada para 05/10/2026 08:30')
  })
})

describe('campos de agendamento', () => {
  it('sem agendamento começa em "publicar agora"', () => {
    expect(scheduleToForm(null)).toEqual({ mode: 'now', date: '', hour: '' })
  })

  it('com agendamento carrega data e hora', () => {
    expect(scheduleToForm('2026-10-05T08:30:00.000Z')).toEqual({
      mode: 'scheduled', date: '2026-10-05', hour: '08:30',
    })
  })

  it('"publicar agora" não pede nada', () => {
    expect(validateSchedule({ mode: 'now', date: '', hour: '' })).toBeNull()
  })

  it('agendar sem data ou sem hora avisa', () => {
    expect(validateSchedule({ mode: 'scheduled', date: '', hour: '08:00' })).toBe('Informe a data da publicação.')
    expect(validateSchedule({ mode: 'scheduled', date: '2026-10-05', hour: '' })).toBe('Informe a hora da publicação.')
  })

  it('agendar completo vira o ISO de parede', () => {
    expect(scheduleToPublishAt({ mode: 'scheduled', date: '2026-10-05', hour: '08:30' }, 'PUBLISHED'))
      .toBe('2026-10-05T08:30:00.000Z')
  })

  it('"publicar agora" manda null (limpa o agendamento)', () => {
    expect(scheduleToPublishAt({ mode: 'now', date: '', hour: '' }, 'PUBLISHED')).toBeNull()
  })

  it('rascunho nunca leva agendamento', () => {
    expect(scheduleToPublishAt({ mode: 'scheduled', date: '2026-10-05', hour: '08:30' }, 'UNPUBLISHED')).toBeNull()
  })
})
