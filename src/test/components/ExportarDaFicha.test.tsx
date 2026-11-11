import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ComponentProps, ReactNode } from 'react'
import { ApiError } from '@/lib/api'
import { toast } from 'sonner'
import { CATALOGO_PESSOAS_CRU } from '../lib/export-catalog.fixture'
import '@/i18n'

// O "Exportar" das fichas de pessoa e de empresa (SR-111): a planilha sai em CSV
// ou no Excel, com a MESMA escolha do menu das listas ("Planilha [CSV] [Excel
// (.xlsx)]", guardada em `sr:planilha`). Sem o catálogo (back velho), só CSV.

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

const { ExportarDaFicha } = await import('@/components/export/ExportarDaFicha')

const PLANILHAS: ComponentProps<typeof ExportarDaFicha>['planilhas'] = [
  { rotulo: 'Ficha completa', dataset: 'people', params: { ids: ['p1'] } },
  { rotulo: 'Propriedades (2)', dataset: 'properties', params: { ownerIds: ['p1'] } },
]

function abrir(props: Partial<ComponentProps<typeof ExportarDaFicha>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ExportarDaFicha dataset="people" planilhas={PLANILHAS} fontes={[]} {...props} />
    </QueryClientProvider>,
  )
}

/** Catálogo por fonte (ausente = 404, back velho) e o arquivo da exportação. */
function simular(catalogos: Record<string, unknown>, nome: string) {
  apiFetch.mockImplementation((path: string) => {
    const m = path.match(/^\/admin\/export\/([^/]+)\/catalog$/)
    if (m) {
      const c = catalogos[m[1]]
      return c
        ? Promise.resolve({ json: () => Promise.resolve(c) })
        : Promise.reject(new ApiError(404, 'Este conjunto ainda não tem o montador.'))
    }
    return Promise.resolve({
      blob: () => Promise.resolve(new Blob(['x'])),
      headers: new Headers({ 'Content-Disposition': `attachment; filename="${nome}"`, 'X-Export-Count': '1' }),
    })
  })
}

function corpoDaExportacao(dataset: string): Record<string, unknown> {
  const chamada = apiFetch.mock.calls.find(c => c[0] === `/admin/export/${dataset}`)
  expect(chamada).toBeDefined()
  return JSON.parse(chamada![1].body as string)
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('Exportar das fichas: planilha CSV ou Excel (SR-111)', () => {
  it('com o catálogo, o título vira a escolha; o Excel escolhido baixa .xlsx e fica lembrado', async () => {
    simular({ people: CATALOGO_PESSOAS_CRU }, 'pessoas-2026-11-11.xlsx')
    abrir()
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/people/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    expect(await screen.findByRole('menuitemradio', { name: 'Planilha CSV' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByText('Planilha CSV (abre no Excel)')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Planilha do Excel (.xlsx)' }))
    expect(localStorage.getItem('sr:planilha')).toBe('xlsx')
    await userEvent.click(screen.getByRole('menuitem', { name: 'Ficha completa' }))
    await waitFor(() => expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'pessoas-2026-11-11.xlsx'))
    expect(corpoDaExportacao('people')).toEqual({ ids: ['p1'], format: 'xlsx' })
    expect(toast.success).toHaveBeenCalledWith('Planilha do Excel com 1 registro baixada.')
  })

  it('a escolha feita numa lista vale na ficha: as propriedades saem no Excel', async () => {
    localStorage.setItem('sr:planilha', 'xlsx')
    simular({ people: CATALOGO_PESSOAS_CRU }, 'propriedades-2026-11-11.xlsx')
    abrir()
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/people/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    expect(await screen.findByRole('menuitemradio', { name: 'Planilha do Excel (.xlsx)' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('menuitem', { name: 'Propriedades (2)' }))
    await waitFor(() => expect(saveBlob).toHaveBeenCalled())
    expect(corpoDaExportacao('properties')).toEqual({ ownerIds: ['p1'], format: 'xlsx' })
  })

  it('sem o catálogo (back velho): só CSV, com o título de antes, mesmo com o Excel lembrado', async () => {
    localStorage.setItem('sr:planilha', 'xlsx')
    simular({}, 'pessoas.csv')
    abrir()
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/people/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    expect(await screen.findByText('Planilha CSV (abre no Excel)')).toBeInTheDocument()
    expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Ficha completa' }))
    await waitFor(() => expect(saveBlob).toHaveBeenCalled())
    expect(corpoDaExportacao('people')).toEqual({ ids: ['p1'] })
    expect(toast.success).toHaveBeenCalledWith('Planilha com 1 registro baixada.')
  })

  it('item desligado (sem propriedade) não baixa', async () => {
    simular({ people: CATALOGO_PESSOAS_CRU }, 'x.csv')
    abrir({ planilhas: [PLANILHAS[0], { ...PLANILHAS[1], rotulo: 'Propriedades (0)', disabled: true }] })
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    expect(await screen.findByRole('menuitem', { name: 'Propriedades (0)' })).toHaveAttribute('data-disabled')
  })
})
