import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import '@/i18n'

// Menu lateral do painel: uma seção sem nenhum item permitido não mostra nem o título
// ("Financeiro" e "Configurações" ficavam soltos para quem só vê cursos, SR-126).

let me: { data?: { permissions: string[] }; isLoading: boolean; isError?: boolean }
vi.mock('@/hooks/useAdmin', () => ({
  useMe: () => me,
  useContactMessages: () => ({ data: undefined }),
}))
vi.mock('@/hooks/use-compact-nav', () => ({ useIsCompactNav: () => false }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }))
vi.mock('@/components/nav-user', () => ({ NavUser: () => null }))
vi.mock('@/components/notifications/NotificationBell', () => ({ NotificationBell: () => null }))
vi.mock('@tanstack/react-router', () => ({
  useRouterState: () => ({ location: { pathname: '/admin/dashboard' } }),
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}))

const { AdminSideBar } = await import('@/components/adminSideBar')
const { SidebarProvider } = await import('@/components/ui/sidebar')
const { TooltipProvider } = await import('@/components/ui/tooltip')

function renderMenu() {
  return render(
    <TooltipProvider>
      <SidebarProvider>
        <AdminSideBar />
      </SidebarProvider>
    </TooltipProvider>,
  )
}

const titulos = ['Principal', 'Gestão', 'Financeiro', 'Configurações', 'Suporte']

beforeEach(() => {
  me = { data: undefined, isLoading: false }
})

describe('AdminSideBar: seções sem item permitido', () => {
  it('só com "Visualizar cursos": sem o título de Financeiro nem o de Configurações, e Gestão fica', () => {
    me = { data: { permissions: ['READ_COURSE'] }, isLoading: false }
    renderMenu()
    expect(screen.getByText('Cursos')).toBeInTheDocument()
    expect(screen.queryByText('Notícias')).not.toBeInTheDocument()
    expect(screen.queryByText('Financeiro')).not.toBeInTheDocument()
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument()
    // Painel Geral e Ajuda não pedem permissão.
    expect(screen.getByText('Painel Geral')).toBeInTheDocument()
    expect(screen.getByText('Ajuda')).toBeInTheDocument()
  })

  it('sem nenhuma permissão de Gestão, o título Gestão também some', () => {
    me = { data: { permissions: ['READ_FINANCE'] }, isLoading: false }
    renderMenu()
    expect(screen.queryByText('Gestão')).not.toBeInTheDocument()
    expect(screen.getByText('Financeiro', { selector: '[data-slot="sidebar-group-label"]' })).toBeInTheDocument()
  })

  it('enquanto as permissões carregam, mostra tudo', () => {
    me = { data: undefined, isLoading: true }
    renderMenu()
    for (const t of titulos.filter(t => t !== 'Principal' && t !== 'Suporte')) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0)
    }
    expect(screen.getByText('Cursos')).toBeInTheDocument()
    expect(screen.getByText('Auditoria')).toBeInTheDocument()
  })

  it('com erro ao carregar as permissões, também mostra tudo', () => {
    me = { data: undefined, isLoading: false, isError: true }
    renderMenu()
    expect(screen.getByText('Auditoria')).toBeInTheDocument()
    expect(screen.getAllByText('Financeiro').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Configurações').length).toBeGreaterThan(0)
  })
})
