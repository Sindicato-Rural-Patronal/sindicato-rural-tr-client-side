import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DashboardBlockId, DashboardBlockSize } from '@/components/dashboard/dashboard-prefs'

// Um bloco do painel dentro do modo de organizar: o conteúdo de verdade
// aparece embaixo dos controles, então a pessoa vê o resultado enquanto mexe.
// Nada de ícone sozinho — todo botão tem a palavra do lado.

/** Altura máxima da amostra: com 8 blocos inteiros ninguém consegue arrastar. */
const AMOSTRA = 'max-h-64'

export function EditableBlock({
  id, label, hint, size, escondido, primeiro, ultimo,
  onMover, onLargura, onEsconder, children,
}: {
  id: DashboardBlockId
  label: string
  hint: string
  size: DashboardBlockSize
  escondido: boolean
  primeiro: boolean
  ultimo: boolean
  /** −1 sobe, +1 desce. */
  onMover: (delta: number) => void
  onLargura: (size: DashboardBlockSize) => void
  onEsconder: () => void
  children: React.ReactNode
}) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging,
  } = useSortable({ id })

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      aria-label={`Bloco ${label}`}
      className={cn(
        'flex flex-col gap-3 rounded-xl border-2 border-dashed border-border bg-card/40 p-3',
        isDragging && 'relative z-10 border-primary opacity-80 shadow-lg',
        escondido && 'border-muted bg-muted/30',
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            {label}
            {escondido && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Escondido
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground">
            {escondido ? 'Não aparece no painel. Clique em Mostrar para trazer de volta.' : hint}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* touch-none: sem isso o navegador do celular rola a página em vez de arrastar. */}
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Arrastar ${label} para outro lugar`}
            className={cn(
              'inline-flex h-11 cursor-grab touch-none items-center gap-1.5 rounded-lg border border-border',
              'bg-background px-3 text-sm font-medium active:cursor-grabbing',
              'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <GripVertical className="size-4 text-muted-foreground" aria-hidden /> Arrastar
          </button>

          <Button
            type="button"
            variant="outline"
            className="h-11 gap-1.5 px-3"
            disabled={primeiro}
            onClick={() => onMover(-1)}
            aria-label={`Subir ${label}`}
          >
            <ArrowUp className="size-4" aria-hidden /> Subir
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-1.5 px-3"
            disabled={ultimo}
            onClick={() => onMover(1)}
            aria-label={`Descer ${label}`}
          >
            <ArrowDown className="size-4" aria-hidden /> Descer
          </Button>

          {/* Largura: dois botões que ficam marcados, mais fácil de entender que um menu. */}
          <div
            role="group"
            aria-label={`Largura de ${label}`}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background p-1"
          >
            {/* No celular todo bloco ocupa a linha inteira, então a escolha só
                aparece no computador — dizer isso evita a impressão de que o
                botão não funcionou. */}
            <span className="pl-1.5 text-xs text-muted-foreground">
              Largura<span className="lg:hidden"> no computador</span>
            </span>
            <LarguraBotao ativo={size === 'full'} onClick={() => onLargura('full')}>Inteira</LarguraBotao>
            <LarguraBotao ativo={size === 'half'} onClick={() => onLargura('half')}>Metade</LarguraBotao>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-11 gap-1.5 px-3"
            onClick={onEsconder}
            aria-label={escondido ? `Mostrar ${label}` : `Esconder ${label}`}
          >
            {escondido
              ? <><Eye className="size-4" aria-hidden /> Mostrar</>
              : <><EyeOff className="size-4" aria-hidden /> Esconder</>}
          </Button>
        </div>
      </div>

      {/* Amostra do bloco: só para reconhecer, por isso não recebe clique nem foco. */}
      <div className={cn('relative overflow-hidden rounded-lg', AMOSTRA, escondido && 'opacity-40')}>
        <div inert>{children}</div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-background to-transparent" aria-hidden />
      </div>
    </section>
  )
}

function LarguraBotao({ ativo, onClick, children }: {
  ativo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 items-center rounded-md px-3 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        ativo ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}
