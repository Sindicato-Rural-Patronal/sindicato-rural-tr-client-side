import { createFileRoute, redirect } from '@tanstack/react-router'

// As salas agora são uma aba de Configurações (são seis, de lista fixa, e quase
// nunca mudam). Mantido para não quebrar link salvo nem atalho antigo.
export const Route = createFileRoute('/_admin/admin/salas/')({
  beforeLoad: () => { throw redirect({ to: '/admin/configuracoes', search: { tab: 'salas' } }) },
})
