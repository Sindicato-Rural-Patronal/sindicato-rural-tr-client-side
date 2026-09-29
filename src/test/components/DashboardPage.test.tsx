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
  // O painel usa useUnsavedGuard (useBlocker) enquanto organiza os blocos.
  useBlocker: () => ({ status: 'idle' }),
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

/**
 * Quantas colunas o bloco ocupa no desenho. A grade do painel tem 4 colunas no
 * computador e todo bloco cobre de 2 a 4 (`lg:col-span-N`).
 */
function larguraDe(id: string): 2 | 3 | 4 {
  const el = document.querySelector(`[data-bloco="${id}"]`)
  if (!el) throw new Error(`Bloco "${id}" não está na tela`)
  for (const span of [2, 3, 4] as const) {
    if (el.classList.contains(`lg:col-span-${span}`)) return span
  }
  throw new Error(`Bloco "${id}" está sem classe de largura`)
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

  it('preferências salvas valem ao abrir a tela', () => {
    prefs = { hidden: ['cursos'], order: [] }
    render(<Painel />)
    expect(screen.queryByText('Cursos públicos')).not.toBeInTheDocument()
    expect(screen.getByTestId('agenda')).toBeInTheDocument()
  })

  it('largura salva no formato antigo continua valendo (full/half → 4/2)', () => {
    prefs = { hidden: [], order: [], sizes: { cursos: 'full', incompletos: 'half', auditoria: 'half' } }
    render(<Painel />)
    expect(larguraDe('cursos')).toBe(4)
    expect(larguraDe('incompletos')).toBe(2)
    // Sozinho no fim da lista, o bloco estreito NÃO estica (era o bug).
    expect(larguraDe('auditoria')).toBe(2)
  })

  it('fora do modo de organizar não há controles de bloco', () => {
    render(<Painel />)
    expect(screen.queryByRole('region', { name: 'Organizar o painel' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remover/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /Segure e arraste para mudar de lugar/ })).not.toBeInTheDocument()
    // Nem alça de redimensionar: o painel normal não se mexe.
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })
})

// ─── modo de organizar (edição direto no painel) ─────────────────────────────

/** Abre o modo de organizar e devolve a moldura arrastável de um bloco. */
function moldura(nome: string) {
  return screen.getByRole('group', { name: new RegExp(`^${nome}\\. Segure e arraste`) })
}

/** Todas as molduras que estão no painel agora. */
function molduras() {
  return screen.queryAllByRole('group', { name: /Segure e arraste para mudar de lugar/ })
}

function organizar() {
  render(<Painel />)
  fireEvent.click(screen.getByRole('button', { name: /Personalizar/ }))
}

function enviado() {
  return salvarPrefs.mock.calls[0][0] as { hidden: string[]; order: string[]; sizes: Record<string, unknown> }
}

