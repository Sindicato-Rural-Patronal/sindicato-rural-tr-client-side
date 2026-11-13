import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GraduationCap } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

describe('EmptyState', () => {
  it('renderiza title e description', () => {
    render(
      <EmptyState
        icon={GraduationCap}
        title="Nenhum curso encontrado"
        description="Crie o primeiro curso"
      />
    )
    expect(screen.getByText('Nenhum curso encontrado')).toBeInTheDocument()
    expect(screen.getByText('Crie o primeiro curso')).toBeInTheDocument()
  })

  it('renderiza sem description', () => {
    render(<EmptyState icon={GraduationCap} title="Vazio" />)
    expect(screen.getByText('Vazio')).toBeInTheDocument()
  })

  it('renderiza action quando fornecido', () => {
    render(
      <EmptyState
        icon={GraduationCap}
        title="Vazio"
        action={<button>Criar</button>}
      />
    )
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument()
  })

  it('não renderiza action quando omitido', () => {
    render(<EmptyState icon={GraduationCap} title="Vazio" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('EmptyState: a caixa', () => {
  it('sem `framed` não desenha borda (vai dentro de cartão, tabela ou painel)', () => {
    const { container } = render(<EmptyState icon={GraduationCap} title="Vazio" />)
    expect(container.firstChild).not.toHaveClass('border')
  })

  it('com `framed` vira um cartão com a linha fina, nunca tracejado', () => {
    const { container } = render(<EmptyState icon={GraduationCap} title="Vazio" framed />)
    expect(container.firstChild).toHaveClass('border', 'rounded-xl', 'bg-card')
    expect(container.firstChild).not.toHaveClass('border-dashed')
  })
})
