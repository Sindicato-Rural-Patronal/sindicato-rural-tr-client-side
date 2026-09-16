import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ConvenioPageView, type ConvenioView } from '@/components/convenio/ConvenioPageView'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  }
})

const unimed: ConvenioView = {
  name: 'Unimed',
  title: 'Tabela de valores / Unimed',
  subtitle: 'Sindicato Rural de Terra Roxa - PR',
  intro: null,
  logoUrl: null,
  priceLabelHeader: 'Faixa etária',
  priceValueHeader: 'Valor sindicato',
  priceRows: [
    { label: '0 a 18 anos', priceCents: 31713 },
    { label: 'acima de 59 anos', priceCents: 188925 },
  ],
  priceNote: 'Valores mensais por beneficiário.',
  documentsTitle: 'Documentos para adesão',
  documents: ['RG', 'CPF'],
  highlightsTitle: 'Estrutura Unimed',
  highlights: ['116 mil médicos cooperados'],
  aboutTitle: 'Medicina humana',
  aboutText: 'Primeiro parágrafo.\n\nSegundo parágrafo.',
}

// Intl coloca espaço não separável entre "R$" e o número.
const normalize = (s: string | null) => (s ?? '').replace(/\s+/g, ' ')

describe('ConvenioPageView', () => {
  it('mostra cabeçalho, tabela com valores em reais e observação', () => {
    render(<ConvenioPageView convenio={unimed} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Tabela de valores / Unimed' })).toBeInTheDocument()
    expect(screen.getByText('Sindicato Rural de Terra Roxa - PR')).toBeInTheDocument()

    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Faixa etária' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Valor sindicato' })).toBeInTheDocument()
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    const cells = (row: HTMLElement) => within(row).getAllByRole('cell').map(c => normalize(c.textContent))
    expect(cells(rows[0])).toEqual(['0 a 18 anos', 'R$ 317,13'])
    expect(cells(rows[1])).toEqual(['acima de 59 anos', 'R$ 1.889,25'])
    expect(screen.getByText('Valores mensais por beneficiário.')).toBeInTheDocument()
  })

  it('mostra documentos, destaques, texto em parágrafos e a chamada de contato', () => {
    render(<ConvenioPageView convenio={unimed} />)
    expect(screen.getByRole('heading', { name: 'Documentos para adesão' })).toBeInTheDocument()
    expect(screen.getByText('RG')).toBeInTheDocument()
    expect(screen.getByText('116 mil médicos cooperados')).toBeInTheDocument()
    expect(screen.getByText('Primeiro parágrafo.')).toBeInTheDocument()
    expect(screen.getByText('Segundo parágrafo.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Fale conosco/ })).toHaveAttribute('href', '/contato')
  })

  it('esconde seções vazias', () => {
    render(
      <ConvenioPageView
        convenio={{ ...unimed, priceRows: [], priceNote: null, documents: [], highlights: [], aboutTitle: null, aboutText: null }}
      />,
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Documentos para adesão' })).not.toBeInTheDocument()
    expect(screen.queryByText('Estrutura Unimed')).not.toBeInTheDocument()
    // Cabeçalho e chamada continuam
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/Quer aderir ao convênio Unimed/)).toBeInTheDocument()
  })

  it('mostra o logo quando existe', () => {
    render(<ConvenioPageView convenio={{ ...unimed, logoUrl: 'https://exemplo/logo.png' }} />)
    expect(screen.getByAltText('Logo Unimed')).toHaveAttribute('src', 'https://exemplo/logo.png')
  })
})
