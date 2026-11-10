import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Espaçamento padrão de uma tela do painel: 16 px no celular, 24 px do tablet em diante,
 * 24 px entre os blocos (cabeçalho, filtros, conteúdo) e largura máxima de 1600 px.
 * Para quando a tela precisa de outro elemento no lugar do `<PageContainer>`.
 */
export const PAGE_CONTAINER_CLASS = 'mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 md:p-6'

/** Invólucro de uma tela do painel, com o espaçamento padrão (`PAGE_CONTAINER_CLASS`). */
export function PageContainer({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="page" className={cn(PAGE_CONTAINER_CLASS, className)} {...props} />
}

type PageHeaderProps = {
  /** O nome da tela, sem ícone. */
  title: ReactNode
  /** Uma frase sobre o que se faz aqui, em texto secundário. */
  description?: ReactNode
  /** A vaga do "?" ao lado do título: `<AjudaLink topico=… titulo=… />`. */
  help?: ReactNode
  /** Botões da tela (o principal por último). No celular descem para baixo do título. */
  actions?: ReactNode
  className?: string
}

/**
 * Cabeçalho comum das telas do painel: título de 24 px (peso 600), o "?" da ajuda ao
 * lado, a descrição embaixo e as ações à direita. O "?" vai como elemento (e não como
 * nome do artigo) para o teste da ajuda continuar achando cada `<AjudaLink>` na tela.
 */
export function PageHeader({ title, description, help, actions, className }: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6', className)}
    >
      <div className="min-w-0">
        <div className="flex min-h-9 items-center gap-1">
          <h1 className="min-w-0 text-2xl leading-8 font-semibold text-balance text-foreground">{title}</h1>
          {help}
        </div>
        {description && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">{actions}</div>
      )}
    </header>
  )
}
