import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { PublicFooter } from '@/components/public-footer'
import { WhatsAppFloatingButton } from '@/components/WhatsAppFloatingButton'

// t() devolve a própria chave.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

const RESERVA_EMAIL = 'contato@sindicatoruraltr.com.br'
const RESERVA_HORARIO = 'Segunda a Sexta'

const CADASTRADO = {
  facebook: '', instagram: '', whatsapp: '(44) 99999-0000',
  orgPhone: '(44) 3000-1111', orgEmail: 'secretaria@exemplo.org.br',
  orgStreet: 'Rua Nova, 10', orgDistrict: 'Centro', orgCity: 'Terra Roxa', orgState: 'PR', orgZip: '85990-000',
  orgHours: 'Terça a Quinta: 09h às 15h', orgMapQuery: '', aboutText: '', quotesSource: '',
}

// Mesma estrutura do layout público: rodapé e botão do WhatsApp em volta do Outlet.
function renderAt(path: string) {
  const root = createRootRoute({
    component: () => (
      <div>
        <Outlet />
        <PublicFooter />
        <WhatsAppFloatingButton />
      </div>
    ),
  })
  const noticias = createRoute({ getParentRoute: () => root, path: 'noticias', component: () => <p>lista de notícias</p> })
  const home = createRoute({ getParentRoute: () => root, path: '/', component: () => <p>home</p> })
  const cursos = createRoute({ getParentRoute: () => root, path: 'cursos', component: () => <Outlet /> })
  const curso = createRoute({ getParentRoute: () => cursos, path: '$id', component: () => <p>curso</p> })
  const router = createRouter({
    routeTree: root.addChildren([home, noticias, cursos.addChildren([curso])]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('rodapé público: contato cadastrado', () => {
  it('em /noticias mostra o contato cadastrado, nunca o valor antigo fixo', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(CADASTRADO), { status: 200 }))))
    renderAt('/noticias')
    expect(await screen.findByText(CADASTRADO.orgEmail)).toBeInTheDocument()
    expect(screen.getByText(CADASTRADO.orgPhone)).toBeInTheDocument()
    expect(screen.getByText(/Terça a Quinta/)).toBeInTheDocument()
    expect(screen.queryByText(RESERVA_EMAIL)).not.toBeInTheDocument()
    expect(screen.queryByText(new RegExp(RESERVA_HORARIO))).not.toBeInTheDocument()
  })

  it('enquanto as configurações carregam, não mostra e-mail nem horário inventados', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderAt('/noticias')
    expect(screen.queryByText(RESERVA_EMAIL)).not.toBeInTheDocument()
    expect(screen.queryByText(new RegExp(RESERVA_HORARIO))).not.toBeInTheDocument()
    expect(screen.queryByText('(44) 3645-2199')).not.toBeInTheDocument()
  })

  it('se a API falhar, esconde os campos em vez de mostrar valores fixos', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}', { status: 429 })))
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/noticias')
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await screen.findByText('footer.contact')
    expect(screen.queryByText(RESERVA_EMAIL)).not.toBeInTheDocument()
    expect(screen.queryByText(new RegExp(RESERVA_HORARIO))).not.toBeInTheDocument()
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull()
  })
})

describe('botão flutuante do WhatsApp', () => {
  const settings = () => vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(CADASTRADO), { status: 200 }))))

  it('na página do curso fica oculto no celular (a barra "Inscrever-se" ocupa o pé da tela)', async () => {
    settings()
    renderAt('/cursos/abc-123')
    const link = await screen.findByLabelText('WhatsApp', { selector: 'a.fixed' })
    expect(link.className).toContain('max-lg:hidden')
  })

  it('nas outras páginas aparece sempre', async () => {
    settings()
    renderAt('/noticias')
    const link = await screen.findByLabelText('WhatsApp', { selector: 'a.fixed' })
    expect(link.className).not.toContain('max-lg:hidden')
  })
})
