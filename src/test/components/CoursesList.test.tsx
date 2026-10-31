import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { CourseCardItem } from '@/hooks/useCourse'
import type { CourseView } from '@/lib/course-views'
import '@/i18n'

// Lista de cursos do painel com as abas "Próximos" (o dia do início ainda não
// chegou) e "Armazenados" (o dia do início é hoje ou já passou). Quem separa os
// cursos é o backend, pelo ?view=; aqui se confere o que a tela pede e mostra.

type LinkProps = { children?: ReactNode; to?: string; className?: string }
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className }: LinkProps) => <a href={to} className={className}>{children}</a>,
}))

const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

const { CoursesList } = await import('@/components/courses/CoursesList')
const { useRowSelection } = await import('@/hooks/useRowSelection')

function curso(id: string, title: string, over: Partial<CourseCardItem> = {}): CourseCardItem {
  return {
    id, title, status: 'PUBLIC', eventNumber: null, startDate: '2026-12-01', endDate: '2026-12-01',
    startTime: null, endTime: null, enrolled: 3, maxStudents: 40, price: 0, coverImage: null,
    photoCount: 0, registrationDeadline: null, location: null, instructorName: null, workloadHours: null,
    ...over,
  }
}

const PROXIMOS = [curso('p1', 'Manejo de Soja'), curso('p2', 'Tratores e Máquinas')]
const ARMAZENADOS = [
  curso('a1', 'Silagem de Milho', { status: 'COMPLETED', startDate: '2026-09-10' }),
  curso('a2', 'Sanidade do Rebanho', { status: 'IN_PROGRESS', startDate: '2026-10-30' }),
]

function pagina(data: CourseCardItem[], over: { total?: number; totalPages?: number; page?: number } = {}) {
  return {
    json: () => Promise.resolve({
      data, total: over.total ?? data.length, page: over.page ?? 1, limit: 8, totalPages: over.totalPages ?? 1,
    }),
  }
}

/** Resposta de cada rota; `listas` diz o que `view=upcoming|stored` devolve. */
function simular(listas: { upcoming?: unknown; stored?: unknown } = {}) {
  apiFetch.mockImplementation((path: string) => {
    if (path === '/admin/me') {
      return Promise.resolve({ json: () => Promise.resolve({ permissions: ['READ_COURSE', 'UPDATE_COURSE', 'CREATE_COURSE', 'DELETE_COURSE'] }) })
    }
    if (path === '/admin/courses/years') return Promise.resolve({ json: () => Promise.resolve([2026, 2025]) })
    const view = new URL(`http://x${path}`).searchParams.get('view')
    const lista = view === 'stored' ? listas.stored : listas.upcoming
    if (lista instanceof Error) return Promise.reject(lista)
    return Promise.resolve(lista ?? pagina(view === 'stored' ? ARMAZENADOS : PROXIMOS))
  })
}

/** Pedidos de lista de cursos feitos até agora (sem `/years` e `/me`). */
function pedidos() {
  return apiFetch.mock.calls
    .map(c => c[0] as string)
    .filter(p => p.startsWith('/admin/courses?'))
    .map(p => new URL(`http://x${p}`).searchParams)
}

const onOpen = vi.fn()
const onCreate = vi.fn()

// Faz o papel da rota: guarda a aba (na rota é o ?lista= da URL) e a seleção.
function Tela({ inicial = 'upcoming' }: { inicial?: CourseView }) {
  const [view, setView] = useState<CourseView>(inicial)
  const [year, setYear] = useState<number | undefined>()
  const selection = useRowSelection()
  return (
    <CoursesList
      view={view}
      onViewChange={setView}
      year={year}
      onYearChange={setYear}
      selection={selection}
      onOpen={onOpen}
      onCreate={onCreate}
      onEdit={vi.fn()}
      onDuplicate={vi.fn()}
      onDelete={vi.fn()}
    />
  )
}

function abrir(inicial: CourseView = 'upcoming') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <Tela inicial={inicial} />
    </QueryClientProvider>,
  )
}

