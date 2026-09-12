import { describe, it, expect } from 'vitest'
import { safeUrl } from '@/utils/safe-url'

describe('safeUrl', () => {
  it('bloqueia javascript: e data: (XSS)', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('#')
    expect(safeUrl('JavaScript:alert(1)')).toBe('#')
    expect(safeUrl('data:text/html,<script>')).toBe('#')
    expect(safeUrl('vbscript:msgbox(1)')).toBe('#')
  })

  it('permite http(s), mailto, tel', () => {
    expect(safeUrl('https://exemplo.com')).toBe('https://exemplo.com')
    expect(safeUrl('http://exemplo.com')).toBe('http://exemplo.com')
    expect(safeUrl('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(safeUrl('tel:+5544999999999')).toBe('tel:+5544999999999')
  })

  it('permite caminhos relativos', () => {
    expect(safeUrl('/cursos')).toBe('/cursos')
    expect(safeUrl('#secao')).toBe('#secao')
  })

  it('assume https para domínio sem esquema', () => {
    expect(safeUrl('exemplo.com.br/pagina')).toBe('https://exemplo.com.br/pagina')
  })

  it('vazio/nulo → #', () => {
    expect(safeUrl('')).toBe('#')
    expect(safeUrl(null)).toBe('#')
    expect(safeUrl(undefined)).toBe('#')
  })
})
