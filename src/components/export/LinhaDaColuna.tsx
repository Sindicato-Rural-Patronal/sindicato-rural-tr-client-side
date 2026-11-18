// A linha de uma coluna escolhida (posição, nome, ↑, ↓ e ×), do montador de
// relatórios (decisão 006) e do painel Colunas das visões da lista (decisão 007).
// Fora do ReportBuilder para o painel Colunas não carregar o montador inteiro.
import type { CSSProperties, ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, GripVertical, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PrivacyBadge } from '@/components/export/ReportFieldPicker'
import type { CampoComGrupo } from '@/components/export/report-builder'

export function LinhaDaColuna({
  campo, posicao, total, grande, onMover, onTirar, alca, refLinha, estilo, arrastando = false,
}: {
  campo: CampoComGrupo
  posicao: number
  total: number
  grande: boolean
  onMover: (passo: -1 | 1) => void
  onTirar: () => void
  alca?: ReactNode
  refLinha?: (el: HTMLLIElement | null) => void
  estilo?: CSSProperties
  arrastando?: boolean
}) {
  const tamanho = grande ? 'size-11' : 'size-8'
  return (
    <li
      ref={refLinha}
      style={estilo}
      data-coluna={campo.key}
      className={cn(
        'flex items-center gap-1 rounded-md border border-border bg-card pr-0.5 pl-1',
        grande ? 'min-h-12' : 'min-h-9',
        arrastando && 'relative z-10 shadow-float',
      )}
    >
      {alca}
      <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{posicao}</span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5 pl-1">
        <span className="truncate" title={`${campo.group} › ${campo.label}`}>{campo.label}</span>
        <PrivacyBadge privacy={campo.privacy} />
      </span>
      <Button
        type="button" variant="ghost" size="icon" className={tamanho}
        data-acao="subir" aria-label={`Subir ${campo.label}`} title="Subir"
        disabled={posicao === 1} onClick={() => onMover(-1)}
      >
        <ArrowUp />
      </Button>
      <Button
        type="button" variant="ghost" size="icon" className={tamanho}
        data-acao="descer" aria-label={`Descer ${campo.label}`} title="Descer"
        disabled={posicao === total} onClick={() => onMover(1)}
      >
        <ArrowDown />
      </Button>
      <Button
        type="button" variant="ghost" size="icon" className={tamanho}
        data-acao="tirar" aria-label={`Tirar ${campo.label}`} title="Tirar"
        onClick={onTirar}
      >
        <X />
      </Button>
    </li>
  )
}

/** A linha no computador: arrasta pela alça (mouse ou teclado). */
export function LinhaArrastavel(props: Omit<Parameters<typeof LinhaDaColuna>[0], 'alca' | 'refLinha' | 'estilo' | 'arrastando'>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: props.campo.key })
  return (
    <LinhaDaColuna
      {...props}
      refLinha={setNodeRef}
      estilo={{ transform: CSS.Translate.toString(transform), transition }}
      arrastando={isDragging}
      alca={(
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label={`Arrastar ${props.campo.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      )}
    />
  )
}
