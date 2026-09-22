import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { HelpPage } from '@/components/ajuda/HelpPage'

type AjudaSearch = { topico?: string; q?: string }

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined
}

export const Route = createFileRoute('/_admin/admin/ajuda/')({
  validateSearch: (s: Record<string, unknown>): AjudaSearch => ({
    topico: str(s.topico),
    q: str(s.q),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { topico, q } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <HelpPage
      topico={topico}
      q={q}
      // Digitar na busca troca a URL sem empilhar um passo no "voltar" do navegador.
      onChange={next => navigate({ search: next, replace: true })}
    />
  )
}
