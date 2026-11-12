import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CATALOGO_PESSOAS_CRU } from '../lib/export-catalog.fixture'
import '@/i18n'

// Primeiro clique em "Montar relatório…" com a internet lenta: o pedaço do
// montador ainda não chegou. Antes não aparecia nada (Suspense sem fallback) e a
// pessoa clicava de novo; agora aparece "Abrindo o montador…".

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// O pedaço do montador que nunca termina de carregar.
vi.mock('@/components/export/ReportBuilder', () => new Promise(() => {}))
const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

const { ExportMenu } = await import('@/components/export/ExportMenu')

describe('ExportMenu: montador carregando', () => {
  it('mostra "Abrindo o montador…" enquanto o pedaço carrega', async () => {
    apiFetch.mockResolvedValue({ json: () => Promise.resolve(CATALOGO_PESSOAS_CRU) })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <ExportMenu dataset="people" filters={{}} selectedIds={[]} total={10} />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/people/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Montar relatório…' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Abrindo o montador…')
  })
})
