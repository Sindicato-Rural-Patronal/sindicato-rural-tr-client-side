import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Selo do evento que aparece na página pública de eventos. */
export function OnSiteBadge({ className }: { className?: string }) {
  return (
    <span
      title="Este evento aparece na página de eventos do site"
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
        'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
        className,
      )}
    >
      <Globe className="size-3.5" aria-hidden />
      No site
    </span>
  )
}
