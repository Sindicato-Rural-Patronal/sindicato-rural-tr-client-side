import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { DashboardPrefs, DashboardStats } from '@/hooks/useAdmin'

// Painel Geral com tudo simulado: o teste olha só a tela (quais blocos
// aparecem por permissão, os atalhos e a personalização).

const onSearch = vi.fn()
const onOpenCourse = vi.fn()
const salvarPrefs = vi.fn()
let searchParams: Record<string, unknown> = {}
let permissoes: string[] = []
let stats: DashboardStats | undefined
let statsState = { isLoading: false, isError: false }
let prefs: DashboardPrefs | null = null

type LinkProps = { children?: ReactNode; to?: string; search?: unknown; params?: unknown; className?: string }

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className }: LinkProps) => <a href={to} className={className}>{children}</a>,
}))

vi.mock('@tanstack/react-query', async importOriginal => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQuery: () => ({ data: [], isLoading: false, isError: false }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    can: (p: string) => permissoes.includes(p),
    cannot: (p: string) => !permissoes.includes(p),
    isLoading: false,
    perms: permissoes,
  }),
}))

vi.mock('@/hooks/useAdmin', () => ({
  useMe: () => ({ data: { name: 'Bali', permissions: permissoes, dashboardPrefs: prefs } }),
  useAdminStats: () => ({ data: stats, ...statsState }),
  useAdminUsers: () => ({ data: { data: [], total: 0, page: 1, limit: 5, totalPages: 1 }, isError: false }),
  useUpdateDashboardPrefs: () => ({ mutateAsync: salvarPrefs, isPending: false }),
}))

vi.mock('@/hooks/useRooms', () => ({ useRooms: () => ({ data: [{ id: 'r1', name: 'AUDITORIO' }] }) }))
vi.mock('@/hooks/useCourse', () => ({
  useAdminCourses: () => ({
    data: {
      data: [
        { id: 'c1', title: 'Curso de Soja', enrolled: 40, maxStudents: 40, registrationDeadline: '2026-12-01', instructorName: null, workloadHours: 8 },
      ],
      total: 1, page: 1, limit: 5, totalPages: 1,
    },
    isLoading: false,
    isError: false,
  }),
}))
vi.mock('@/hooks/useFinance', () => ({
  useFinanceSummary: () => ({
    data: { periodInCents: 150000, periodOutCents: 50000, periodResultCents: 100000 },
    isLoading: false,
    isError: false,
  }),
}))
vi.mock('@/hooks/useAuditTrail', () => ({
  useAuditTrail: () => ({
    data: { data: [{ id: 'a1', summary: 'Editou o curso "Soja"', actorName: 'Bali', createdAt: new Date().toISOString(), method: 'PATCH', entity: 'course', targetLabel: null, statusCode: 200, actorId: null, path: '/x' }], total: 1, page: 1, limit: 5, totalPages: 1 },
    isLoading: false,
    isError: false,
  }),
}))
vi.mock('@/components/agenda/AgendaSection', () => ({
  AgendaSection: ({ dia }: { dia: string }) => <div data-testid="agenda">Agenda de {dia}</div>,
}))

const { DashboardPage } = await import('@/components/dashboard/DashboardPage')

function Painel() {
  return <DashboardPage search={searchParams} onSearch={onSearch} onOpenCourse={onOpenCourse} />
}

const TODAS = [
  'READ_USER', 'CREATE_USER', 'READ_COURSE', 'CREATE_COURSE',
  'READ_FINANCE', 'READ_AUDIT', 'UPDATE_MARKET_QUOTE', 'READ_CONTACT',
]

function statsCompletas(): DashboardStats {
  return {
    courses: { total: 12, public: 3, private: 1, unpublished: 2, inProgress: 1, completed: 5 },
    totalUsers: 340,
    totalAdmins: 4,
    totalRooms: 6,
    registrations: { last30Days: 21, pendingConfirmation: 5 },
    coursesStartingIn7Days: 0,
    unreadMessages: 2,
    membershipsExpiring30Days: 7,
    quotesToday: { launched: true, period: 'MORNING' },
  }
}

beforeEach(() => {
  onSearch.mockReset()
  onOpenCourse.mockReset()
  salvarPrefs.mockReset().mockResolvedValue({})
  searchParams = {}
  permissoes = [...TODAS]
  stats = statsCompletas()
  statsState = { isLoading: false, isError: false }
  prefs = null
})

