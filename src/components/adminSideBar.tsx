import * as React from 'react'
import { BookOpen, DoorOpen, Images, LayoutDashboard, Mail, Newspaper, ScrollText, TrendingUp, Users } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { NavUser } from '@/components/nav-user'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useMe, useAdminUser, useContactMessages } from '@/hooks/useAdmin'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuBadge, SidebarSeparator,
} from '@/components/ui/sidebar'

export function AdminSideBar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { location } = useRouterState()
  const { t } = useTranslation()
  const { data: me, isLoading: loadingMe } = useMe()
  const { data: meUser } = useAdminUser(me?.userDataId ?? '')
  const perms = me?.permissions ?? null

  // Contagem global de mensagens de contato não lidas (badge na sidebar).
  const { data: unreadData } = useContactMessages({ page: 1, limit: 1, read: false })
  const unread = unreadData?.total ?? 0

  function can(perm: string) {
    if (loadingMe || !perms) return true // ainda carregando → mostra tudo
    return perms.includes(perm)
  }

  const user = {
    name: me?.username ?? 'Administrador',
    email: meUser?.email ?? '',
    avatar: meUser?.avatar ?? '',
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
        { title: t('admin.sidebar.news'), url: '/admin/noticias', icon: Newspaper, perm: 'READ_COURSE' },
        { title: t('admin.sidebar.users'), url: '/admin/usuarios', icon: Users, perm: 'READ_USER' },
        { title: t('admin.sidebar.rooms'), url: '/admin/salas', icon: DoorOpen, perm: 'READ_COURSE' },
        { title: 'Banners', url: '/admin/banners', icon: Images, perm: 'READ_BANNER' },
        { title: 'Cotações', url: '/admin/cotacoes', icon: TrendingUp, perm: 'READ_MARKET_QUOTE' },
        { title: 'Mensagens', url: '/admin/mensagens', icon: Mail, perm: 'READ_CONTACT' },
        { title: 'Auditoria', url: '/admin/auditoria', icon: ScrollText, perm: 'READ_AUDIT' },
      ],
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {navSections.map((section, i) => (
          <React.Fragment key={section.label}>
            {i > 0 && <SidebarSeparator className="my-2" />}
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-1">
                {section.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.filter(item => !item.perm || can(item.perm)).map((item) => {
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
        <div className="flex items-center gap-2 px-2">
          <div className="flex-1">
            <LanguageToggle variant="outline" />
          </div>
          <ThemeToggle />
        </div>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
