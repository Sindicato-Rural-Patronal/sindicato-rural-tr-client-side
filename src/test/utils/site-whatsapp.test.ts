import { describe, it, expect } from 'vitest'
import { siteWhatsappHref, isCourseDetailPath } from '@/lib/site-whatsapp'

describe('siteWhatsappHref', () => {
  it('link pronto fica como está (sem esquema ganha https)', () => {
    expect(siteWhatsappHref('https://wa.me/5544999990000')).toBe('https://wa.me/5544999990000')
    expect(siteWhatsappHref(' wa.me/5544999990000 ')).toBe('https://wa.me/5544999990000')
  })

  it('número solto (cadastro antigo) vira link do wa.me', () => {
    expect(siteWhatsappHref('44999990000')).toBe('https://wa.me/5544999990000')
    expect(siteWhatsappHref('(44) 99999-0000')).toBe('https://wa.me/5544999990000')
    expect(siteWhatsappHref('+55 44 99999-0000')).toBe('https://wa.me/5544999990000')
  })

  it('vazio, número incompleto ou esquema perigoso → null', () => {
    expect(siteWhatsappHref('')).toBeNull()
    expect(siteWhatsappHref(undefined)).toBeNull()
    expect(siteWhatsappHref('9999-0000')).toBeNull()
    expect(siteWhatsappHref('javascript:alert(1)')).toBeNull()
  })
})

describe('isCourseDetailPath', () => {
  it('só o detalhe do curso', () => {
    expect(isCourseDetailPath('/cursos/abc-123')).toBe(true)
    expect(isCourseDetailPath('/cursos/abc-123/')).toBe(true)
    expect(isCourseDetailPath('/cursos')).toBe(false)
    expect(isCourseDetailPath('/cursos/')).toBe(false)
    expect(isCourseDetailPath('/noticias/abc')).toBe(false)
  })
})
