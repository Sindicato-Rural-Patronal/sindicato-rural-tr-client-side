import { describe, it, expect, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { AjudaLink } from '@/components/ajuda/AjudaLink'

// O "?" das telas. Com o roteador de verdade, para conferir que `novaAba`
// deixa a tela onde está (o Link do roteador não navega com target="_blank").

/** Uma tela com algo feito e não salvo, para ver se sobrevive ao clique. */
function Tela({ novaAba }: { novaAba?: boolean }) {
  const [colunas, setColunas] = useState(0)
  return (
    <div>
      <button type="button" onClick={() => setColunas(n => n + 1)}>Pôr coluna</button>
      <p>Colunas: {colunas}</p>
      <AjudaLink topico="montar-relatorio" titulo="Montar relatório" novaAba={novaAba} />
    </div>
  )
}

function renderTela(novaAba?: boolean) {
  const root = createRootRoute({ component: () => <Outlet /> })
  const tela = createRoute({ getParentRoute: () => root, path: '/', component: () => <Tela novaAba={novaAba} /> })
  const ajuda = createRoute({ getParentRoute: () => root, path: 'admin/ajuda', component: () => <p>Central de Ajuda</p> })
  const router = createRouter({
    routeTree: root.addChildren([tela, ajuda]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  render(<RouterProvider router={router} />)
  return router
}

// O jsdom não abre abas nem navega: o clique que chega ao fim sem ninguém
// tratar é cancelado aqui, DEPOIS do roteador (que escuta na raiz do React).
const semNavegacaoDoJsdom = (e: MouseEvent) => e.preventDefault()
afterEach(() => window.removeEventListener('click', semNavegacaoDoJsdom))

describe('AjudaLink', () => {
  it('sem novaAba: abre o artigo na mesma aba, pelo roteador', async () => {
    const router = renderTela()
    const link = await screen.findByRole('link', { name: 'Ajuda sobre Montar relatório' })
    expect(link).toHaveAttribute('href', '/admin/ajuda?topico=montar-relatorio')
    expect(link).not.toHaveAttribute('target')
    expect(link).toHaveAttribute('title', 'Como usar esta tela')

    await userEvent.click(link)
    expect(await screen.findByText('Central de Ajuda')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/ajuda')
  })

  it('com novaAba: outra aba, rótulo diz isso e a tela fica como estava', async () => {
    const router = renderTela(true)
    const link = await screen.findByRole('link', { name: 'Ajuda sobre Montar relatório (abre em outra aba)' })
    expect(link).toHaveAttribute('href', '/admin/ajuda?topico=montar-relatorio')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAttribute('title', 'Como usar esta tela (abre em outra aba)')

    await userEvent.click(screen.getByRole('button', { name: 'Pôr coluna' }))
    window.addEventListener('click', semNavegacaoDoJsdom)
    await userEvent.click(link)
    expect(router.state.location.pathname).toBe('/')
    expect(screen.getByText('Colunas: 1')).toBeInTheDocument()
    expect(screen.queryByText('Central de Ajuda')).not.toBeInTheDocument()
  })
})
