import { describe, it, expect } from 'vitest'
import {
  buildCourseIcs,
  courseDaysLabel,
  courseEventTimes,
  courseShareText,
  googleCalendarUrl,
  icsFileName,
  whatsappShareUrl,
  type CourseEvent,
} from '@/lib/calendar-links'

const ev: CourseEvent = {
  id: 'c1',
  title: 'Operação de Tratores; Nível 1, prática',
  startDate: '2026-08-10',
  endDate: '2026-08-12',
  startTime: '09:00',
  endTime: '17:00',
  location: 'AUDITORIO',
  url: 'https://sindicato.example/cursos/c1',
}

describe('courseEventTimes', () => {
  it('converte a hora de Brasília para UTC e conta os dias', () => {
    const t = courseEventTimes(ev)
    expect(t).toMatchObject({ allDay: false, days: 3 })
    if (t && !t.allDay) {
      expect(t.start.toISOString()).toBe('2026-08-10T12:00:00.000Z')
      expect(t.end.toISOString()).toBe('2026-08-10T20:00:00.000Z')
    }
  })

  it('aula à noite passa da meia-noite em UTC sem errar o dia', () => {
    const t = courseEventTimes({ ...ev, endDate: ev.startDate, startTime: '19:00', endTime: '22:30' })
    if (!t || t.allDay) throw new Error('esperava evento com horário')
    expect(t.start.toISOString()).toBe('2026-08-10T22:00:00.000Z')
    expect(t.end.toISOString()).toBe('2026-08-11T01:30:00.000Z')
    expect(t.days).toBe(1)
  })

  it('sem horário válido vira dia inteiro; data inválida → null', () => {
    const t = courseEventTimes({ ...ev, startTime: '00:00', endTime: '00:00' })
    expect(t).toMatchObject({ allDay: true })
    if (t?.allDay) expect(t.endExclusive.toISOString()).toBe('2026-08-13T00:00:00.000Z')
    expect(courseEventTimes({ ...ev, startDate: '' })).toBeNull()
  })
})

describe('buildCourseIcs', () => {
  it('gera evento diário repetido com horários em UTC e texto escapado', () => {
    const ics = buildCourseIcs(ev, new Date('2026-08-01T10:00:00.000Z'))!
    expect(ics).toContain('DTSTART:20260810T120000Z\r\n')
    expect(ics).toContain('DTEND:20260810T200000Z\r\n')
    expect(ics).toContain('RRULE:FREQ=DAILY;COUNT=3\r\n')
    expect(ics).toContain('SUMMARY:Operação de Tratores\\; Nível 1\\, prática\r\n')
    expect(ics).toContain('LOCATION:AUDITORIO\r\n')
    expect(ics).toContain('DTSTAMP:20260801T100000Z')
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('curso de um dia não repete', () => {
    const ics = buildCourseIcs({ ...ev, endDate: ev.startDate })!
    expect(ics).not.toContain('RRULE')
  })

  it('quebra linhas longas em até 75 bytes', () => {
    const ics = buildCourseIcs({ ...ev, title: 'Ação '.repeat(40) })!
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
  })
})

describe('googleCalendarUrl', () => {
  it('leva datas em UTC, repetição e fuso de São Paulo', () => {
    const url = new URL(googleCalendarUrl(ev)!)
    expect(url.origin).toBe('https://calendar.google.com')
    expect(url.searchParams.get('dates')).toBe('20260810T120000Z/20260810T200000Z')
    expect(url.searchParams.get('recur')).toBe('RRULE:FREQ=DAILY;COUNT=3')
    expect(url.searchParams.get('ctz')).toBe('America/Sao_Paulo')
    expect(url.searchParams.get('text')).toBe(ev.title)
  })
})

describe('compartilhar', () => {
  it('monta o texto só com os dados do curso', () => {
    expect(courseShareText(ev)).toBe(
      [ev.title, 'Data: 10/08/2026 a 12/08/2026', 'Horário: 09:00 às 17:00', 'Local: AUDITORIO', ev.url].join('\n'),
    )
    expect(courseDaysLabel('2026-08-10', '2026-08-10')).toBe('10/08/2026')
  })

  it('link do WhatsApp com o texto codificado', () => {
    const url = whatsappShareUrl(ev)
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(url.slice('https://wa.me/?text='.length))).toBe(courseShareText(ev))
  })

  it('nome do arquivo sem acento', () => {
    expect(icsFileName('Operação de Tratores')).toBe('curso-operacao-de-tratores.ics')
    expect(icsFileName('***')).toBe('curso-agenda.ics')
  })
})
