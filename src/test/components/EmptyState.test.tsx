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
