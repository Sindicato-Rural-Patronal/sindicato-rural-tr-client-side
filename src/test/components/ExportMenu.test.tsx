import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ComponentProps } from 'react'
import { ApiError } from '@/lib/api'
import { CATALOGO_PESSOAS_CRU } from '../lib/export-catalog.fixture'
import '@/i18n'

// "Montar relatório…" no menu Exportar (decisão 006): só aparece quando o
// catálogo da fonte carrega. Contra o back velho (404) o menu fica como antes.

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

const { ExportMenu } = await import('@/components/export/ExportMenu')

function abrir(props: Partial<ComponentProps<typeof ExportMenu>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ExportMenu dataset="people" filters={{ search: 'silva' }} selectedIds={[]} total={10} {...props} />
    </QueryClientProvider>,
  )
}

function comCatalogo() {
  apiFetch.mockImplementation((path: string) => path.endsWith('/catalog')
    ? Promise.resolve({ json: () => Promise.resolve(CATALOGO_PESSOAS_CRU) })
    : Promise.reject(new Error('inesperado')))
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('ExportMenu e o montador', () => {
  it('com o catálogo, o item abre o montador com os filtros da tela', async () => {
    comCatalogo()
    abrir()
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/people/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Montar relatório…' }))
    expect(await screen.findByRole('dialog', { name: 'Montar relatório · Pessoas' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Todos (10)' })).toBeChecked()
  })

  it('back velho (404): o menu fica como antes, sem o item', async () => {
    apiFetch.mockRejectedValue(new ApiError(404, 'Route GET:/admin/export/people/catalog not found'))
    abrir()
    await waitFor(() => expect(apiFetch).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    expect(await screen.findAllByRole('menuitem', { name: 'Todos (10)' })).toHaveLength(2)
    expect(screen.queryByRole('menuitem', { name: 'Montar relatório…' })).not.toBeInTheDocument()
  })

  it('label troca o texto do botão; sem selectedIds, não há "Selecionados"', async () => {
    comCatalogo()
    abrir({ dataset: 'registrations', label: 'Planilha', selectedIds: undefined, filters: { courseIds: ['c1'] } })
    await userEvent.click(screen.getByRole('button', { name: 'Planilha' }))
    expect(await screen.findAllByRole('menuitem', { name: 'Todos (10)' })).toHaveLength(2)
    expect(screen.queryByRole('menuitem', { name: /Selecionados/ })).not.toBeInTheDocument()
  })

  it('com seleção, o botão mostra quantos e os itens "Selecionados" continuam', async () => {
    comCatalogo()
    abrir({ selectedIds: ['a', 'b'] })
    await userEvent.click(screen.getByRole('button', { name: 'Exportar (2)' }))
    expect(await screen.findAllByRole('menuitem', { name: 'Selecionados (2)' })).toHaveLength(2)
  })
})
