import { describe, it, expect } from 'vitest'
import { slugify, toParagraphs, SLUG_PATTERN } from '@/lib/convenio-utils'

describe('slugify', () => {
  it('gera endereço minúsculo, sem acento e com hífens', () => {
    expect(slugify('Odonto Sul Paraná')).toBe('odonto-sul-parana')
    expect(slugify('  Unimed  ')).toBe('unimed')
    expect(slugify('Plano / Saúde & Vida!')).toBe('plano-saude-vida')
  })

  it('sempre produz algo aceito pelo backend (ou vazio)', () => {
    for (const v of ['Unimed', 'Farmácia São João', '--a--b--', 'ÁÉÍÓÚ 123', 'x'.repeat(80) + ' fim']) {
      const s = slugify(v)
      expect(s.length).toBeLessThanOrEqual(60)
      expect(SLUG_PATTERN.test(s)).toBe(true)
    }
    expect(slugify('!!!')).toBe('')
  })

  it('não termina em hífen quando corta no limite', () => {
    const s = slugify('a'.repeat(59) + ' bcd')
    expect(s.endsWith('-')).toBe(false)
  })
})

describe('toParagraphs', () => {
  it('separa por linha em branco e ignora vazios', () => {
    expect(toParagraphs('Primeiro.\n\nSegundo.\n  \n\nTerceiro.')).toEqual(['Primeiro.', 'Segundo.', 'Terceiro.'])
  })

  it('mantém quebra simples dentro do parágrafo', () => {
    expect(toParagraphs('linha 1\nlinha 2')).toEqual(['linha 1\nlinha 2'])
  })

  it('nulo ou vazio vira lista vazia', () => {
    expect(toParagraphs(null)).toEqual([])
    expect(toParagraphs('   ')).toEqual([])
  })
})
