import { describe, it, expect } from 'vitest'
import {
  COURSE_VIEWS,
  COURSE_VIEW_LABEL,
  courseViewFromSlug,
  courseViewToSlug,
  emptyCoursesCopy,
  parseCourseViewSlug,
} from '@/lib/course-views'

// Abas "Próximos" e "Armazenados" da lista de cursos do painel (?lista= na URL).

describe('abas da lista de cursos', () => {
  it('são duas, com o nome que o Sindicato usa', () => {
    expect([...COURSE_VIEWS]).toEqual(['upcoming', 'stored'])
    expect(COURSE_VIEW_LABEL).toEqual({ upcoming: 'Próximos', stored: 'Armazenados' })
  })

  it('sem ?lista= (ou com valor desconhecido) abre em Próximos', () => {
    expect(courseViewFromSlug(undefined)).toBe('upcoming')
    expect(courseViewFromSlug('proximos')).toBe('upcoming')
    expect(courseViewFromSlug('qualquer-coisa')).toBe('upcoming')
    expect(courseViewFromSlug(42)).toBe('upcoming')
  })

  it('?lista=armazenados abre em Armazenados', () => {
    expect(courseViewFromSlug('armazenados')).toBe('stored')
  })

  it('a aba padrão não precisa aparecer na URL; Armazenados aparece', () => {
    expect(courseViewToSlug('upcoming')).toBeUndefined()
    expect(courseViewToSlug('stored')).toBe('armazenados')
  })

  it('ida e volta: o que vai para a URL volta como a mesma aba', () => {
    for (const view of COURSE_VIEWS) {
      expect(courseViewFromSlug(courseViewToSlug(view))).toBe(view)
    }
  })

  it('a URL só aceita os dois valores conhecidos', () => {
    expect(parseCourseViewSlug('proximos')).toBe('proximos')
    expect(parseCourseViewSlug('armazenados')).toBe('armazenados')
    expect(parseCourseViewSlug('upcoming')).toBeUndefined()
    expect(parseCourseViewSlug('')).toBeUndefined()
    expect(parseCourseViewSlug(undefined)).toBeUndefined()
  })

  it('lista vazia: o texto diz qual aba está vazia e para onde o curso vai', () => {
    expect(emptyCoursesCopy('upcoming').title).toBe('Nenhum curso próximo')
    expect(emptyCoursesCopy('upcoming').description).toContain('Armazenados')
    expect(emptyCoursesCopy('stored').title).toBe('Nenhum curso armazenado')
    expect(emptyCoursesCopy('stored').description).toContain('Próximos')
  })
})
