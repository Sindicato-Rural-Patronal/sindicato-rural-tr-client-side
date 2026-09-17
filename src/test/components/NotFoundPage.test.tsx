import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router'

// t() devolve a própria chave: dá para conferir qual texto/link apareceu.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

// Mesma forma da árvore de arquivos: layouts sem caminho /_public e /_admin.
function renderAt(path: string) {
  const root = createRootRoute({ component: () => <Outlet /> })
  const pub = createRoute({ getParentRoute: () => root, id: '_public', component: () => <div data-testid="public-layout"><Outlet /></div> })
  const home = createRoute({ getParentRoute: () => pub, path: '/', component: () => <p>home</p> })
  const cursos = createRoute({ getParentRoute: () => pub, path: 'cursos', component: () => <Outlet /> })
  const curso = createRoute({ getParentRoute: () => cursos, path: '$id', component: () => <p>curso</p> })
  const adm = createRoute({ getParentRoute: () => root, id: '_admin', component: () => <div data-testid="admin-layout"><Outlet /></div> })
  const admCursos = createRoute({ getParentRoute: () => adm, path: 'admin/cursos', component: () => <Outlet /> })
  const admCursosIdx = createRoute({ getParentRoute: () => admCursos, path: '/', component: () => <p>lista</p> })
  const tree = root.addChildren([
    pub.addChildren([home, cursos.addChildren([curso])]),
    adm.addChildren([admCursos.addChildren([admCursosIdx])]),
  ])
  const router = createRouter({
    routeTree: tree,
    history: createMemoryHistory({ initialEntries: [path] }),
    // Igual ao main.tsx (carregada sob demanda).
    defaultNotFoundComponent: lazyRouteComponent(() => import('@/components/NotFoundPage'), 'NotFoundPage'),
  })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('NotFoundPage', () => {
  // Carrega o módulo (cabeçalho, rodapé…) antes: com a suíte inteira rodando, a
  // primeira importação sob demanda pode passar do tempo padrão do findBy.
  beforeAll(async () => {
    await import('@/components/NotFoundPage')
  })

  beforeEach(() => {
    // Cabeçalho/rodapé buscam convênios e configurações do site.
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('[]', { status: 200 }))))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('endereço solto: página com cabeçalho e rodapé do site e links Início, Cursos, Contato', async () => {
    renderAt('/pagina-que-nao-existe')
    expect(await screen.findByRole('heading', { name: 'notFoundPage.title' })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'notFoundPage.home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'notFoundPage.courses' })).toHaveAttribute('href', '/cursos')
    expect(screen.getByRole('link', { name: 'notFoundPage.contact' })).toHaveAttribute('href', '/contato')
  })

  it('dentro do layout público: só o conteúdo (sem cabeçalho repetido)', async () => {
    renderAt('/cursos/abc/extra')
    expect(await screen.findByRole('heading', { name: 'notFoundPage.title' })).toBeInTheDocument()
    expect(screen.getByTestId('public-layout')).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('painel: leva de volta ao painel, sem o cabeçalho do site', async () => {
    renderAt('/admin/nao-existe')
    expect(await screen.findByRole('heading', { name: 'notFoundPage.title' })).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'notFoundPage.adminPanel' })).toHaveAttribute('href', '/admin')

    renderAt('/admin/cursos/x/y')
    expect(await screen.findByTestId('admin-layout')).toBeInTheDocument()
  })
})
