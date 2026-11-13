import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ can: () => true, isLoading: false }) }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, search, children, className, ...rest }: {
    to: string
    search?: Record<string, string | undefined>
    children: React.ReactNode
    className?: string
  }) => {
    const query = new URLSearchParams(
      Object.entries(search ?? {}).filter((par): par is [string, string] => par[1] !== undefined),
    ).toString()
    return <a href={query ? `${to}?${query}` : to} className={className} {...rest}>{children}</a>
  },
  useNavigate: () => vi.fn(),
}))

const { HelpPage } = await import('@/components/ajuda/HelpPage')

// O celular (e o tablet) mostra uma coisa por vez: o índice, ou o artigo escolhido.
// No computador (lg) os dois ficam lado a lado. Quem esconde é a classe `max-lg:hidden`.
describe('HelpPage', () => {
  it('sem artigo: o índice, sem o "Voltar ao índice"', () => {
    render(<HelpPage onChange={vi.fn()} />)
    const indice = screen.getByRole('navigation', { name: 'Assuntos da ajuda' })
    expect(indice).not.toHaveClass('max-lg:hidden')
    expect(screen.queryByRole('link', { name: /Voltar ao índice/ })).not.toBeInTheDocument()
    // O "escolha um assunto ao lado" só faz sentido com o índice ao lado.
    expect(screen.getByText('Escolha um assunto ao lado').closest('.min-w-0')).toHaveClass('max-lg:hidden')
  })

  it('com artigo: o artigo primeiro no celular, com o "Voltar ao índice" em cima', () => {
    render(<HelpPage topico="financeiro" q="recibo" onChange={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Financeiro' })).toBeInTheDocument()

    const voltar = screen.getByRole('link', { name: /Voltar ao índice/ })
    expect(voltar).toHaveAttribute('href', '/admin/ajuda?q=recibo')
    expect(voltar).toHaveClass('lg:hidden')

    // O índice e a busca saem do caminho no celular; no computador continuam.
    expect(screen.getByRole('navigation', { name: 'Assuntos da ajuda' })).toHaveClass('max-lg:hidden')
    expect(screen.getByRole('textbox', { name: 'Buscar na ajuda' }).parentElement).toHaveClass('max-lg:hidden')
  })

  it('busca sem resultado oferece limpar', () => {
    const onChange = vi.fn()
    render(<HelpPage q="jabuticaba" onChange={onChange} />)
    expect(screen.getByText('Nada encontrado para "jabuticaba"')).toBeInTheDocument()
    // O botão do vazio (o "×" do campo tem o mesmo nome, só no leitor de tela).
    fireEvent.click(screen.getByText('Limpar busca'))
    expect(onChange).toHaveBeenCalledWith({ topico: undefined, q: undefined })
  })
})
