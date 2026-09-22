import * as React from 'react'
import { BookOpen, HeartHandshake, HeartPulse, HelpCircle, Images, LayoutDashboard, Mail, Newspaper, ScrollText, Search, Settings, TrendingUp, Users, Wallet } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { NavUser } from '@/components/nav-user'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useMe, useContactMessages } from '@/hooks/useAdmin'
import { openCommandPalette } from '@/lib/command-palette'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuBadge, SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'

export function AdminSideBar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { location } = useRouterState()
  const { t } = useTranslation()
  const { isMobile, setOpenMobile } = useSidebar()
  const { data: me, isLoading: loadingMe } = useMe()
  const perms = me?.permissions ?? null

  // Contagem global de mensagens de contato não lidas (badge na sidebar).
  const { data: unreadData } = useContactMessages({ page: 1, limit: 1, read: false }, { refetchInterval: 60_000 })
  const unread = unreadData?.total ?? 0

  function can(perm: string) {
    if (loadingMe || !perms) return true // ainda carregando → mostra tudo
    return perms.includes(perm)
  }

  function openSearch() {
    // No celular a barra lateral cobre a tela: fecha antes de abrir a busca.
    if (isMobile) setOpenMobile(false)
    openCommandPalette()
  }

  const user = {
    name: me?.name ?? me?.username ?? 'Administrador',
    email: '',
    avatar: me?.avatar ?? '',
  }

  const navSections = [
    {
      label: t('admin.sidebar.main'),
      items: [
        { title: t('admin.sidebar.dashboard'), url: '/admin/dashboard', icon: LayoutDashboard, perm: null },
      ],
    },
    {
      label: t('admin.sidebar.management'),
      items: [
        { title: t('admin.sidebar.courses'), url: '/admin/cursos', icon: BookOpen, perm: 'READ_COURSE' },
        { title: t('admin.sidebar.news'), url: '/admin/noticias', icon: Newspaper, perm: 'READ_NEWS' },
        { title: t('admin.sidebar.users'), url: '/admin/usuarios', icon: Users, perm: 'READ_USER' },
        { title: t('admin.sidebar.unimed'), url: '/admin/unimed', icon: HeartPulse, perm: 'READ_USER' },
        { title: t('admin.sidebar.banners'), url: '/admin/banners', icon: Images, perm: 'READ_BANNER' },
        { title: t('admin.sidebar.quotes'), url: '/admin/cotacoes', icon: TrendingUp, perm: 'READ_MARKET_QUOTE' },
        { title: t('admin.sidebar.convenios'), url: '/admin/convenios', icon: HeartHandshake, perm: 'READ_CONVENIO' },
        { title: t('admin.sidebar.messages'), url: '/admin/mensagens', icon: Mail, perm: 'READ_CONTACT' },
        { title: t('admin.sidebar.audit'), url: '/admin/auditoria', icon: ScrollText, perm: 'READ_AUDIT' },
      ],
    },
    {
      label: t('admin.sidebar.finance'),
      items: [
        { title: t('admin.sidebar.finance'), url: '/admin/financeiro', icon: Wallet, perm: 'READ_FINANCE' },
      ],
    },
    {
      label: t('admin.sidebar.settings'),
      items: [
        { title: t('admin.sidebar.settings'), url: '/admin/configuracoes', icon: Settings, perm: ['READ_BANNER', 'READ_USER'] },
      ],
    },
    {
      // Documentação interna do painel: aberta a qualquer administrador.
      label: t('admin.sidebar.support'),
      items: [
        { title: t('admin.sidebar.help'), url: '/admin/ajuda', icon: HelpCircle, perm: null },
      ],
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border py-3">
        <SidebarMenu>
          {/* Sino ao lado do logo; com a barra recolhida (só ícones) fica embaixo dele. */}
          <SidebarMenuItem className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col">
            <SidebarMenuButton size="lg" asChild className="min-w-0 flex-1">
              <Link to="/admin/dashboard">
                <img
                  src="/favicon.ico"
                  alt="Sindicato Rural"
                  className="size-8 rounded object-contain shrink-0"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Sindicato Rural</span>
                  <span className="truncate text-xs text-muted-foreground">Terra Roxa – PR</span>
                </div>
              </Link>
            </SidebarMenuButton>
            {/* No celular o sino fica no topo da tela (_admin.tsx), não dentro da barra. */}
            {!isMobile && (
              <NotificationBell side="right" align="start" className="group-data-[collapsible=icon]:size-8" />
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {/* Busca de telas (mesma paleta do Ctrl+K). */}
        <SidebarMenu className="mb-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={openSearch}
              tooltip={`${t('admin.sidebar.search')} (Ctrl+K)`}
              className="h-10 rounded-lg border border-sidebar-border text-muted-foreground"
            >
              <Search className="size-4" />
              <span>{t('admin.sidebar.search')}</span>
              <kbd className="ml-auto hidden rounded border border-sidebar-border px-1.5 py-0.5 text-[10px] font-medium md:inline group-data-[collapsible=icon]:hidden">
                Ctrl K
              </kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {navSections.map((section, i) => (
          <React.Fragment key={section.label}>
            {i > 0 && <SidebarSeparator className="my-2" />}
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-1">
                {section.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.filter(item => !item.perm || (Array.isArray(item.perm) ? item.perm.some(can) : can(item.perm))).map((item) => {
                    const active = location.pathname.startsWith(item.url)
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          isActive={active}
                          tooltip={item.title}
                          asChild
                          className="h-10 rounded-lg transition-all"
                        >
                          <Link to={item.url as never}>
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                        {item.url === '/admin/mensagens' && unread > 0 && (
                          <SidebarMenuBadge className="bg-primary text-primary-foreground">
                            {unread > 99 ? '99+' : unread}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </React.Fragment>
        ))}
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-2 pb-3">
        {/* O tema fica em Minha conta → Preferências. */}
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
