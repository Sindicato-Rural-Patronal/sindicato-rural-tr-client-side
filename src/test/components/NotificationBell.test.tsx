import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { NotificationsResponse } from '@/hooks/useNotifications'

// Hooks e roteador simulados: o teste cobre só a tela do sino.
const navigate = vi.fn()
const mutate = vi.fn()
const refetch = vi.fn()
let query: { data?: NotificationsResponse; isLoading: boolean; isError: boolean; isFetching: boolean; refetch: typeof refetch }
let mobile = false

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobile }))
vi.mock('@/hooks/useNotifications', async importOriginal => ({
  ...(await importOriginal<typeof import('@/hooks/useNotifications')>()),
  useNotifications: () => query,
  useMarkNotificationsRead: () => ({ mutate }),
}))

const { NotificationBell } = await import('@/components/notifications/NotificationBell')
const { markReadLocally } = await import('@/hooks/useNotifications')

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

function sample(): NotificationsResponse {
  return {
    unreadCount: 2,
    pendingCount: 2,
    events: [
      { id: 'e1', type: 'REGISTRATION', title: 'Nova inscrição', body: 'Maria em Curso de Soja', link: '/admin/cursos?curso=c1&aba=inscricoes', createdAt: minutesAgo(5), read: false },
      { id: 'e2', type: 'CONTACT', title: 'Mensagem recebida', body: null, link: '/admin/mensagens', createdAt: minutesAgo(180), read: false },
      { id: 'e3', type: 'CONTACT', title: 'Mensagem antiga', body: null, link: null, createdAt: minutesAgo(10), read: true },
    ],
    pending: [
      { type: 'INCOMPLETE', title: 'Cadastros incompletos', body: 'Pessoas sem CPF ou telefone', count: 7, link: '/admin/usuarios?incomplete=true', severity: 'info' },
      { type: 'MESSAGES', title: 'Mensagens sem resposta', body: null, count: 3, link: '/admin/mensagens', severity: 'warning' },
    ],
  }
}

function setQuery(partial: Partial<typeof query>) {
  query = { data: undefined, isLoading: false, isError: false, isFetching: false, refetch, ...partial }
}

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: /^Notificações/ }))
  return screen.getByRole('dialog')
}

beforeEach(() => {
  navigate.mockReset()
  mutate.mockReset()
  refetch.mockReset()
  mobile = true
  setQuery({ data: sample() })
})

describe('NotificationBell', () => {
  it('número = avisos não lidos + pendências importantes', () => {
    mobile = false
    render(<NotificationBell />)
    expect(screen.getByRole('button', { name: 'Notificações, 3 novas' })).toBeInTheDocument()
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('3')
  })

  it('no computador abre em popover com as duas seções', () => {
    mobile = false
    render(<NotificationBell />)
    fireEvent.click(screen.getByRole('button', { name: /^Notificações/ }))
    expect(screen.getByRole('heading', { name: 'Notificações' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Pendências' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Avisos' })).toBeInTheDocument()
  })

  it('acima de 9 mostra "9+"; sem nada novo não mostra número', () => {
    setQuery({ data: { ...sample(), unreadCount: 12 } })
    const { unmount } = render(<NotificationBell />)
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('9+')
    expect(screen.getByRole('button', { name: 'Notificações, 13 novas' })).toBeInTheDocument()
    unmount()

    setQuery({ data: { ...sample(), unreadCount: 0, pending: [] } })
    render(<NotificationBell />)
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Notificações' })).toBeInTheDocument()
  })

  it('mostra pendências (importantes primeiro) e avisos', () => {
    render(<NotificationBell />)
    const panel = openPanel()
    const pendencias = within(panel).getByRole('region', { name: 'Pendências' })
    const itens = within(pendencias).getAllByRole('listitem')
    expect(itens[0]).toHaveTextContent('Mensagens sem resposta')
    expect(itens[0]).toHaveTextContent('3')
    expect(itens[1]).toHaveTextContent('Cadastros incompletos')
    expect(itens[1]).toHaveTextContent('7')

    const avisos = within(panel).getByRole('region', { name: 'Avisos' })
    expect(within(avisos).getByText('há 5 min')).toBeInTheDocument()
    expect(within(avisos).getByText('há 3 h')).toBeInTheDocument()
    expect(within(avisos).getAllByText('(não lido)')).toHaveLength(2)
    expect(within(panel).getByRole('button', { name: /Marcar todas como lidas/ })).toBeInTheDocument()
  })

  it('clicar num aviso marca como lido e abre a tela pelo roteador', () => {
    render(<NotificationBell />)
    const panel = openPanel()
    fireEvent.click(within(panel).getByRole('button', { name: /Nova inscrição/ }))
    expect(mutate).toHaveBeenCalledWith(['e1'])
    expect(navigate).toHaveBeenCalledWith({ href: '/admin/cursos?curso=c1&aba=inscricoes' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('aviso já lido sem link não chama nada', () => {
    render(<NotificationBell />)
    const panel = openPanel()
    fireEvent.click(within(panel).getByRole('button', { name: /Mensagem antiga/ }))
    expect(mutate).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('clicar numa pendência abre a tela e fecha o painel', () => {
    render(<NotificationBell />)
    const panel = openPanel()
    fireEvent.click(within(panel).getByRole('button', { name: /Cadastros incompletos/ }))
    expect(navigate).toHaveBeenCalledWith({ href: '/admin/usuarios?incomplete=true' })
    expect(mutate).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('"Marcar todas como lidas" marca tudo', () => {
    render(<NotificationBell />)
    const panel = openPanel()
    fireEvent.click(within(panel).getByRole('button', { name: /Marcar todas como lidas/ }))
    expect(mutate).toHaveBeenCalledWith(undefined, expect.anything())
  })

  it('sem nada: mensagens de vazio e sem "Marcar todas"', () => {
    setQuery({ data: { unreadCount: 0, pendingCount: 0, events: [], pending: [] } })
    render(<NotificationBell />)
    const panel = openPanel()
    expect(within(panel).getByText('Nada pendente.')).toBeInTheDocument()
    expect(within(panel).getByText('Nenhum aviso nos últimos 30 dias.')).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: /Marcar todas/ })).not.toBeInTheDocument()
  })

  it('carregando mostra o esqueleto', () => {
    setQuery({ isLoading: true })
    render(<NotificationBell />)
    const panel = openPanel()
    expect(within(panel).getByLabelText('Carregando notificações')).toBeInTheDocument()
  })

  it('erro mostra a mensagem e "Tentar de novo"', () => {
    setQuery({ isError: true })
    render(<NotificationBell />)
    const panel = openPanel()
    expect(within(panel).getByText('Não foi possível carregar as notificações.')).toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: /Tentar de novo/ }))
    expect(refetch).toHaveBeenCalled()
  })
})

describe('markReadLocally', () => {
  it('marca os avisos escolhidos e desce o contador só pelos não lidos', () => {
    const next = markReadLocally(sample(), ['e1', 'e3'])
    expect(next.unreadCount).toBe(1)
    expect(next.events.map(e => e.read)).toEqual([true, false, true])
  })

  it('sem ids marca todos e zera o contador', () => {
    const next = markReadLocally(sample())
    expect(next.unreadCount).toBe(0)
    expect(next.events.every(e => e.read)).toBe(true)
  })
})
