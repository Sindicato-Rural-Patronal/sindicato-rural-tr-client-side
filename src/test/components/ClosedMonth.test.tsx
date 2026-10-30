import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClosedMonthBadge, ClosedMonthNotice, LockedReason } from '@/components/financeiro/ClosedMonth'
import { Button } from '@/components/ui/button'
import { closedMonthMessage } from '@/lib/finance-closed-month'

const MOTIVO = closedMonthMessage('2026-10', 'BANCO')

describe('peças do mês fechado na aba Lançamentos', () => {
  it('selo "Mês fechado" com o motivo no title', () => {
    render(<ClosedMonthBadge reason={MOTIVO} />)
    const selo = screen.getByText('Mês fechado')
    expect(selo).toHaveAttribute('title', 'Mês 10/2026 fechado no caixa BANCO. Para mudar, reabra o mês na aba Fechamento.')
  })

  it('aviso do formulário mostra o texto inteiro e serve de descrição do campo de data', () => {
    render(<ClosedMonthNotice id="aviso" reason={MOTIVO} />)
    const aviso = screen.getByRole('status')
    expect(aviso).toHaveAttribute('id', 'aviso')
    expect(aviso).toHaveTextContent(MOTIVO)
  })

  it('botão travado: desligado, e o motivo fica no invólucro (o Button desligado não recebe o mouse)', () => {
    render(
      <LockedReason reason={MOTIVO}>
        <Button disabled aria-label="Editar" title="Editar">x</Button>
      </LockedReason>,
    )
    const botao = screen.getByRole('button', { name: 'Editar' })
    expect(botao).toBeDisabled()
    expect(botao.parentElement).toHaveAttribute('title', MOTIVO)
  })

  it('sem motivo, não embrulha nada', () => {
    const { container } = render(
      <LockedReason reason={null}>
        <Button aria-label="Editar">x</Button>
      </LockedReason>,
    )
    expect(container.firstElementChild?.tagName).toBe('BUTTON')
    expect(screen.getByRole('button', { name: 'Editar' })).toBeEnabled()
  })
})
