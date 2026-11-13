import { cn } from '@/lib/utils'

/**
 * Faixa de topo das páginas internas do site (Cursos, Notícias, Eventos, Sobre,
 * Contato, Cotações, Convênios e cada convênio). Uma só, no lugar das antigas
 * faixas verde e preta: o título à esquerda sobre o fundo de papel, a frase da
 * página e uma linha de contexto com dado de verdade ("4 cursos com inscrições
 * abertas"). `width` alinha a faixa com o conteúdo da página (ex.: `max-w-5xl`).
 *
 * A linha de contexto tem altura reservada enquanto o dado carrega, para a
 * página não pular quando ele chega.
 */
export function PublicPageHeader({
  title,
  eyebrow,
  description,
  context,
  aside,
  width,
}: {
  title: React.ReactNode
  /** Linha curta acima do título ("Convênio Unimed"). */
  eyebrow?: React.ReactNode
  description?: React.ReactNode
  /** Contexto com dado de verdade; `null` enquanto carrega (reserva a altura). */
  context?: React.ReactNode
  /** À direita do título no computador (ex.: o logo do convênio). */
  aside?: React.ReactNode
  /** Largura máxima do conteúdo da página, para os dois alinharem. */
  width?: string
}) {
  return (
    <section className="border-b border-border">
      <div className={cn('container mx-auto px-4 pb-8 pt-10 md:pb-10 md:pt-14', width)}>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 max-w-3xl">
            {eyebrow && <p className="mb-2 text-sm font-medium text-muted-foreground">{eyebrow}</p>}
            <h1 className="text-3xl font-semibold tracking-tight text-foreground wrap-break-word md:text-4xl">{title}</h1>
            {description && (
              <p className="mt-3 text-base text-muted-foreground md:text-lg">{description}</p>
            )}
            {context !== undefined && (
              <p className="mt-4 min-h-5 text-sm text-muted-foreground" aria-live="polite">{context}</p>
            )}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
      </div>
    </section>
  )
}

/** Número em destaque dentro da linha de contexto ("**4** cursos com inscrições abertas"). */
export function ContextFigure({ children }: { children: React.ReactNode }) {
  return <span className="font-medium tabular-nums text-foreground">{children}</span>
}
