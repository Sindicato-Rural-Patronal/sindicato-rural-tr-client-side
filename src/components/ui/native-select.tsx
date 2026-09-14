import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * `<select>` nativo com o estilo padrão do admin. Substitui a string de classe
 * repetida em várias telas. Aceita todas as props de um select normal.
 */
export const NativeSelect = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
        className,
      )}
      {...props}
    />
  ),
)
NativeSelect.displayName = 'NativeSelect'
