import * as React from 'react'
import { BookOpen, DoorOpen, LayoutDashboard, Newspaper, Shield, Users } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { NavUser } from '@/components/nav-user'
import { LanguageToggle } from '@/components/LanguageToggle'
import { useMe } from '@/hooks/useAdmin'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator,
} from '@/components/ui/sidebar'

export function AdminSideBar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { location } = useRouterState()
  const { t } = useTranslation()
  const { data: me } = useMe()

  const { isLoading: loadingMe } = useMe()
  const perms = me?.permitions ?? null

  function can(perm: string) {
    if (loadingMe || !perms) return true // ainda carregando → mostra tudo
    return perms.includes(perm)
  }

  const user = {
    name: me?.username ?? 'Administrador',
    email: '',
    avatar: '',
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
      ],
    },
    {
      label: t('admin.sidebar.settings'),
      items: [
        { title: t('admin.sidebar.rules'), url: '/admin/regras', icon: Shield, perm: 'READ_RULE' },
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
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <BookOpen className="size-4" />
                </div>
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
        <div className="px-2">
          <LanguageToggle variant="outline" />
        </div>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
