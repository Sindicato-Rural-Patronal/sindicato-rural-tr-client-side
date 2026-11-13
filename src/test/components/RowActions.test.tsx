import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Copy, Pencil, Receipt, Repeat, Trash2 } from 'lucide-react'
import { RowActions, type RowAction } from '@/components/RowActions'
import { TooltipProvider } from '@/components/ui/tooltip'

function renderActions(actions: RowAction[], visible?: number) {
  return render(
    <TooltipProvider>
      <RowActions label="Ações do lançamento Nº 215" actions={actions} visible={visible} />
    </TooltipProvider>,
  )
}

const noop = () => {}

describe('RowActions', () => {
  it('as duas primeiras ficam à vista e o resto vai para o menu "Mais"', () => {
    renderActions([
      { label: 'Editar', icon: Pencil, onClick: noop },
      { label: 'Repetir', icon: Repeat, onClick: noop },
      { label: 'Nota de Empenho', icon: Receipt, onClick: noop },
      { label: 'Excluir', icon: Trash2, onClick: noop, destructive: true },
    ])
    expect(screen.getByRole('group', { name: 'Ações do lançamento Nº 215' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Repetir' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mais ações' })).toBeInTheDocument()
  })

  it('sobrando uma ação só, ela fica à vista em vez de um menu de um item', () => {
    renderActions([
      { label: 'Editar', icon: Pencil, onClick: noop },
      { label: 'Duplicar', icon: Copy, onClick: noop },
      { label: 'Excluir', icon: Trash2, onClick: noop, destructive: true },
    ])
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mais ações' })).not.toBeInTheDocument()
  })

  it('ação oculta (sem permissão) não aparece nem conta para as duas à vista', () => {
    renderActions([
      { label: 'Editar', icon: Pencil, onClick: noop, hidden: true },
      { label: 'Repetir', icon: Repeat, onClick: noop },
      { label: 'Excluir', icon: Trash2, onClick: noop, destructive: true },
    ])
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Repetir' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument()
  })

  it('sem nenhuma ação visível não desenha nada', () => {
    const { container } = renderActions([{ label: 'Editar', icon: Pencil, onClick: noop, hidden: true }])
    expect(container).toBeEmptyDOMElement()
  })

  it('clicar chama a ação; desligada ou trabalhando não chama', () => {
    const editar = vi.fn()
    const nota = vi.fn()
    renderActions([
      { label: 'Editar', icon: Pencil, onClick: editar, disabled: true, reason: 'Mês 10/2026 fechado no caixa BANCO.' },
      { label: 'Nota de Empenho', icon: Receipt, onClick: nota, busy: true },
    ])
    const botaoEditar = screen.getByRole('button', { name: 'Editar' })
    expect(botaoEditar).toBeDisabled()
    fireEvent.click(botaoEditar)
    expect(editar).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Nota de Empenho' })).toBeDisabled()
  })

  it('`visible` muda quantas ficam à vista', () => {
    const repetir = vi.fn()
    renderActions([
      { label: 'Repetir', icon: Repeat, onClick: repetir },
      { label: 'Editar', icon: Pencil, onClick: noop },
      { label: 'Excluir', icon: Trash2, onClick: noop, destructive: true },
    ], 1)
    fireEvent.click(screen.getByRole('button', { name: 'Repetir' }))
    expect(repetir).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mais ações' })).toBeInTheDocument()
  })
})
