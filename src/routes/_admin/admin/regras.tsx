import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requirePermission } from '@/lib/auth-guard'

export const Route = createFileRoute('/_admin/admin/regras')({
  beforeLoad: () => requirePermission('READ_RULE'),
  component: () => <Outlet />,
})
