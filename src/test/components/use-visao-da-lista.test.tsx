import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { CATALOGO_LANCAMENTOS_CRU, modeloDaEquipeCru } from '../lib/export-catalog.fixture'

// O estado da visão de Lançamentos (decisão 007, SR-150), com a API simulada:
// aplicar a visão, "(alterada)", as colunas na URL, voltar à última e salvar.

const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

const { useVisaoDaLista } = await import('@/components/visoes/use-visao-da-lista')

const CATALOGO = {
  ...CATALOGO_LANCAMENTOS_CRU,
  visoes: [
    { id: 'padrao-tela', name: 'Padrão', fields: ['number', 'date', 'description', 'amount'], filters: null },
    { id: 'contabilidade', name: 'Contabilidade', fields: ['number', 'date', 'payeeDocument', 'amount'], filters: { type: 'IN', excludeTransfers: true } },
  ],
}
const MODELO = modeloDaEquipeCru({ id: 'm1', dataset: 'finance-transactions', name: 'Março', fields: ['number', 'amount'], format: null, filters: { type: 'OUT' } })

const resposta = (corpo: unknown) => Promise.resolve({ json: () => Promise.resolve(corpo) })

function rodar(props: { tela?: Record<string, string | boolean | undefined>; url?: { visao?: string; cols?: string } } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  const mudar = vi.fn()
  const hook = renderHook(
    (p: { tela: Record<string, string | boolean | undefined>; url: { visao?: string; cols?: string } }) =>
      useVisaoDaLista({ dataset: 'finance-transactions', enabled: true, tela: p.tela, url: p.url, mudar }),
    { wrapper, initialProps: { tela: props.tela ?? {}, url: props.url ?? {} } },
  )
  return { ...hook, mudar }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  apiFetch.mockImplementation((path: string, init?: { method?: string; body?: string }) => {
    if (path.endsWith('/catalog')) return resposta(CATALOGO)
    if (path === '/admin/report-templates/finance-transactions' && !init?.method) return resposta([MODELO])
    if (init?.method === 'POST') {
      const corpo = JSON.parse(init.body ?? '{}')
      return resposta(modeloDaEquipeCru({ id: 'novo', dataset: 'finance-transactions', name: corpo.name, fields: corpo.fields, filters: corpo.filters }))
    }
    return Promise.reject(new Error(`inesperado: ${path}`))
  })
})

describe('useVisaoDaLista', () => {
  it('sem `?visao` nem última: a Padrão, sem mudança (a tabela de sempre)', async () => {
    const { result } = rodar()
    await waitFor(() => expect(result.current.atual?.id).toBe('padrao-tela'))
    expect(result.current.ehOPadraoSemMudanca).toBe(true)
    expect(result.current.rotulo).toBe('Padrão')
    expect(result.current.cols).toEqual(['number', 'date', 'description', 'amount'])
  })

  it('aplicar troca as colunas e só os filtros que a visão guarda', async () => {
    const { result, mudar } = rodar()
    await waitFor(() => expect(result.current.visoes.length).toBe(3))
    act(() => result.current.aplicar('contabilidade'))
    expect(mudar).toHaveBeenCalledWith({ visao: 'contabilidade', cols: undefined, filtros: { type: 'IN', excludeTransfers: true } })
  })

  it('"(alterada)": colunas diferentes da visão ou filtro guardado mudado; `?cols` só quando difere', async () => {
    const { result, rerender, mudar } = rodar({ url: { visao: 'contabilidade' }, tela: { type: 'IN', excludeTransfers: true } })
    await waitFor(() => expect(result.current.atual?.id).toBe('contabilidade'))
    expect(result.current.alterada).toBe(false)
    expect(result.current.nomeApi).toBe('Contabilidade')

    rerender({ url: { visao: 'contabilidade' }, tela: { type: 'OUT', excludeTransfers: true } })
    expect(result.current.rotulo).toBe('Contabilidade (alterada)')

    act(() => result.current.mudarColunas(['number', 'amount']))
    expect(mudar).toHaveBeenLastCalledWith({ visao: 'contabilidade', cols: 'number,amount' })
    act(() => result.current.mudarColunas(['number', 'date', 'payeeDocument', 'amount']))
    expect(mudar).toHaveBeenLastCalledWith({ visao: 'contabilidade', cols: undefined })

    rerender({ url: { visao: 'contabilidade', cols: 'number,sumiu,amount' }, tela: { type: 'IN', excludeTransfers: true } })
    // Coluna que não está no catálogo some sem quebrar.
    expect(result.current.cols).toEqual(['number', 'amount'])
    expect(result.current.colunasMudaram).toBe(true)
    expect(result.current.ehOPadraoSemMudanca).toBe(false)
  })

  it('as visões da equipe vêm dos modelos da fonte (com `filters`)', async () => {
    const { result } = rodar({ url: { visao: 'equipe:m1' }, tela: { type: 'OUT' } })
    await waitFor(() => expect(result.current.atual?.id).toBe('equipe:m1'))
    expect(result.current.atual?.origem).toBe('equipe')
    expect(result.current.alterada).toBe(false)
    expect(result.current.equipe.podeSalvar).toBe(true)
  })

  it('volta à última visão do navegador, com os filtros dela quando a URL não traz nenhum', async () => {
    localStorage.setItem('sr:visao:finance-transactions', JSON.stringify({ visao: 'contabilidade' }))
    const { result, mudar } = rodar()
    expect(result.current.carregando).toBe(true)
    await waitFor(() => expect(mudar).toHaveBeenCalledWith({
      visao: 'contabilidade', cols: undefined, filtros: { type: 'IN', excludeTransfers: true },
    }))
  })

  it('"Salvar como…" manda as colunas e só os filtros ligados (sem busca nem datas), e abre a visão nova', async () => {
    const { result, mudar } = rodar({
      url: { visao: 'contabilidade' },
      tela: { type: 'IN', excludeTransfers: true, from: '2026-10-01', to: '2026-10-31', search: 'coop', categoryId: undefined },
    })
    await waitFor(() => expect(result.current.equipe.podeSalvar).toBe(true))
    let r: Awaited<ReturnType<typeof result.current.salvarComo>> | undefined
    await act(async () => { r = await result.current.salvarComo({ nome: '  Receitas   de outubro ', guardarFiltros: true, periodo: 'mes-passado' }) })
    expect(r).toEqual({ ok: true })
    const post = apiFetch.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(post[1].body)).toEqual({
      name: 'Receitas de outubro',
      fields: ['number', 'date', 'payeeDocument', 'amount'],
      filters: { type: 'IN', excludeTransfers: true, periodo: 'mes-passado' },
    })
    expect(mudar).toHaveBeenLastCalledWith(expect.objectContaining({ visao: 'equipe:novo', cols: undefined }))
  })

  it('nome vazio não chama a API', async () => {
    const { result } = rodar({ url: { visao: 'contabilidade' } })
    await waitFor(() => expect(result.current.equipe.podeSalvar).toBe(true))
    let r: Awaited<ReturnType<typeof result.current.salvarComo>> | undefined
    await act(async () => { r = await result.current.salvarComo({ nome: '   ', guardarFiltros: true, periodo: null }) })
    expect(r).toEqual({ ok: false, erro: 'Informe o nome da visão.' })
    expect(apiFetch.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })
})
