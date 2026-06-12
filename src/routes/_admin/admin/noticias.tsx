import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requirePermission } from '@/lib/auth-guard'

export const Route = createFileRoute('/_admin/admin/noticias')({
  beforeLoad: () => requirePermission('READ_NEWS'),
  component: () => <Outlet />,
})
