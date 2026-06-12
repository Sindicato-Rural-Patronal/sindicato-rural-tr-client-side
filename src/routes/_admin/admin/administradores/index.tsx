import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_admin/admin/administradores/')({
  beforeLoad: () => { throw redirect({ to: '/admin/usuarios' }) },
  component: () => null,
})