describe('Painel Geral — organizar os blocos', () => {
  it('"Personalizar" congela o painel e deixa só dois controles por bloco', () => {
    organizar()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Organizar o painel' })).toBeInTheDocument()
    // Os blocos continuam desenhados inteiros, agora congelados e arrastáveis.
    expect(molduras()).toHaveLength(8)
    expect(screen.getByTestId('agenda')).toBeInTheDocument()

    const cartao = moldura('Cursos públicos')
    expect(within(cartao).getByRole('button', { name: 'Remover Cursos públicos do painel' })).toBeInTheDocument()
    // A alça do canto diz de quem é e qual o tamanho de agora.
    const alca = within(cartao).getByRole('slider', { name: 'Largura de Cursos públicos' })
    expect(alca).toHaveAttribute('aria-valuetext', 'Meia linha')
    expect(alca).toHaveAttribute('tabindex', '0')

    // Botão de aumentar/diminuir não existe mais: quem manda é a alça.
    for (const sumiu of [/^Arrastar/, /^Subir/, /^Descer/, /^Aumentar/, /^Diminuir/, /^Esconder/, /^Mostrar/]) {
      expect(screen.queryByRole('button', { name: sumiu })).not.toBeInTheDocument()
    }
  })

  it('"Remover" tira o bloco do painel e o "Adicionar" traz de volta', async () => {
    organizar()
    fireEvent.click(screen.getByRole('button', { name: 'Remover Cursos públicos do painel' }))

    // Some do painel (não fica apagadinho no meio) e vira botão no fim da tela.
    expect(molduras()).toHaveLength(7)
    const fora = screen.getByRole('region', { name: 'Blocos que não estão no painel' })
    const voltar = within(fora).getByRole('button', { name: 'Adicionar Cursos públicos' })

    fireEvent.click(voltar)
    expect(molduras()).toHaveLength(8)
    expect(screen.queryByRole('region', { name: 'Blocos que não estão no painel' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remover Últimas ações do painel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(salvarPrefs).toHaveBeenCalled())
    expect(enviado().hidden).toEqual(['auditoria'])
    expect(enviado().order).toHaveLength(8)
    // Depois de salvar a tela volta ao normal.
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Organizar o painel' })).not.toBeInTheDocument())
  })

  it('as setas na alça andam de uma coluna por vez, entre 2 e 4', async () => {
    organizar()
    const alca = screen.getByRole('slider', { name: 'Largura de Calendário e agenda das salas' })
    expect(alca).toHaveAttribute('aria-valuetext', 'Linha inteira')
    expect(larguraDe('agenda')).toBe(4)

    // ← encolhe uma coluna (e o desenho muda de verdade, não só o rótulo).
    fireEvent.keyDown(alca, { key: 'ArrowLeft' })
    expect(larguraDe('agenda')).toBe(3)
    expect(screen.getByRole('slider', { name: 'Largura de Calendário e agenda das salas' }))
      .toHaveAttribute('aria-valuetext', 'Três quartos da linha')

    fireEvent.keyDown(alca, { key: 'ArrowDown' })
    expect(larguraDe('agenda')).toBe(2)
    // Não existe menos de 2: insistir no ← não encolhe mais.
    fireEvent.keyDown(alca, { key: 'ArrowLeft' })
    expect(larguraDe('agenda')).toBe(2)

    fireEvent.keyDown(alca, { key: 'ArrowRight' })
    expect(larguraDe('agenda')).toBe(3)

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(salvarPrefs).toHaveBeenCalled())
    expect(enviado().sizes).toMatchObject({ agenda: 3, numeros: 4, cursos: 2 })
  })

  it('bloco estreito sozinho no painel não estica', () => {
    organizar()
    // Sem vizinho, "Últimas ações" continua com 2 colunas.
    expect(larguraDe('auditoria')).toBe(2)
    fireEvent.click(screen.getByRole('button', { name: 'Remover Cadastros incompletos do painel' }))
    expect(larguraDe('cursos')).toBe(2)
    expect(larguraDe('auditoria')).toBe(2)
  })

  it('a alça não começa a mover o bloco nem dispara o teclado do arrasto', () => {
    organizar()
    const alca = screen.getByRole('slider', { name: 'Largura de Últimas ações' })
    // O cartão inteiro (e o @dnd-kit dentro dele) escuta ponteiro e teclado: a
    // alça precisa interromper os dois, senão puxar o canto sairia arrastando o
    // bloco de lugar e as setas o mandariam para outra posição. Um ouvinte no
    // documento só é chamado se o evento passar batido pelo cartão.
    const escapou = vi.fn()
    document.addEventListener('pointerdown', escapou)
    document.addEventListener('keydown', escapou)
    try {
      fireEvent.pointerDown(alca, { button: 0, clientX: 100, pointerId: 1 })
      fireEvent.keyDown(alca, { key: 'ArrowRight' })
      expect(escapou).not.toHaveBeenCalled()
    } finally {
      document.removeEventListener('pointerdown', escapou)
      document.removeEventListener('keydown', escapou)
    }
    // ...mas a largura mudou, que é o trabalho dela (2 → 3 colunas).
    expect(larguraDe('auditoria')).toBe(3)
  })

  it('Cancelar joga fora o rascunho e não salva nada', () => {
    organizar()
    fireEvent.click(screen.getByRole('button', { name: 'Remover Cursos públicos do painel' }))
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/ }))

    expect(salvarPrefs).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Organizar o painel' })).not.toBeInTheDocument()
    expect(screen.getByText('Cursos públicos')).toBeInTheDocument()
  })

  it('"Restaurar padrão" volta ao layout de fábrica (e só salva ao clicar em Salvar)', async () => {
    prefs = { hidden: ['cursos', 'auditoria'], order: ['auditoria', 'acoes'], sizes: { agenda: 2 } }
    organizar()
    expect(molduras()).toHaveLength(6)
    fireEvent.click(screen.getByRole('button', { name: /Restaurar padrão/ }))

    expect(salvarPrefs).not.toHaveBeenCalled()
    expect(molduras()).toHaveLength(8)
    expect(screen.queryByRole('region', { name: 'Blocos que não estão no painel' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(salvarPrefs).toHaveBeenCalled())
    expect(enviado().hidden).toEqual([])
    expect(enviado().order[0]).toBe('acoes')
    expect(enviado().sizes.agenda).toBe(4)
  })

  it('avisa que há alterações não salvas', () => {
    organizar()
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument()
    const alca = screen.getByRole('slider', { name: 'Largura de Financeiro do mês' })
    // Encolher já conta como alteração; repetir a mesma largura não muda nada.
    fireEvent.keyDown(alca, { key: 'ArrowRight' })
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument()
    fireEvent.keyDown(alca, { key: 'ArrowLeft' })
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
  })

  it('bloco sem permissão nem entra na organização', () => {
    permissoes = ['READ_USER', 'READ_COURSE', 'CREATE_USER']
    organizar()
    expect(screen.queryByRole('button', { name: /^Remover Financeiro do mês/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remover Últimas ações/ })).not.toBeInTheDocument()
    expect(moldura('Cadastros incompletos')).toBeInTheDocument()
  })

  it('erro ao salvar avisa e mantém o modo de organizar aberto', async () => {
    salvarPrefs.mockRejectedValueOnce(new Error('sem rede'))
    organizar()
    fireEvent.click(screen.getByRole('button', { name: 'Remover Cursos públicos do painel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(salvarPrefs).toHaveBeenCalled())
    expect(screen.getByRole('region', { name: 'Organizar o painel' })).toBeInTheDocument()
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
