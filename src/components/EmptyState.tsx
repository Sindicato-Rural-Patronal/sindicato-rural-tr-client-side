import type { LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  /**
   * Artigo da Central de Ajuda desta tela (nome do .md). Lista vazia costuma
   * ser a primeira coisa que um admin novo vê: é o melhor momento para
   * oferecer o "como funciona" em vez de deixá-lo encarando o nada.
   */
  topico?: string
  /**
   * Desenha a caixa (cartão com a linha fina) em volta. Use quando o vazio fica
   * solto na página; dentro de um cartão, de uma tabela ou de um painel, deixe sem.
   * É o único jeito de caixa de vazio do sistema: nada de borda tracejada.
   */
  framed?: boolean
  className?: string
}

/** Vazio de verdade (não erro): ícone, título, explicação e a ação que resolve. */
export function EmptyState({ icon: Icon, title, description, action, topico, framed = false, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 py-12 text-center',
        framed && 'rounded-xl border border-border bg-card',
        className,
      )}
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden />
      </span>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
      {topico && (
        <Link
          to="/admin/ajuda"
          search={{ topico }}
          className="mt-3 inline-flex min-h-11 items-center text-sm text-primary hover:underline"
        >
          Como funciona esta tela
        </Link>
      )}
    </div>
  )
}
