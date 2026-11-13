import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ComponentProps, ReactNode } from 'react'
import { ApiError } from '@/lib/api'
import { toast } from 'sonner'
import {
  CATALOGO_AUDITORIA_CRU, CATALOGO_INSCRICOES_CRU, CATALOGO_LANCAMENTOS_CRU, CATALOGO_PESSOAS_CRU,
} from '../lib/export-catalog.fixture'
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

    await waitFor(() => expect(saveRelatorioPdf).toHaveBeenCalledWith('"Nome"', 'Pessoas', 'pessoas.pdf', undefined))
    expect(corpoDaExportacao('people')).toEqual({ search: 'silva', pdfDoNavegador: true })
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

describe('ExportMenu: PDF rápido acima do limite de linhas volta ao PDF do CSV (SR-103)', () => {
  const CSV = () => ({
    blob: () => Promise.resolve(new Blob(['"Nome"'])),
    headers: new Headers({ 'Content-Disposition': 'attachment; filename="pessoas.csv"', 'X-Export-Count': '2500' }),
  })

  it('total conhecido acima de 2.000: nem tenta a API; o PDF sai do CSV com as mesmas colunas', async () => {
    simular({ people: CATALOGO_PESSOAS_CRU }, CSV)
    abrir({ total: 2500 })
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    const [, pdf] = await screen.findAllByRole('menuitem', { name: 'Todos (2.500)' })
    await userEvent.click(pdf)

    await waitFor(() => expect(saveRelatorioPdf).toHaveBeenCalledWith(
      '"Nome"', 'Pessoas', 'pessoas.pdf', ['Nome', 'CPF', 'E-mail', 'Telefone'],
    ))
    expect(corpoDaExportacao('people')).toEqual({ search: 'silva', pdfDoNavegador: true })
    expect(relatorioJsonPdf).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Relatório com 2.500 registros baixado.')
  })

  it('até 2.000, vai pela API como antes', async () => {
    simular({ people: CATALOGO_PESSOAS_CRU }, () => ({ json: () => Promise.resolve(JSON_PDF), headers: new Headers() }))
    abrir({ total: 2000 })
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    const [, pdf] = await screen.findAllByRole('menuitem', { name: 'Todos (2.000)' })
    await userEvent.click(pdf)
    await waitFor(() => expect(relatorioJsonPdf).toHaveBeenCalled())
    expect(saveRelatorioPdf).not.toHaveBeenCalled()
  })

  it('total desconhecido e a API recusa pelo limite: em vez do erro, o PDF sai do CSV', async () => {
    const limite = new ApiError(400, 'O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.')
    apiFetch.mockImplementation((path: string, init?: { body?: string }) => {
      if (path.endsWith('/catalog')) return Promise.resolve({ json: () => Promise.resolve(CATALOGO_PESSOAS_CRU) })
      const corpo = JSON.parse(init?.body ?? '{}') as Record<string, unknown>
      return corpo.format === 'pdf' ? Promise.reject(limite) : Promise.resolve(CSV())
    })
    abrir({ total: undefined })
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    const [, pdf] = await screen.findAllByRole('menuitem', { name: 'Todos' })
    await userEvent.click(pdf)

    await waitFor(() => expect(saveRelatorioPdf).toHaveBeenCalledWith(
      '"Nome"', 'Pessoas', 'pessoas.pdf', ['Nome', 'CPF', 'E-mail', 'Telefone'],
    ))
    const pedidos = apiFetch.mock.calls.filter(c => c[0] === '/admin/export/people').map(c => JSON.parse(c[1].body as string))
    expect(pedidos).toEqual([
      { search: 'silva', fields: ['name', 'cpf', 'email', 'phone'], format: 'pdf', modelo: 'Resumo' },
      { search: 'silva', pdfDoNavegador: true },
    ])
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('outro erro da API continua aparecendo, sem tentar o CSV', async () => {
    apiFetch.mockImplementation((path: string) => path.endsWith('/catalog')
      ? Promise.resolve({ json: () => Promise.resolve(CATALOGO_PESSOAS_CRU) })
      : Promise.reject(new ApiError(403, 'Sem permissão para exportar: CPF.')))
    abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    const [, pdf] = await screen.findAllByRole('menuitem', { name: 'Todos (10)' })
    await userEvent.click(pdf)
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Sem permissão para exportar: CPF.'))
    expect(apiFetch.mock.calls.filter(c => c[0] === '/admin/export/people')).toHaveLength(1)
    expect(saveRelatorioPdf).not.toHaveBeenCalled()
  })

  it('"Selecionados" usa quantos estão marcados para decidir', async () => {
    simular({ people: CATALOGO_PESSOAS_CRU }, CSV)
    const muitos = Array.from({ length: 2001 }, (_, i) => `p${i}`)
    abrir({ selectedIds: muitos, total: 3000 })
    await userEvent.click(screen.getByRole('button', { name: 'Exportar (2.001)' }))
    const [, pdf] = await screen.findAllByRole('menuitem', { name: 'Selecionados (2.001)' })
    await userEvent.click(pdf)
    await waitFor(() => expect(saveRelatorioPdf).toHaveBeenCalled())
    expect(corpoDaExportacao('people')).toEqual({ ids: muitos, pdfDoNavegador: true })
  })
})

describe('ExportMenu: Financeiro e Auditoria (SR-103)', () => {
  it('lançamentos: o PDF rápido usa o modelo "Resumido" e a ordem da tela', async () => {
    simular({ 'finance-transactions': CATALOGO_LANCAMENTOS_CRU }, () => ({
      json: () => Promise.resolve({ ...JSON_PDF, title: 'Lançamentos', filename: 'lancamentos-2026-11-11.pdf' }),
      headers: new Headers(),
    }))
    abrir({ dataset: 'finance-transactions', selectedIds: undefined, filters: { from: '2026-10-01', orderBy: 'number' }, total: 61 })
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    const [, pdf] = await screen.findAllByRole('menuitem', { name: 'Todos (61)' })
    await userEvent.click(pdf)
    await waitFor(() => expect(relatorioJsonPdf).toHaveBeenCalled())
    expect(corpoDaExportacao('finance-transactions')).toEqual({
      from: '2026-10-01', orderBy: 'number',
      fields: ['number', 'date', 'description', 'payeeName', 'amount'], format: 'pdf', modelo: 'Resumido',
    })
    expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'lancamentos-2026-11-11.pdf')
  })

  it('a planilha dos lançamentos vai pela exportação, com o nome que a API manda', async () => {
    simular({ 'finance-transactions': CATALOGO_LANCAMENTOS_CRU }, () => ({
      blob: () => Promise.resolve(new Blob(['"Nº"'])),
      headers: new Headers({ 'Content-Disposition': 'attachment; filename="lancamentos-2026-11-11.csv"', 'X-Export-Count': '1' }),
    }))
    abrir({ dataset: 'finance-transactions', selectedIds: undefined, filters: { search: 'coop' }, total: 1 })
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    const [csv] = await screen.findAllByRole('menuitem', { name: 'Todos (1)' })
    await userEvent.click(csv)
    await waitFor(() => expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'lancamentos-2026-11-11.csv'))
    expect(corpoDaExportacao('finance-transactions')).toEqual({ search: 'coop' })
    expect(toast.success).toHaveBeenCalledWith('Planilha com 1 registro baixada.')
  })

  it('auditoria: o montador avisa do corte nas 20.000 mais recentes e deixa baixar a planilha', async () => {
    comCatalogo(CATALOGO_AUDITORIA_CRU)
    localStorage.setItem('sr:relatorio:audit-logs', JSON.stringify({ fields: ['createdAt', 'actor'], format: 'csv' }))
    abrir({ dataset: 'audit-logs', selectedIds: undefined, filters: {}, total: 25000, cortaNoLimite: true })
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/audit-logs/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Montar relatório…' }))
    await screen.findByRole('dialog', { name: 'Montar relatório · Auditoria' })
    expect(screen.getByRole('radio', { name: 'Todos (25.000)' })).toBeChecked()
    expect(screen.getByText('Saem só as 20.000 linhas mais recentes.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Baixar planilha (20.000)' })).toBeEnabled()
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

describe('ExportMenu: planilha do Excel (SR-106)', () => {
  const XLSX = () => ({
    blob: () => Promise.resolve(new Blob(['PK'])),
    headers: new Headers({ 'Content-Disposition': 'attachment; filename="pessoas-2026-11-11.xlsx"', 'X-Export-Count': '2500' }),
  })

  it('com o catálogo, a seção vira "Planilha: CSV | Excel"; escolher o Excel não fecha o menu e o Todos baixa .xlsx', async () => {
    simular({ people: CATALOGO_PESSOAS_CRU }, XLSX)
    abrir({ total: 2500, filtered: true })
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/people/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    const csv = await screen.findByRole('menuitemradio', { name: 'Planilha CSV' })
    expect(csv).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Planilha do Excel (.xlsx)' }))
    expect(screen.getByRole('menuitemradio', { name: 'Planilha do Excel (.xlsx)' })).toHaveAttribute('aria-checked', 'true')
    expect(localStorage.getItem('sr:planilha')).toBe('xlsx')

    // O texto inteiro, com milhar.
    const [planilha] = screen.getAllByRole('menuitem', { name: 'Todos com os filtros atuais (2.500)' })
    await userEvent.click(planilha)
    await waitFor(() => expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'pessoas-2026-11-11.xlsx'))
    expect(corpoDaExportacao('people')).toEqual({ search: 'silva', format: 'xlsx' })
    expect(toast.success).toHaveBeenCalledWith('Planilha do Excel com 2.500 registros baixada.')
  })

  it('o Excel escolhido fica lembrado: os Selecionados e os extras saem em .xlsx', async () => {
    localStorage.setItem('sr:planilha', 'xlsx')
    simular({ people: CATALOGO_PESSOAS_CRU, properties: CATALOGO_PESSOAS_CRU }, XLSX)
    abrir({ selectedIds: ['a', 'b'], extra: [{ label: 'Propriedades dos selecionados', dataset: 'properties', params: { ownerIds: ['a', 'b'] } }] })
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/people/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar (2)' }))
    expect(await screen.findByRole('menuitemradio', { name: 'Planilha do Excel (.xlsx)' })).toHaveAttribute('aria-checked', 'true')
    const [planilha] = screen.getAllByRole('menuitem', { name: 'Selecionados (2)' })
    await userEvent.click(planilha)
    await waitFor(() => expect(saveBlob).toHaveBeenCalled())
    expect(corpoDaExportacao('people')).toEqual({ ids: ['a', 'b'], format: 'xlsx' })

    await userEvent.click(screen.getByRole('button', { name: 'Exportar (2)' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Propriedades dos selecionados' }))
    await waitFor(() => expect(apiFetch.mock.calls.some(c => c[0] === '/admin/export/properties')).toBe(true))
    expect(corpoDaExportacao('properties')).toEqual({ ownerIds: ['a', 'b'], format: 'xlsx' })
  })

  it('sem o catálogo (back velho): só CSV, como antes, mesmo com o Excel lembrado', async () => {
    localStorage.setItem('sr:planilha', 'xlsx')
    simular({}, () => ({ blob: () => Promise.resolve(new Blob(['"Nome"'])), headers: new Headers({ 'X-Export-Count': '1' }) }))
    abrir()
    await waitFor(() => expect(apiFetch).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    expect(await screen.findByText('Planilha CSV (abre no Excel)')).toBeInTheDocument()
    expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument()
    const [planilha] = screen.getAllByRole('menuitem', { name: 'Todos (10)' })
    await userEvent.click(planilha)
    await waitFor(() => expect(saveBlob).toHaveBeenCalled())
    expect(corpoDaExportacao('people')).toEqual({ search: 'silva' })
  })
})

describe('ExportMenu: Financeiro e Auditoria acima dos limites (SR-106)', () => {
  it('lançamentos acima de 2.000: o PDF não volta ao CSV; o menu já diz o aviso da API e não pede nada', async () => {
    simular({ 'finance-transactions': CATALOGO_LANCAMENTOS_CRU }, () => ({}))
    abrir({ dataset: 'finance-transactions', selectedIds: undefined, filters: {}, total: 2500 })
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/finance-transactions/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    const [planilha, pdf] = await screen.findAllByRole('menuitem', { name: 'Todos (2.500)' })
    expect(planilha).not.toHaveAttribute('data-disabled')
    expect(pdf).toHaveAttribute('data-disabled')
    expect(screen.getByText('O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.')).toBeInTheDocument()
    expect(apiFetch.mock.calls.filter(c => c[0] === '/admin/export/finance-transactions')).toHaveLength(0)
    expect(saveRelatorioPdf).not.toHaveBeenCalled()
  })

  it('auditoria sem total conhecido: o 400 do limite aparece, sem desenhar o PDF do CSV', async () => {
    apiFetch.mockImplementation((path: string) => path.endsWith('/catalog')
      ? Promise.resolve({ json: () => Promise.resolve(CATALOGO_AUDITORIA_CRU) })
      : Promise.reject(new ApiError(400, 'O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.')))
    abrir({ dataset: 'audit-logs', selectedIds: undefined, filters: {}, total: undefined, cortaNoLimite: true })
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    const [, pdf] = await screen.findAllByRole('menuitem', { name: 'Todos' })
    await userEvent.click(pdf)
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.'))
    expect(apiFetch.mock.calls.filter(c => c[0] === '/admin/export/audit-logs')).toHaveLength(1)
    expect(saveRelatorioPdf).not.toHaveBeenCalled()
  })

  it('auditoria acima de 20.000: o menu avisa antes do clique que a planilha leva só as mais recentes', async () => {
    comCatalogo(CATALOGO_AUDITORIA_CRU)
    abrir({ dataset: 'audit-logs', selectedIds: undefined, filters: {}, total: 25000, cortaNoLimite: true })
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/audit-logs/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    expect(await screen.findAllByRole('menuitem', { name: 'Todos (25.000)' })).toHaveLength(2)
    expect(screen.getByText('Saem só as 20.000 linhas mais recentes.')).toBeInTheDocument()
  })

  it('sem corte (até 20.000), nada de aviso', async () => {
    comCatalogo(CATALOGO_AUDITORIA_CRU)
    abrir({ dataset: 'audit-logs', selectedIds: undefined, filters: {}, total: 1500, cortaNoLimite: true })
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/export/audit-logs/catalog'))
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    await screen.findAllByRole('menuitem', { name: 'Todos (1.500)' })
    expect(screen.queryByText(/Saem só as/)).not.toBeInTheDocument()
    expect(screen.queryByText(/O PDF aceita/)).not.toBeInTheDocument()
  })
})
