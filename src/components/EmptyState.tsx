import type { LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'

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
}

export function EmptyState({ icon: Icon, title, description, action, topico }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Icon className="size-12 text-muted-foreground/30 mb-4" />
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      {action}
      {topico && (
        <Link
          to="/admin/ajuda"
          search={{ topico }}
          className="mt-4 inline-flex min-h-11 items-center text-sm text-primary hover:underline"
        >
          Como funciona esta tela
        </Link>
      )}
    </div>
  )
}
