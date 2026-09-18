import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/auth-guard'
import { parseAgendaSearch } from '@/lib/agenda'
import { AgendaPage } from '@/components/agenda/AgendaPage'

export const Route = createFileRoute('/_admin/admin/agenda')({
  beforeLoad: () => requirePermission('READ_COURSE'),
  validateSearch: parseAgendaSearch,
  component: AgendaPage,
})
