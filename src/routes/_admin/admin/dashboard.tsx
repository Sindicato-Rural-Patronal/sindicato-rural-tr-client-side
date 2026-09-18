import { createFileRoute } from '@tanstack/react-router'
import { parseDashboardSearch, type DashboardSearch } from '@/lib/dashboard-agenda'
import { DashboardPage } from '@/components/dashboard/DashboardPage'

export const Route = createFileRoute('/_admin/admin/dashboard')({
  // Dia, sala, tipo e o atalho "nova reserva" ficam na URL (voltar/atualizar/compartilhar).
  validateSearch: parseDashboardSearch,
  component: RouteComponent,
})

// A rota só liga a URL à tela: o painel em si mora em components/dashboard.
function RouteComponent() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <DashboardPage
      search={search}
      onSearch={(patch: Partial<DashboardSearch>, replace = false) =>
        // `resetScroll: false`: trocar o dia, a sala ou o tipo só muda o que a
        // agenda mostra — não é sair de tela. Sem isto o roteador joga a página
        // para o topo a cada clique no calendário e a agenda some da vista.
        navigate({ search: prev => ({ ...prev, ...patch }), replace, resetScroll: false })
      }
      onOpenCourse={id => navigate({ to: '/admin/cursos', search: { curso: id, aba: 'inscricoes' } })}
    />
  )
}
