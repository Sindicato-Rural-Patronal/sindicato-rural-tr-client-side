// src/routes/_admin.tsx
import { AdminSideBar } from '@/components/adminSideBar'
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
      <AdminSideBar />
      <SidebarInset>
        <header className="flex h-12 items-center border-b px-4 md:hidden">
          <SidebarTrigger />
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}