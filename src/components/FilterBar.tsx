import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type FilterBarProps = {
  /** Os filtros (busca, datas, listas), da esquerda para a direita. Quebram linha. */
  children: ReactNode
  /** As ações da lista (Exportar, Novo…): sempre no canto direito; no celular, em cima. */
  actions?: ReactNode
  className?: string
}

/**
 * Barra de filtros padrão das listas do painel. No computador: filtros à esquerda,
 * quebrando linha quando não cabem, e as ações presas à direita. Do tablet para baixo, as
 * ações sobem para cima dos filtros (o "Novo" continua à mão); no celular, cada filtro
 * ocupa a largura toda, um embaixo do outro. Os campos dentro já têm a mesma altura
 * (36 px) e o mesmo canto: Input, SelectTrigger, NativeSelect e DatePicker.
 */
export function FilterBar({ children, actions, className }: FilterBarProps) {
  return (
    <div
      data-slot="filter-bar"
      className={cn('flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6', className)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end [&>*]:min-w-0 max-sm:[&>*]:w-full">
        {children}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 max-lg:order-first lg:shrink-0 lg:justify-end">
          {actions}
        </div>
      )}
    </div>
  )
}

type FilterFieldProps = {
  label: string
  /** O `id` do campo, para o rótulo apontar para ele. */
  htmlFor?: string
  children: ReactNode
  className?: string
}

/** Um filtro com rótulo em cima (12 px, texto secundário), para usar dentro da `FilterBar`. */
export function FilterField({ label, htmlFor, children, className }: FilterFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
