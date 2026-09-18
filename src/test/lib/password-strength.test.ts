import { describe, it, expect } from 'vitest'
import {
  passwordStrength,
  hasSequence,
  isCommonPassword,
  usesContext,
} from '@/lib/password-strength'

describe('passwordStrength — tamanho', () => {
  it('senha vazia: nota 0 e dicas de partida', () => {
    const r = passwordStrength('')
    expect(r.score).toBe(0)
    expect(r.label).toBe('Muito fraca')
    expect(r.tips.length).toBeGreaterThan(0)
  })

  it('curta demais sugere pelo menos 8 caracteres', () => {
    expect(passwordStrength('Ab3$').tips).toContain('Use pelo menos 8 caracteres')
  })

  it('entre 8 e 11 sugere chegar a 12', () => {
    expect(passwordStrength('Ab3$xkQz').tips).toContain('Use pelo menos 12 caracteres')
  })

  it('mais longa com todas as classes chega à nota máxima', () => {
    const r = passwordStrength('Vr7$mLpz@Kq4Tb1x')
    expect(r.score).toBe(4)
    expect(r.label).toBe('Forte')
  })

  it('senha longa e variada sem 16 caracteres fica "Boa"', () => {
    const r = passwordStrength('Vr7$mLpzKq4')
    expect(r.score).toBe(3)
    expect(r.label).toBe('Boa')
  })
})

describe('passwordStrength — variedade de caracteres', () => {
  it('só letras minúsculas rende nota baixa e dica de misturar', () => {
    const r = passwordStrength('mkvzptrwbqx')
    expect(r.score).toBeLessThanOrEqual(2)
    expect(r.tips.some(t => t.includes('Misture'))).toBe(true)
  })

  it('só números avisa para não usar só números', () => {
    expect(passwordStrength('849205718340').tips).toContain('Não use só números')
  })
})

describe('hasSequence', () => {
  it('reconhece sequências de números, alfabeto e teclado', () => {
    expect(hasSequence('123456')).toBe(true)
    expect(hasSequence('xxabcdefxx')).toBe(true)
    expect(hasSequence('Qwerty!9')).toBe(true)
    expect(hasSequence('654321')).toBe(true)
    expect(hasSequence('aaaa11')).toBe(true)
  })

  it('não acusa senha sem sequência', () => {
    expect(hasSequence('Vr7$mLpz')).toBe(false)
  })

  it('senha com sequência não passa de "Fraca"', () => {
    const r = passwordStrength('Abcdef@123456')
    expect(r.score).toBeLessThanOrEqual(1)
    expect(r.tips.some(t => t.includes('sequências'))).toBe(true)
  })
})

describe('isCommonPassword', () => {
  it('reconhece senhas da lista, com ou sem número no fim', () => {
    expect(isCommonPassword('senha123')).toBe(true)
    expect(isCommonPassword('123456')).toBe(true)
    expect(isCommonPassword('Sindicato')).toBe(true)
    expect(isCommonPassword('TerraRoxa2026')).toBe(true)
  })

  it('não acusa senha inventada', () => {
    expect(isCommonPassword('Vr7$mLpz@Kq4')).toBe(false)
  })

  it('senha comum zera a nota', () => {
    const r = passwordStrength('Sindicato2026!')
    expect(r.score).toBe(0)
    expect(r.tips.some(t => t.includes('senhas comuns'))).toBe(true)
  })
})

describe('usesContext — nome e usuário', () => {
  it('acusa a senha que repete o usuário', () => {
    expect(usesContext('joao.silva2026', { username: 'joao.silva' })).toBe('username')
  })

  it('acusa a senha que repete um pedaço do nome', () => {
    expect(usesContext('Eduardo@2026', { name: 'EDUARDO FRANK' })).toBe('name')
  })

  it('ignora acentos e maiúsculas', () => {
    expect(usesContext('JOAO@2026xyz', { name: 'João Pereira' })).toBe('name')
  })

  it('sem contexto não acusa nada', () => {
    expect(usesContext('Vr7$mLpz@Kq4')).toBeNull()
  })

  it('senha com o usuário não passa de "Fraca" e ganha a dica', () => {
    const r = passwordStrength('Vrsilva$Kq4x1', { username: 'vrsilva' })
    expect(r.score).toBeLessThanOrEqual(1)
    expect(r.tips).toContain('Evite o seu nome de usuário')
  })

  it('senha com o nome ganha a dica correspondente', () => {
    expect(passwordStrength('Eduardo$Kq4x1', { name: 'EDUARDO FRANK' }).tips)
      .toContain('Evite o seu nome')
  })
})
