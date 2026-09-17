// src/routes/_admin.tsx
import { AdminSideBar } from '@/components/adminSideBar'
import { CommandPalette } from '@/components/CommandPalette'
import { LeaveConfirmHost } from '@/components/confirm-close-dialog'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { useSessionRenewal } from '@/context/AuthContext'
import { isTokenValid, safeAdminRedirect } from '@/lib/auth-token'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_admin')({
  beforeLoad: ({ location }) => {
    const token = localStorage.getItem('token')
    if (!isTokenValid(token)) {
      localStorage.removeItem('token')
      // Guarda a tela pedida para voltar a ela depois do login.
      throw redirect({
        to: '/login',
        search: { redirect: safeAdminRedirect(location.pathname + location.searchStr) },
      })
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  useSessionRenewal()

  return (
    <SidebarProvider>
      <CommandPalette />
      <LeaveConfirmHost />
      <AdminSideBar />
      <SidebarInset className="overflow-y-auto">
        <header className="flex h-12 items-center gap-3 border-b px-4 md:hidden">
          <SidebarTrigger />
          <NotificationBell className="ml-auto" />
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
