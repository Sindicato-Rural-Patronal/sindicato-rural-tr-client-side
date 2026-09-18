import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PasswordStrengthHint } from '@/components/PasswordStrengthHint'

describe('PasswordStrengthHint', () => {
  it('não mostra nada com o campo vazio', () => {
    const { container } = render(<PasswordStrengthHint password="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra o rótulo da força e avisa leitores de tela', () => {
    render(<PasswordStrengthHint password="Vr7$mLpz@Kq4Tb1x" />)
    expect(screen.getAllByText(/Forte/).length).toBeGreaterThan(0)
    const live = document.querySelector('[aria-live="polite"]')
    expect(live).not.toBeNull()
  })

  it('mostra no máximo duas dicas', () => {
    render(<PasswordStrengthHint password="senha123" context={{ username: 'senha123' }} />)
    expect(screen.getAllByText(/Muito fraca/).length).toBeGreaterThan(0)
    const tips = screen.getAllByText(/^(Use|Evite|Misture|Não use)/)
    expect(tips.length).toBeLessThanOrEqual(2)
  })

  it('aceita limitar o número de dicas', () => {
    render(<PasswordStrengthHint password="abc" maxTips={1} />)
    expect(screen.getAllByText(/^(Use|Evite|Misture|Não use)/).length).toBe(1)
  })
})
