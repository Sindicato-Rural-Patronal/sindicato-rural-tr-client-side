import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SegmentedOption<T extends string> = {
  value: T
  label: ReactNode
  icon?: LucideIcon
  /** Classe de cor de um ponto de 8 px antes do rótulo (ex.: o tipo na agenda). */
  dot?: string
  /** Dica (title) do botão. */
  title?: string
}

type SegmentedControlProps<T extends string> = {
  /** Para o leitor de tela: "Período", "Como ver a agenda"… */
  label: string
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  className?: string
}

/**
 * Escolha de uma opção entre poucas (período, Dia/Semana, tipo na agenda), no estilo da
 * escolha de tema: a escolhida um tom acima, com a linha fina e o ícone verde, como o
 * item ativo do menu. Não é aba (a aba troca o conteúdo da tela; isto filtra ou muda a
 * forma de ver). Quebra linha quando não cabe.
 */
export function SegmentedControl<T extends string>({ label, value, onChange, options, className }: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex max-w-full flex-wrap gap-0.5 rounded-lg border border-border bg-muted p-0.5', className)}
    >
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
              active
                ? 'bg-card text-foreground shadow-xs ring-1 ring-border [&_svg]:text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.dot && <span className={cn('size-2 shrink-0 rounded-full', o.dot)} aria-hidden />}
            {o.icon && <o.icon className="size-4" aria-hidden />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