const aba = (nome: string) => screen.getByRole('tab', { name: nome })
// A aba do Radix troca no mouseDown (não no click solto): o userEvent faz os dois.
const trocarAba = (nome: string) => userEvent.setup().click(aba(nome))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('lista de cursos: abas Próximos e Armazenados', () => {
  it('abre em Próximos, pede view=upcoming e mostra só esses cursos', async () => {
    simular()
    abrir()
    expect(await screen.findByText('Manejo de Soja')).toBeInTheDocument()
    expect(screen.getByText('Tratores e Máquinas')).toBeInTheDocument()
    expect(screen.queryByText('Silagem de Milho')).not.toBeInTheDocument()
    expect(aba('Próximos')).toHaveAttribute('aria-selected', 'true')
    expect(aba('Armazenados')).toHaveAttribute('aria-selected', 'false')
    expect(pedidos().map(p => p.get('view'))).toEqual(['upcoming'])
  })

  it('"Armazenados" pede view=stored e troca os cursos da tela', async () => {
    simular()
    abrir()
    await screen.findByText('Manejo de Soja')

    await trocarAba('Armazenados')

    expect(await screen.findByText('Silagem de Milho')).toBeInTheDocument()
    expect(screen.getByText('Sanidade do Rebanho')).toBeInTheDocument()
    expect(screen.queryByText('Manejo de Soja')).not.toBeInTheDocument()
    expect(aba('Armazenados')).toHaveAttribute('aria-selected', 'true')
    expect(pedidos().at(-1)?.get('view')).toBe('stored')
  })

  it('em Armazenados, o curso concluído aparece marcado como concluído', async () => {
    simular()
    abrir('stored')
    const cartao = (await screen.findByText('Silagem de Milho')).closest('.group') as HTMLElement
    expect(within(cartao).getByText('Concluído')).toBeInTheDocument()
    // O que está em andamento continua mostrando o status dele.
    const emAndamento = screen.getByText('Sanidade do Rebanho').closest('.group') as HTMLElement
    expect(within(emAndamento).getByText('Em andamento')).toBeInTheDocument()
    expect(within(emAndamento).queryByText('Concluído')).not.toBeInTheDocument()
  })

  it('voltar para Próximos mostra a lista de Próximos de novo', async () => {
    simular()
    abrir()
    await screen.findByText('Manejo de Soja')
    await trocarAba('Armazenados')
    await screen.findByText('Silagem de Milho')

    await trocarAba('Próximos')

    expect(await screen.findByText('Manejo de Soja')).toBeInTheDocument()
    expect(screen.queryByText('Silagem de Milho')).not.toBeInTheDocument()
    expect(pedidos().at(-1)?.get('view')).toBe('upcoming')
  })

  it('abrir um curso armazenado entrega o curso à janela dele (inscritos, presença e Concluir ficam lá)', async () => {
    simular()
    abrir('stored')
    fireEvent.click(await screen.findByText('Sanidade do Rebanho'))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'a2', status: 'IN_PROGRESS' }))
  })

  it('cada aba tem a sua frase explicando quando o curso muda de aba', async () => {
    simular()
    abrir()
    expect(await screen.findByText(/No dia do início, o curso vai para Armazenados/)).toBeInTheDocument()
    await trocarAba('Armazenados')
    expect(await screen.findByText(/já chegaram ao dia do início/)).toBeInTheDocument()
  })
})

describe('lista de cursos: filtros e página ao trocar de aba', () => {
  it('trocar de aba volta para a página 1', async () => {
    // As duas abas têm várias páginas: se a página 2 de Próximos fosse mantida, o
    // pedido de Armazenados sairia com page=2 e ficaria assim.
    simular({
      upcoming: pagina(PROXIMOS, { total: 30, totalPages: 4 }),
      stored: pagina(ARMAZENADOS, { total: 30, totalPages: 4 }),
    })
    abrir()
    await screen.findByText('Manejo de Soja')

    fireEvent.click(screen.getByRole('button', { name: '2' }))
    await waitFor(() => expect(pedidos().at(-1)?.get('page')).toBe('2'))

    await trocarAba('Armazenados')
    await screen.findByText('Silagem de Milho')
    const deArmazenados = pedidos().filter(p => p.get('view') === 'stored')
    expect(deArmazenados.map(p => p.get('page'))).toEqual(['1'])
  })

  it('a busca continua ao trocar de aba', async () => {
    simular()
    abrir()
    await screen.findByText('Manejo de Soja')

    fireEvent.change(screen.getByPlaceholderText('Buscar por título ou nº do evento'), { target: { value: 'milho' } })
    await waitFor(() => expect(pedidos().at(-1)?.get('search')).toBe('milho'), { timeout: 3000 })
    expect(pedidos().at(-1)?.get('view')).toBe('upcoming')

    await trocarAba('Armazenados')
    await screen.findByText('Silagem de Milho')
    const ultimo = pedidos().at(-1)!
    expect(ultimo.get('view')).toBe('stored')
    expect(ultimo.get('search')).toBe('milho')
  })

  it('trocar de aba zera a seleção: "excluir selecionados" não alcança curso que não está na tela', async () => {
    simular()
    abrir()
    await screen.findByText('Manejo de Soja')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar o curso Manejo de Soja' }))
    expect(screen.getByText('1 selecionado')).toBeInTheDocument()

    await trocarAba('Armazenados')
    await screen.findByText('Silagem de Milho')
    expect(screen.queryByText(/selecionado/)).not.toBeInTheDocument()
  })
})

describe('lista de cursos: vazio e erro por aba', () => {
  it('Próximos vazia, sem filtro: diz que não há curso próximo e oferece "Novo curso"', async () => {
    simular({ upcoming: pagina([]) })
    abrir()
    expect(await screen.findByText('Nenhum curso próximo')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Novo curso/ }))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('Armazenados vazia, sem filtro: diz que não há curso armazenado e não oferece "Novo curso"', async () => {
    simular({ stored: pagina([]) })
    abrir('stored')
    expect(await screen.findByText('Nenhum curso armazenado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Novo curso/ })).not.toBeInTheDocument()
  })

  it('com busca ativa, vazio quer dizer "nada encontrado", não "nenhum curso"', async () => {
    simular({ stored: pagina([]) })
    abrir('stored')
    await screen.findByText('Nenhum curso armazenado')

    fireEvent.change(screen.getByPlaceholderText('Buscar por título ou nº do evento'), { target: { value: 'xyz' } })
    expect(await screen.findByText('Nenhum curso encontrado', undefined, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.queryByText('Nenhum curso armazenado')).not.toBeInTheDocument()
  })

  it('falha ao carregar Armazenados mostra "Tentar de novo", nunca "nenhum curso armazenado"', async () => {
    simular({ stored: new Error('rede') })
    abrir('stored')
    expect(await screen.findByText('Erro ao carregar cursos.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tentar de novo/ })).toBeInTheDocument()
    expect(screen.queryByText('Nenhum curso armazenado')).not.toBeInTheDocument()
  })
})
