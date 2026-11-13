import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CATALOGO_PESSOAS_CRU } from '../lib/export-catalog.fixture'
import '@/i18n'

// "Montar relatório (escolher campos)" no Exportar das fichas de pessoa e de
// empresa (decisão 006, fase 2): um item por fonte, só quando o catálogo dela
// carrega; o montador sai com o registro da ficha (`ids: [id]`), sem "Todos".

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: { children: ReactNode; to: string; search?: { topico?: string } }) =>
    <a href={`${to}?topico=${search?.topico ?? ''}`} {...props}>{children}</a>,
}))
const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))
const saveBlob = vi.fn()
vi.mock('@/utils/download', async importOriginal => ({
  ...(await importOriginal<typeof import('@/utils/download')>()),
  saveBlob: (...args: unknown[]) => saveBlob(...args),
}))

const { ItensDoMontador, MontadorAberto } = await import('@/components/export/MontadorDeFontes')
type Abertura = import('@/components/export/MontadorDeFontes').AberturaDoMontador
type Fonte = import('@/components/export/MontadorDeFontes').FonteDoMontador

const FONTES: Fonte[] = [
  { rotulo: 'Ficha completa…', dataset: 'people', filters: { ids: ['p1'] }, total: 1, escopo: 'Só esta pessoa: ANA' },
  {
    rotulo: 'Propriedades (2)…', dataset: 'properties', filters: { ownerIds: ['p1'] }, total: 2,
    escopo: 'As propriedades desta pessoa (2)',
  },
]

/** O "Exportar" de uma ficha: os itens do montador no menu e o montador fora dele. */
function Ficha({ fontes = FONTES }: { fontes?: Fonte[] }) {
  const [abertura, setAbertura] = useState<Abertura>({ aberto: false, vez: 0, alvo: 0 })
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><Button>Exportar</Button></DropdownMenuTrigger>
        <DropdownMenuContent>
          <ItensDoMontador
            titulo="Montar relatório (escolher campos)"
            fontes={fontes}
            onAbrir={alvo => setAbertura(a => ({ aberto: true, vez: a.vez + 1, alvo }))}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <MontadorAberto fontes={fontes} abertura={abertura} onOpenChange={aberto => setAbertura(a => ({ ...a, aberto }))} />
    </>
  )
}

function abrir(fontes?: Fonte[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><Ficha fontes={fontes} /></QueryClientProvider>)
}

/** Pessoas tem montador; Propriedades responde 404 (back velho). */
function simular() {
  apiFetch.mockImplementation((path: string) => {
    if (path === '/admin/export/people/catalog') return Promise.resolve({ json: () => Promise.resolve(CATALOGO_PESSOAS_CRU) })
    if (path.endsWith('/catalog')) return Promise.reject(new ApiError(404, 'Este conjunto ainda não tem o montador.'))
    return Promise.resolve({ blob: () => Promise.resolve(new Blob(['"Nome"'])), headers: new Headers({ 'X-Export-Count': '1' }) })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('montador nas fichas', () => {
  it('só a fonte com catálogo aparece, debaixo do título', async () => {
    simular()
    abrir()
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/properties/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    expect(await screen.findByRole('menuitem', { name: 'Ficha completa…' })).toBeInTheDocument()
    expect(screen.getByText('Montar relatório (escolher campos)')).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Propriedades/ })).not.toBeInTheDocument()
  })

  it('sem nenhum catálogo, nada aparece (nem o título)', async () => {
    simular()
    abrir([FONTES[1]])
    await waitFor(() => expect(apiFetch).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    await screen.findByRole('menu')
    expect(screen.queryByText('Montar relatório (escolher campos)')).not.toBeInTheDocument()
  })

  // Abre o montador de verdade: na primeira vez o pedaço dele (dnd-kit e companhia) é
  // carregado. Sozinho leva ~1 s, mas com a suíte inteira em paralelo chegou a passar
  // dos 5 s do padrão (SR-111); o tempo maior segue o dos testes de formulário.
  it('a ficha sai só com o registro dela, sem "Todos" nem "Selecionados"', { timeout: 15_000 }, async () => {
    simular()
    abrir()
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/people/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Ficha completa…' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Montar relatório · Pessoas' })
    expect(dialogo).toHaveTextContent('O que entraSó esta pessoa: ANA')
    expect(screen.queryByRole('radio', { name: /^Todos/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/^Filtros:/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Baixar planilha (1)' }))
    await waitFor(() => expect(saveBlob).toHaveBeenCalled())
    const chamada = apiFetch.mock.calls.find(c => c[0] === '/admin/export/people')!
    expect(JSON.parse(chamada[1].body as string)).toMatchObject({ ids: ['p1'], format: 'csv' })
  })
})