describe('Painel Geral', () => {
  it('mostra os números que pedem ação, cada um com link', () => {
    render(<Painel />)
    expect(screen.getByText('Inscrições a confirmar')).toBeInTheDocument()
    expect(screen.getByText('Mensagens não lidas').closest('a')).toHaveAttribute('href', '/admin/mensagens')
    expect(screen.getByText('Associações vencendo').closest('a')).toHaveAttribute('href', '/admin/usuarios')
    expect(screen.getByText('Cursos começando').closest('a')).toHaveAttribute('href', '/admin/cursos')
    // Números de apoio saíram dos cartões e viraram uma linha discreta.
    expect(screen.getByText(/6 salas/)).toBeInTheDocument()
    expect(screen.getByText(/4 administradores/)).toBeInTheDocument()
  })

  it('cartão com zero continua na tela', () => {
    render(<Painel />)
    const card = screen.getByText('Cursos começando').closest('a')
    expect(within(card as HTMLElement).getByText('0')).toBeInTheDocument()
  })

  it('não desenha o cartão do número que o admin não pode ver', () => {
    stats = { totalUsers: 340, registrations: { last30Days: 3, pendingConfirmation: 1 } }
    permissoes = ['READ_USER']
    render(<Painel />)
    expect(screen.queryByText('Mensagens não lidas')).not.toBeInTheDocument()
    expect(screen.queryByText('Associações vencendo')).not.toBeInTheDocument()
    expect(screen.getByText('Pessoas cadastradas')).toBeInTheDocument()
    // Sem READ_COURSE a página continua útil: sem agenda, sem cursos públicos.
    expect(screen.queryByTestId('agenda')).not.toBeInTheDocument()
    expect(screen.queryByText('Cursos públicos')).not.toBeInTheDocument()
  })

  it('erro nas estatísticas avisa em vez de deixar esqueleto girando', () => {
    stats = undefined
    statsState = { isLoading: false, isError: true }
    render(<Painel />)
    expect(screen.getByText('Erro ao carregar os números do painel.')).toBeInTheDocument()
  })

  it('Financeiro e Últimas ações dependem da permissão', () => {
    render(<Painel />)
    expect(screen.getByText(/Financeiro em/)).toBeInTheDocument()
    expect(screen.getByText('Últimas ações')).toBeInTheDocument()
  })

  it('sem READ_FINANCE nem READ_AUDIT esses blocos somem', () => {
    permissoes = ['READ_USER', 'READ_COURSE']
    render(<Painel />)
    expect(screen.queryByText(/Financeiro em/)).not.toBeInTheDocument()
    expect(screen.queryByText('Últimas ações')).not.toBeInTheDocument()
  })

  it('atalhos do topo respeitam a permissão e a "Nova reserva" avisa a agenda', () => {
    render(<Painel />)
    expect(screen.getByRole('link', { name: /Novo associado/ })).toHaveAttribute('href', '/admin/usuarios/novo')
    expect(screen.getByRole('link', { name: /Lançar cotação/ })).toHaveAttribute('href', '/admin/cotacoes')

    fireEvent.click(screen.getByRole('button', { name: /Nova reserva/ }))
    expect(onSearch).toHaveBeenCalledWith({ nova: 'reserva' })
  })

  it('sem permissão de cadastro o atalho não aparece', () => {
    permissoes = ['READ_USER']
    render(<Painel />)
    expect(screen.queryByRole('link', { name: /Novo associado/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Nova reserva/ })).not.toBeInTheDocument()
  })

  it('aviso das cotações do dia', () => {
    render(<Painel />)
    expect(screen.getByText('Cotações de hoje lançadas (manhã)')).toBeInTheDocument()
  })

  it('personalizar esconde um bloco e salva as preferências', async () => {
    render(<Painel />)
    fireEvent.click(screen.getByRole('button', { name: /Personalizar/ }))
    const janela = screen.getByRole('dialog')
    fireEvent.click(within(janela).getByLabelText(/^Cursos públicos/))
    fireEvent.click(within(janela).getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(salvarPrefs).toHaveBeenCalled())
    const enviado = salvarPrefs.mock.calls[0][0] as { hidden: string[]; order: string[] }
    expect(enviado.hidden).toContain('cursos')
    expect(enviado.order).toHaveLength(8)
  })

  it('"Restaurar padrão" volta ao layout de fábrica', async () => {
    prefs = { hidden: ['cursos', 'auditoria'], order: ['auditoria', 'acoes'] }
    render(<Painel />)
    fireEvent.click(screen.getByRole('button', { name: /Personalizar/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Restaurar padrão/ }))

    await waitFor(() => expect(salvarPrefs).toHaveBeenCalledWith({ hidden: [], order: expect.arrayContaining(['acoes', 'numeros']) }))
  })

  it('preferências salvas valem ao abrir a tela', () => {
    prefs = { hidden: ['cursos'], order: [] }
    render(<Painel />)
    expect(screen.queryByText('Cursos públicos')).not.toBeInTheDocument()
    expect(screen.getByTestId('agenda')).toBeInTheDocument()
  })

  it('o calendário segue o dia que veio na URL', () => {
    searchParams = { dia: '2026-12-10' }
    render(<Painel />)
    expect(screen.getByText('Dezembro 2026')).toBeInTheDocument()
    expect(screen.getByTestId('agenda')).toHaveTextContent('Agenda de 2026-12-10')
    // Dia com nome legível e estado marcado (não é só a cor).
    expect(screen.getByRole('button', { name: /^10 de Dezembro de 2026/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
