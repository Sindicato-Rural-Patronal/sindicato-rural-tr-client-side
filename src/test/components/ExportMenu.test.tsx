import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ComponentProps, ReactNode } from 'react'
import { ApiError } from '@/lib/api'
import { CATALOGO_INSCRICOES_CRU, CATALOGO_PESSOAS_CRU } from '../lib/export-catalog.fixture'
import '@/i18n'

// "Montar relatório…" no menu Exportar (decisão 006): só aparece quando o
// catálogo da fonte carrega. Contra o back velho (404) o menu fica como antes.

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// O montador tem o "?" da Ajuda (Link do roteador).
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: { children: ReactNode; to: string; search?: { topico?: string } }) =>
    <a href={`${to}?topico=${search?.topico ?? ''}`} {...props}>{children}</a>,
}))
const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))
// O PDF rápido: nada de desenhar PDF nem baixar arquivo no jsdom.
const relatorioJsonPdf = vi.fn()
const saveRelatorioPdf = vi.fn()
vi.mock('@/lib/relatorio-pdf', () => ({
  relatorioJsonPdf: (...args: unknown[]) => relatorioJsonPdf(...args),
  saveRelatorioPdf: (...args: unknown[]) => saveRelatorioPdf(...args),
}))
const saveBlob = vi.fn()
vi.mock('@/utils/download', async importOriginal => ({
  ...(await importOriginal<typeof import('@/utils/download')>()),
  saveBlob: (...args: unknown[]) => saveBlob(...args),
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

function comCatalogo(catalogo: unknown = CATALOGO_PESSOAS_CRU) {
  apiFetch.mockImplementation((path: string) => path.endsWith('/catalog')
    ? Promise.resolve({ json: () => Promise.resolve(catalogo) })
    : Promise.reject(new Error('inesperado')))
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  relatorioJsonPdf.mockResolvedValue(new Blob(['%PDF']))
})

/** Catálogo por fonte (ausente = 404, sem montador) e a resposta da exportação. */
function simular(catalogos: Record<string, unknown>, exportacao: (path: string) => unknown) {
  apiFetch.mockImplementation((path: string) => {
    const m = path.match(/^\/admin\/export\/([^/]+)\/catalog$/)
    if (m) {
      const c = catalogos[m[1]]
      return c
        ? Promise.resolve({ json: () => Promise.resolve(c) })
        : Promise.reject(new ApiError(404, 'Este conjunto ainda não tem o montador.'))
    }
    return Promise.resolve(exportacao(path))
  })
}

const JSON_PDF = {
  title: 'Pessoas', filename: 'pessoas-2026-11-11.pdf', count: 1, filters: 'Busca: silva', modelo: 'Resumo',
  columns: [{ key: 'name', label: 'Nome', type: 'text' }], rows: [['ANA']],
}

/** Corpo do POST da exportação da fonte. */
function corpoDaExportacao(dataset: string): Record<string, unknown> {
  const chamada = apiFetch.mock.calls.find(c => c[0] === `/admin/export/${dataset}`)
  expect(chamada).toBeDefined()
  return JSON.parse(chamada![1].body as string)
}

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

  it('inscrições: o montador recebe o nome do curso e quantas estão confirmadas', async () => {
    comCatalogo(CATALOGO_INSCRICOES_CRU)
    abrir({
      dataset: 'registrations', label: 'Planilha', selectedIds: undefined, filters: { courseIds: ['c1'] }, total: 5,
      confirmedTotal: 3, filterTexts: { courseIds: 'Curso: Horta' },
    })
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/registrations/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Planilha' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Montar relatório…' }))
    expect(await screen.findByText('Filtros: Curso: Horta')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Só confirmadas (3)' })).not.toBeChecked()
  })

  it('com seleção, o botão mostra quantos e os itens "Selecionados" continuam', async () => {
    comCatalogo()
    abrir({ selectedIds: ['a', 'b'] })
    await userEvent.click(screen.getByRole('button', { name: 'Exportar (2)' }))
    expect(await screen.findAllByRole('menuitem', { name: 'Selecionados (2)' })).toHaveLength(2)
  })
})

