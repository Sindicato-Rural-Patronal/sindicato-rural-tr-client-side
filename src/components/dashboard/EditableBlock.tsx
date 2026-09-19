import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Maximize2, Minimize2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardBlockId, DashboardBlockSize } from '@/components/dashboard/dashboard-prefs'

// Um bloco do painel no modo de organizar. O bloco continua sendo o bloco de
// verdade, inteiro (nada de amostra cortada): a pessoa quer ver a tela dela.
// Só fica congelado (`inert`, sem clique nem foco) e ganha DOIS botõezinhos no
// canto — aumentar/diminuir e remover. Mover é arrastar o cartão todo.

export function EditableBlock({
  id, label, size, onLargura, onRemover, children,
}: {
  id: DashboardBlockId
  label: string
  size: DashboardBlockSize
  /** Alterna entre a linha inteira e meia linha. */
  onLargura: () => void
  onRemover: () => void
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const inteiro = size === 'full'

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      // O cartão inteiro é a alça, então ele não pode virar um `role="button"`
      // (os dois botões de dentro ficariam inalcançáveis em alguns leitores de
      // tela). Como grupo focável, Espaço/setas do @dnd-kit continuam valendo.
      role="group"
      aria-roledescription="Bloco do painel"
      aria-label={`${label}. Segure e arraste para mudar de lugar, ou aperte a barra de espaço.`}
      className={cn(
        'relative cursor-grab rounded-xl border-2 border-dashed border-border bg-card/40 p-2',
        'active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        // touch-none só enquanto arrasta: se valesse sempre, o dedo não rolaria
        // mais a página (o cartão ocupa a tela toda no celular).
        isDragging && 'z-10 touch-none border-primary opacity-80 shadow-lg',
      )}
    >
      {/* Em cima da borda, não do conteúdo: assim os botões não tapam o número
          nem o título do bloco (cabem no respiro de 24px entre um e outro). */}
      <div className="absolute -top-5 right-2 z-10 flex gap-2">
        {/* Abaixo de lg todo bloco ocupa a linha toda: o botão não teria efeito. */}
        <BotaoCanto
          className="hidden lg:inline-flex"
          onClick={onLargura}
          aria-label={inteiro ? `Diminuir ${label} para meia linha` : `Aumentar ${label} para a linha inteira`}
        >
          {inteiro
            ? <><Minimize2 className="size-4" aria-hidden /> Diminuir</>
            : <><Maximize2 className="size-4" aria-hidden /> Aumentar</>}
        </BotaoCanto>
        <BotaoCanto onClick={onRemover} aria-label={`Remover ${label} do painel`}>
          <X className="size-4" aria-hidden /> Remover
        </BotaoCanto>
      </div>

      {/* O bloco de verdade, congelado: não recebe clique nem foco. O respiro
          em cima é o lugar dos botões: metade deles cai dentro do cartão, e sem
          isto eles tapavam o que estivesse no canto (o seletor de salas da
          agenda, por exemplo). */}
      <div inert className="pt-6">{children}</div>
    </section>
  )
}

/** Botãozinho sobreposto ao bloco. Texto sempre à vista e 44px de altura. */
function BotaoCanto({ className, children, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      // O cartão inteiro escuta ponteiro e teclado para arrastar: sem barrar
      // aqui, clicar no botão começaria um arrasto e Espaço/Enter também.
      onPointerDown={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()}
      className={cn(
        'inline-flex h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3',
        'text-sm font-medium shadow-md hover:bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
