import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isAdminPath, isDarkMode, readStoredTheme, saveTheme, syncTheme } from '@/lib/theme'

// Cinza e Verde-claro (fundo fosco) só existem no painel: o atributo data-painel
// liga as cores novas e some fora dele; o site público fica claro.

const root = document.documentElement

beforeEach(() => {
  localStorage.clear()
  root.classList.remove('dark')
  root.removeAttribute('data-painel')
})

describe('readStoredTheme', () => {
  it('sem nada salvo ou com valor desconhecido segue o sistema', () => {
    expect(readStoredTheme()).toBe('system')
    localStorage.setItem('theme', 'azul')
    expect(readStoredTheme()).toBe('system')
  })

  it('lê os cinco temas', () => {
    for (const m of ['light', 'dark', 'system', 'gray', 'green'] as const) {
      localStorage.setItem('theme', m)
      expect(readStoredTheme()).toBe(m)
    }
  })
})

describe('isDarkMode', () => {
  it('só escuro com "dark" ou com "sistema" no escuro', () => {
    expect(isDarkMode('dark', false)).toBe(true)
    expect(isDarkMode('system', true)).toBe(true)
    expect(isDarkMode('system', false)).toBe(false)
    expect(isDarkMode('light', true)).toBe(false)
  })

  it('Cinza e Verde-claro são claros mesmo com o sistema no escuro', () => {
    expect(isDarkMode('gray', true)).toBe(false)
    expect(isDarkMode('green', true)).toBe(false)
  })
})

describe('isAdminPath', () => {
  it('reconhece só o painel', () => {
    expect(isAdminPath('/admin')).toBe(true)
    expect(isAdminPath('/admin/financeiro')).toBe(true)
    expect(isAdminPath('/')).toBe(false)
    expect(isAdminPath('/cursos/1')).toBe(false)
    expect(isAdminPath('/administracao')).toBe(false)
  })
})

describe('syncTheme', () => {
  it('no painel, Cinza e Verde-claro ligam o data-painel', () => {
    localStorage.setItem('theme', 'gray')
    syncTheme(true)
    expect(root.getAttribute('data-painel')).toBe('cinza')
    localStorage.setItem('theme', 'green')
    syncTheme(true)
    expect(root.getAttribute('data-painel')).toBe('verde')
    expect(root.classList.contains('dark')).toBe(false)
  })

  it('fora do painel o tema salvo não pinta o site público', () => {
    localStorage.setItem('theme', 'green')
    syncTheme(true)
    syncTheme(false)
    expect(root.hasAttribute('data-painel')).toBe(false)
  })

  it('claro, escuro e sistema não usam o data-painel', () => {
    localStorage.setItem('theme', 'dark')
    syncTheme(true)
    expect(root.hasAttribute('data-painel')).toBe(false)
    expect(root.classList.contains('dark')).toBe(true)
    localStorage.setItem('theme', 'light')
    syncTheme(true)
    expect(root.classList.contains('dark')).toBe(false)
  })

  it('trocar de Cinza para Escuro tira o atributo', () => {
    localStorage.setItem('theme', 'gray')
    syncTheme(true)
    localStorage.setItem('theme', 'dark')
    syncTheme(true)
    expect(root.hasAttribute('data-painel')).toBe(false)
  })
})

describe('saveTheme', () => {
  it('guarda no navegador, aplica e avisa os seletores', () => {
    const ouvinte = vi.fn()
    window.addEventListener('themechange', ouvinte)
    saveTheme('gray')
    window.removeEventListener('themechange', ouvinte)
    expect(localStorage.getItem('theme')).toBe('gray')
    expect(root.getAttribute('data-painel')).toBe('cinza')
    expect(ouvinte).toHaveBeenCalledTimes(1)
  })
})