describe('ExportMenu: PDF rápido pela API (SR-101)', () => {
  it('fonte com montador: pede format=pdf com as colunas de sempre e o modelo "Resumo"', async () => {
    simular({ people: CATALOGO_PESSOAS_CRU }, () => ({ json: () => Promise.resolve(JSON_PDF), headers: new Headers() }))
    abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    const [, pdf] = await screen.findAllByRole('menuitem', { name: 'Todos (10)' })
    await userEvent.click(pdf)

    await waitFor(() => expect(relatorioJsonPdf).toHaveBeenCalled())
    expect(corpoDaExportacao('people')).toEqual({
      search: 'silva', fields: ['name', 'cpf', 'email', 'phone'], format: 'pdf', modelo: 'Resumo',
    })
    expect(saveRelatorioPdf).not.toHaveBeenCalled()
    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'pessoas-2026-11-11.pdf')
  })

  it('"Selecionados" também, com os ids', async () => {
    simular({ people: CATALOGO_PESSOAS_CRU }, () => ({ json: () => Promise.resolve(JSON_PDF), headers: new Headers() }))
    abrir({ selectedIds: ['a', 'b'] })
    await userEvent.click(screen.getByRole('button', { name: 'Exportar (2)' }))
    const [, pdf] = await screen.findAllByRole('menuitem', { name: 'Selecionados (2)' })
    await userEvent.click(pdf)
    await waitFor(() => expect(relatorioJsonPdf).toHaveBeenCalled())
    expect(corpoDaExportacao('people')).toMatchObject({ ids: ['a', 'b'], format: 'pdf', modelo: 'Resumo' })
  })

  it('fonte sem montador (back velho): o PDF ainda sai do CSV, sem fields', async () => {
    simular({}, () => ({
      blob: () => Promise.resolve(new Blob(['"Nome"'])),
      headers: new Headers({ 'Content-Disposition': 'attachment; filename="pessoas.csv"', 'X-Export-Count': '1' }),
    }))
    abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    const [, pdf] = await screen.findAllByRole('menuitem', { name: 'Todos (10)' })
    await userEvent.click(pdf)

    await waitFor(() => expect(saveRelatorioPdf).toHaveBeenCalledWith('"Nome"', 'Pessoas', 'pessoas.pdf'))
    expect(corpoDaExportacao('people')).toEqual({ search: 'silva' })
    expect(relatorioJsonPdf).not.toHaveBeenCalled()
  })

  it('a planilha rápida continua sem fields (o padrão de sempre)', async () => {
    simular({ people: CATALOGO_PESSOAS_CRU }, () => ({
      blob: () => Promise.resolve(new Blob(['"Nome"'])), headers: new Headers({ 'X-Export-Count': '1' }),
    }))
    abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    const [csv] = await screen.findAllByRole('menuitem', { name: 'Todos (10)' })
    await userEvent.click(csv)
    await waitFor(() => expect(saveBlob).toHaveBeenCalled())
    expect(corpoDaExportacao('people')).toEqual({ search: 'silva' })
  })
})

describe('ExportMenu: montador nos extras (SR-101)', () => {
  it('extra com builder ganha "Montar relatório: …"; o desligado continua desligado', async () => {
    simular({ people: CATALOGO_PESSOAS_CRU, registrations: CATALOGO_INSCRICOES_CRU }, () => ({}))
    abrir({
      extra: [
        { label: 'Inscrições dos cursos selecionados', dataset: 'registrations', params: { courseIds: [] }, disabled: true, builder: true },
        { label: 'Inscrições de todos os cursos', dataset: 'registrations', params: {}, builder: true },
        { label: 'Sem montador', dataset: 'properties', params: {} },
      ],
    })
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/registrations/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    expect(await screen.findByRole('menuitem', { name: 'Montar relatório…' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Montar relatório: inscrições dos cursos selecionados…' }))
      .toHaveAttribute('data-disabled')
    expect(screen.getByRole('menuitem', { name: 'Montar relatório: inscrições de todos os cursos…' }))
      .not.toHaveAttribute('data-disabled')
    expect(screen.queryByRole('menuitem', { name: /Montar relatório: sem montador/ })).not.toBeInTheDocument()
  })

  it('o montador do extra diz o que entra e manda os params dele, sem "Todos" nem "Selecionados"', async () => {
    simular({ people: CATALOGO_PESSOAS_CRU, registrations: CATALOGO_INSCRICOES_CRU }, () => ({
      blob: () => Promise.resolve(new Blob(['"Nome"'])), headers: new Headers({ 'X-Export-Count': '4' }),
    }))
    abrir({
      extra: [{ label: 'Inscrições dos cursos selecionados', dataset: 'registrations', params: { courseIds: ['c1', 'c2'] }, builder: true }],
    })
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/registrations/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Montar relatório: inscrições dos cursos selecionados…' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Montar relatório · Inscrições' })
    expect(dialogo).toHaveTextContent('O que entraInscrições dos cursos selecionados')
    expect(screen.queryByRole('radio', { name: /^Todos/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /^Selecionados/ })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Só confirmadas' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Baixar planilha' }))
    await waitFor(() => expect(saveBlob).toHaveBeenCalled())
    expect(corpoDaExportacao('registrations')).toEqual({
      courseIds: ['c1', 'c2'], fields: ['course', 'name', 'cpf', 'email', 'phone', 'confirmed', 'registeredAt'],
      format: 'csv', modelo: 'Padrão (como hoje)',
    })
  })
})
