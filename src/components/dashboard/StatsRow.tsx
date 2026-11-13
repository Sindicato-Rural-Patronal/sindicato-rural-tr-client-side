import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@/hooks/useAdmin'

// Números do painel. Cada cartão leva para a tela onde se resolve aquilo.
// O que o admin não pode ver não vem do backend — e cartão sem número não é
// desenhado. Número zero continua na tela, só que apagadinho.
//
// Ritmo (fase 3 do PLANO-DESIGN): o que pede atenção agora (pendência com número
// maior que zero) vem à frente, em cartão maior no tom de aviso; o resto fica numa
// fileira de cartões compactos. Sem ícone nos cartões: o número é o dado.

type CardDef = {
  key: string
  title: string
  value: number | undefined
  description: string
  /** Cartão de pendência: vai à frente, no tom de aviso, quando tem algo a fazer. */
  attention?: boolean
  href: '/admin/cursos' | '/admin/mensagens' | '/admin/usuarios'
}

const LINK_FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Pendência com algo a fazer: maior, no fundo suave do aviso. */
function AttentionCard({ card }: { card: CardDef }) {
  return (
    <Link
      to={card.href}
      className={cn(
        'flex items-center gap-4 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3.5 transition-colors hover:border-warning/60',
        LINK_FOCO,
      )}
    >
      <span className="min-w-10 text-3xl leading-none font-semibold tabular-nums text-warning">{card.value ?? 0}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{card.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{card.description}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-warning" aria-hidden />
    </Link>
  )
}

/** O resto: compacto, fundo do cartão; o zero fica apagado. */
function CompactCard({ card }: { card: CardDef }) {
  const value = card.value ?? 0
  return (
    <Link
      to={card.href}
      className={cn(
        'flex min-w-0 flex-col gap-0.5 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/50',
        LINK_FOCO,
      )}
    >
      <span className="text-sm text-muted-foreground">{card.title}</span>
      <span className={cn('text-xl leading-7 font-semibold tabular-nums', value === 0 ? 'text-faint-foreground' : 'text-foreground')}>
        {value}
      </span>
      <span className="text-xs text-faint-foreground">{card.description}</span>
    </Link>
  )
}

/** Monta a lista de cartões, pulando o que o backend não mandou (sem permissão). */
function statCards(stats: DashboardStats): CardDef[] {
  const publicos = stats.courses?.public ?? 0
  const cards: (CardDef | null)[] = [
    stats.registrations
      ? {
          key: 'pendentes',
          title: 'Inscrições a confirmar',
          value: stats.registrations.pendingConfirmation,
          description: 'Aguardando confirmação',
          attention: true,
          href: '/admin/cursos',
        }
      : null,
    stats.coursesStartingIn7Days !== undefined
      ? {
          key: 'comecando',
          title: 'Cursos começando',
          value: stats.coursesStartingIn7Days,
          description: 'Começam nos próximos 7 dias',
          attention: true,
          href: '/admin/cursos',
        }
      : null,
    stats.unreadMessages !== undefined
      ? {
          key: 'mensagens',
          title: 'Mensagens não lidas',
          value: stats.unreadMessages,
          description: 'Recebidas pelo site',
          attention: true,
          href: '/admin/mensagens',
        }
      : null,
    stats.membershipsExpiring30Days !== undefined
      ? {
          key: 'vencendo',
          title: 'Associações vencendo',
          value: stats.membershipsExpiring30Days,
          description: 'Nos próximos 30 dias',
          attention: true,
          href: '/admin/usuarios',
        }
      : null,
    stats.courses
      ? {
          key: 'cursos',
          title: 'Cursos cadastrados',
          value: stats.courses.total,
          description: `${publicos} publicado${publicos === 1 ? '' : 's'} no site`,
          href: '/admin/cursos',
        }
      : null,
    stats.totalUsers !== undefined
      ? {
          key: 'pessoas',
          // `totalUsers` conta todo mundo do cadastro, não só quem é associado.
          title: 'Pessoas cadastradas',
          value: stats.totalUsers,
          description: 'Associados e demais cadastros',
          href: '/admin/usuarios',
        }
      : null,
  ]
  return cards.filter((c): c is CardDef => c !== null)
}

// Cartões que dividem a linha: no celular dois por linha (os compactos) ou um (os de
// atenção); no computador, quantos couberem, sem sobrar buraco no fim da linha.
const GRADE_ATENCAO = 'grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]'
const GRADE_COMPACTA = 'grid grid-cols-2 gap-3 lg:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]'

export function StatsRow({
  stats, isLoading, isError, onRetry, retrying,
}: {
  stats?: DashboardStats
  isLoading?: boolean
  /** Deu erro: mostra o aviso e nunca deixa esqueleto girando para sempre. */
  isError?: boolean
  onRetry?: () => void
  retrying?: boolean
}) {
  if (isError && !stats) {
    return (
      <LoadErrorRetry
        variant="inline"
        className="rounded-xl border border-border bg-card px-4 py-3"
        message="Não foi possível carregar os números do painel."
        onRetry={() => onRetry?.()}
        retrying={retrying}
      />
    )
  }

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col gap-3">
        <div className={GRADE_ATENCAO}>
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
        <div className={GRADE_COMPACTA}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[84px] rounded-xl" />)}
        </div>
      </div>
    )
  }

  const cards = statCards(stats)
  const atencao = cards.filter(c => c.attention && (c.value ?? 0) > 0)
  const resto = cards.filter(c => !atencao.includes(c))
  // Linha de apoio: números que não pedem ação, mas é bom ter à mão.
  const extras = [
    stats.registrations ? `${stats.registrations.last30Days} inscriç${stats.registrations.last30Days === 1 ? 'ão' : 'ões'} nos últimos 30 dias` : null,
    stats.totalRooms !== undefined ? `${stats.totalRooms} sala${stats.totalRooms === 1 ? '' : 's'}` : null,
    stats.totalAdmins !== undefined ? `${stats.totalAdmins} administrador${stats.totalAdmins === 1 ? '' : 'es'}` : null,
  ].filter(Boolean) as string[]

  // Admin sem acesso a nenhum número: o bloco some em vez de ficar vazio.
  if (cards.length === 0 && extras.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {atencao.length > 0 && (
        <div className={GRADE_ATENCAO}>
          {atencao.map(card => <AttentionCard key={card.key} card={card} />)}
        </div>
      )}
      {resto.length > 0 && (
        <div className={GRADE_COMPACTA}>
          {resto.map(card => <CompactCard key={card.key} card={card} />)}
        </div>
      )}
      {extras.length > 0 && (
        <p className="text-xs text-muted-foreground">{extras.join(' · ')}</p>
      )}
    </div>
  )
}
