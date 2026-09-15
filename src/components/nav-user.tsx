import { LogOut } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { InitialsAvatar } from '@/components/InitialsAvatar'
import {
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useAuth } from '@/context/AuthContext'
import { useMe } from '@/hooks/useAdmin'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'

export function NavUser({ user }: { user: { name: string; email: string; avatar: string } }) {
  const { logout } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: me } = useMe()

  function handleLogout() {
    logout()
    queryClient.clear()
    window.location.replace('/login')
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild size="lg" tooltip="Minha conta">
          <Link to="/admin/minha-conta">
            <InitialsAvatar name={user.name} avatar={user.avatar || undefined} size="sm" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{me?.ruleName ?? ''}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={handleLogout} tooltip={t('admin.navUser.logout')}>
          <LogOut />
          <span>{t('admin.navUser.logout')}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
