import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requirePermission } from '@/lib/auth-guard'

export const Route = createFileRoute('/_admin/admin/cursos')({
  beforeLoad: () => requirePermission('READ_COURSE'),
  component: () => <Outlet />,
})
