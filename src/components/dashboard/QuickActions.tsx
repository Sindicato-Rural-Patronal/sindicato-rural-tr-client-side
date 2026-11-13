import { Link } from '@tanstack/react-router'
import { UserPlus, BookPlus, CalendarPlus, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/usePermissions'

// Atalhos do topo do painel: o que a secretaria faz todo dia, a um clique.
// Quem não tem permissão simplesmente não vê o botão.

export function QuickActions({ onNovaReserva }: { onNovaReserva: () => void }) {
  const { can } = usePermissions()
  const podeCriarPessoa = can('CREATE_USER')
  // Cursos, eventos e reuniões usam as mesmas permissões de curso.
  const podeCriarCurso = can('CREATE_COURSE')
  const podeLancarCotacao = can('UPDATE_MARKET_QUOTE')

  if (!podeCriarPessoa && !podeCriarCurso && !podeLancarCotacao) return null

  // 44 px no toque; no celular, dois por linha (um embaixo do outro empurrava o resto para longe).
  const classe = 'h-11 w-full min-w-0 justify-start gap-2 sm:w-auto md:h-9'

  return (
    <div role="group" aria-label="Ações rápidas" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {podeCriarPessoa && (
        <Button asChild className={classe}>
          <Link to="/admin/usuarios/novo">
            <UserPlus className="size-4" aria-hidden /> Novo associado
          </Link>
        </Button>
      )}
      {podeCriarCurso && (
        <>
          {/* A tela de cursos abre o formulário pelo botão "Novo curso" dela
              (não há atalho por endereço); daqui a gente leva até lá. */}
          <Button asChild variant="outline" className={classe}>
            <Link to="/admin/cursos">
              <BookPlus className="size-4" aria-hidden /> Novo curso
            </Link>
          </Button>
          <Button variant="outline" className={classe} onClick={onNovaReserva}>
            <CalendarPlus className="size-4" aria-hidden /> Nova reserva
          </Button>
        </>
      )}
      {podeLancarCotacao && (
        <Button asChild variant="outline" className={classe}>
          <Link to="/admin/cotacoes">
            <TrendingUp className="size-4" aria-hidden /> Lançar cotação
          </Link>
        </Button>
      )}
    </div>
  )
}
