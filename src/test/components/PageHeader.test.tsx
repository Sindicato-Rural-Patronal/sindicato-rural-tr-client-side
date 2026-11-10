import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { FilterBar, FilterField } from '@/components/FilterBar'

describe('PageHeader', () => {
  it('título como h1, descrição, a vaga do "?" ao lado do título e as ações', () => {
    render(
      <PageHeader
        title="Banners"
        description="Gerencie os banners exibidos na página inicial"
        help={<a href="/admin/ajuda" aria-label="Ajuda sobre Banners">?</a>}
        actions={<button type="button">Novo banner</button>}
      />,
    )
    const titulo = screen.getByRole('heading', { level: 1, name: 'Banners' })
    expect(titulo.parentElement).toContainElement(screen.getByRole('link', { name: 'Ajuda sobre Banners' }))
    expect(screen.getByText('Gerencie os banners exibidos na página inicial')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo banner' })).toBeInTheDocument()
  })

  it('sem descrição nem ações, só o título', () => {
    const { container } = render(<PageHeader title="Auditoria" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Auditoria' })).toBeInTheDocument()
    expect(container.querySelectorAll('p')).toHaveLength(0)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('PageContainer aplica o espaçamento padrão e aceita classes a mais', () => {
    render(<PageContainer data-testid="pagina" className="max-w-5xl">conteúdo</PageContainer>)
    const pagina = screen.getByTestId('pagina')
    expect(pagina).toHaveClass('p-4', 'md:p-6', 'gap-6', 'max-w-5xl')
    expect(pagina).not.toHaveClass('max-w-[1600px]')
  })
})

describe('FilterBar', () => {
  it('filtros e ações em blocos separados; o rótulo do FilterField aponta para o campo', () => {
    render(
      <FilterBar actions={<button type="button">Exportar</button>}>
        <FilterField label="Tipo" htmlFor="f-tipo">
          <select id="f-tipo"><option>Todos</option></select>
        </FilterField>
      </FilterBar>,
    )
    expect(screen.getByLabelText('Tipo')).toHaveAttribute('id', 'f-tipo')
    const exportar = screen.getByRole('button', { name: 'Exportar' })
    expect(exportar.parentElement).not.toContainElement(screen.getByLabelText('Tipo'))
  })
})
