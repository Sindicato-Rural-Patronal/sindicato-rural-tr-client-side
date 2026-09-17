import { createFileRoute, redirect } from '@tanstack/react-router'

// Galerias agora ficam em Configurações do site.
export const Route = createFileRoute('/_admin/admin/galerias/')({
  beforeLoad: () => { throw redirect({ to: '/admin/configuracoes', search: { tab: 'galerias' } }) },
})
