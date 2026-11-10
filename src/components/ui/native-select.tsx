import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * `<select>` nativo com o estilo padrão do sistema: mesma altura (36 px), canto e borda
 * do `Input` e do `SelectTrigger`. Substitui a string de classe repetida em várias
 * telas. Aceita todas as props de um select normal.
 */
export const NativeSelect = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      data-slot="native-select"
      className={cn(
        'h-9 max-w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm text-foreground transition-[color,background-color,border-color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  ),
)
NativeSelect.displayName = 'NativeSelect'
