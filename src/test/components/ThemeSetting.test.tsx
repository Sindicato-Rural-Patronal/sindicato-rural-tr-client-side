import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeSetting } from '@/components/ThemeSetting'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  document.documentElement.removeAttribute('data-painel')
})

describe('ThemeSetting', () => {
  it('mostra os cinco temas, com "Sistema" marcado quando nada foi escolhido', () => {
    render(<ThemeSetting />)
    for (const nome of ['Claro', 'Escuro', 'Sistema', 'Cinza', 'Verde-claro']) {
      expect(screen.getByRole('button', { name: nome })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Sistema' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('escolher Cinza guarda no navegador e liga o fundo do painel', () => {
    render(<ThemeSetting />)
    fireEvent.click(screen.getByRole('button', { name: 'Cinza' }))
    expect(localStorage.getItem('theme')).toBe('gray')
    expect(document.documentElement.getAttribute('data-painel')).toBe('cinza')
    expect(screen.getByRole('button', { name: 'Cinza' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Sistema' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('escolher Verde-claro e depois Escuro troca o atributo pela classe dark', () => {
    render(<ThemeSetting />)
    fireEvent.click(screen.getByRole('button', { name: 'Verde-claro' }))
    expect(document.documentElement.getAttribute('data-painel')).toBe('verde')
    fireEvent.click(screen.getByRole('button', { name: 'Escuro' }))
    expect(document.documentElement.hasAttribute('data-painel')).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('volta marcado com o tema que estava salvo', () => {
    localStorage.setItem('theme', 'green')
    render(<ThemeSetting />)
    expect(screen.getByRole('button', { name: 'Verde-claro' })).toHaveAttribute('aria-pressed', 'true')
  })
})
