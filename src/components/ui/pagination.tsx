import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
  limitOptions?: number[]
  isLoading?: boolean
  showLimitSelector?: boolean
}

function pageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50],
  isLoading = false,
  showLimitSelector = true,
}: PaginationProps) {
  const pages = pageNumbers(page, totalPages)
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="shrink-0 text-sm text-muted-foreground tabular-nums">
        {total === 0 ? 'Nenhum resultado' : `${from}–${to} de ${total}`}
      </p>

      <div className="flex items-center gap-2">
        {showLimitSelector && onLimitChange && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Por página:</span>
            <Select
              value={String(limit)}
              onValueChange={v => { onLimitChange(Number(v)); onPageChange(1) }}
            >
              <SelectTrigger size="sm" className="w-16 tabular-nums">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {limitOptions.map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <nav aria-label="Páginas" className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-sm text-faint-foreground select-none">…</span>
            ) : (
              // A página atual: um tom de fundo acima, com a linha fina; as outras em texto secundário.
              <Button
                key={p}
                variant="ghost"
                size="icon-sm"
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  'tabular-nums',
                  p === page ? 'border-border bg-secondary text-foreground' : 'text-muted-foreground',
                )}
                onClick={() => onPageChange(p as number)}
                disabled={isLoading}
              >
                {p}
              </Button>
            )
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
            aria-label="Próxima página"
          >
            <ChevronRight className="size-4" />
          </Button>
        </nav>
      </div>
    </div>
  )
}
