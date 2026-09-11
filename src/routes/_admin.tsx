// src/routes/_admin.tsx
import { AdminSideBar } from '@/components/adminSideBar'
import { CommandPalette } from '@/components/CommandPalette'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

function isTokenValid(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(atob(parts[1])) as { exp?: number }
    if (payload.exp === undefined) return true
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export const Route = createFileRoute('/_admin')({
  beforeLoad: () => {
    const token = localStorage.getItem('token')
    if (!token || !isTokenValid(token)) {
      localStorage.removeItem('token')
      throw redirect({ to: '/login' })
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <SidebarProvider>
      <CommandPalette />
      <AdminSideBar />
      <SidebarInset className="overflow-y-auto">
        <header className="flex h-12 items-center gap-3 border-b px-4 md:hidden">
          <SidebarTrigger />
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}