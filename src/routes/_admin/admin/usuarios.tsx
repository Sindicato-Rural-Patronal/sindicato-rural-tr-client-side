import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requirePermission } from '@/lib/auth-guard'

export const Route = createFileRoute('/_admin/admin/usuarios')({
  beforeLoad: () => requirePermission('READ_USER'),
  component: () => <Outlet />,
})
