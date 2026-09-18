import { Link } from '@tanstack/react-router'
import {
  BookOpen, CalendarClock, GraduationCap, Mail, Users, CalendarX2, ChevronRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@/hooks/useAdmin'

// Números do painel. Cada cartão leva para a tela onde se resolve aquilo.
// O que o admin não pode ver não vem do backend — e cartão sem número não é
// desenhado. Número zero continua na tela, só que apagadinho.

type CardDef = {
  key: string
  title: string
  value: number | undefined
  description: string
  icon: React.ElementType
  /** Cartão de pendência: acende em âmbar quando tem algo a fazer. */
  attention?: boolean
  href: '/admin/cursos' | '/admin/mensagens' | '/admin/usuarios'
}

function StatCard({ card }: { card: CardDef }) {
  const value = card.value ?? 0
  const zero = value === 0
  const acende = !!card.attention && !zero
  const Icon = card.icon
  return (
    <Card
      className={cn(
        'transition-colors',
        zero && 'bg-muted/30',
        acende && 'border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20',
      )}
    >
      <CardContent className="p-0">
        <Link
          to={card.href}
          className="flex items-center gap-3 rounded-xl p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon
            className={cn('size-5 shrink-0', acende ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
            <p
              className={cn(
                'text-2xl font-bold leading-tight',
                zero ? 'text-muted-foreground' : acende ? 'text-amber-700 dark:text-amber-300' : 'text-foreground',
              )}
            >
              {value}
            </p>
            <p className="truncate text-xs text-muted-foreground">{card.description}</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </CardContent>
    </Card>
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
          icon: GraduationCap,
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
          icon: CalendarClock,
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
          icon: Mail,
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
          icon: CalendarX2,
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
          icon: BookOpen,
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
          icon: Users,
          href: '/admin/usuarios',
        }
      : null,
  ]
  return cards.filter((c): c is CardDef => c !== null)
}

export function StatsRow({
  stats, isLoading, isError,
}: {
  stats?: DashboardStats
  isLoading?: boolean
  /** Deu erro: mostra o aviso e nunca deixa esqueleto girando para sempre. */
  isError?: boolean
}) {
  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Erro ao carregar os números do painel.
      </div>
    )
  }

  if (isLoading || !stats) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="size-5 rounded" />
              <div className="flex-1">
                <Skeleton className="mb-2 h-4 w-28" />
                <Skeleton className="h-6 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = statCards(stats)
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(card => <StatCard key={card.key} card={card} />)}
      </div>
      {extras.length > 0 && (
        <p className="text-xs text-muted-foreground">{extras.join(' · ')}</p>
      )}
    </div>
  )
}
