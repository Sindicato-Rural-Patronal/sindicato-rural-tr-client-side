import { useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CLASSE_SPAN, COLUNAS, NOME_SPAN, SPANS,
  type DashboardBlockId, type DashboardSpan,
} from '@/components/dashboard/dashboard-prefs'

// Um bloco do painel no modo de organizar. O bloco continua sendo o bloco de
// verdade, inteiro (nada de amostra cortada): a pessoa quer ver a tela dela.
// Só fica congelado (`inert`, sem clique nem foco) e ganha dois controles:
//   • "Remover", no alto;
//   • a ALÇA DO CANTO de baixo à direita, que muda a largura (como no painel da
//     AWS: puxa-se o canto do cartão em vez de apertar um botão).
// Mover é arrastar o cartão todo.

/** Largura em pixels de um bloco que ocupa `span` das `COLUNAS` colunas. */
function larguraDoSpan(span: DashboardSpan, coluna: number, vao: number): number {
  return span * coluna + (span - 1) * vao
}

/** A largura mais perto do que a mão pediu (as três grudam, não há meio-termo). */
function spanMaisPerto(larguraPedida: number, coluna: number, vao: number): DashboardSpan {
  return SPANS.reduce((melhor, span) => (
    Math.abs(larguraPedida - larguraDoSpan(span, coluna, vao))
      < Math.abs(larguraPedida - larguraDoSpan(melhor, coluna, vao))
      ? span
      : melhor
  ), SPANS[0])
}

/** Uma largura para o lado, sem passar de 2 nem de 4. */
function vizinho(span: DashboardSpan, passo: -1 | 1): DashboardSpan {
  const i = SPANS.indexOf(span)
  return SPANS[Math.min(SPANS.length - 1, Math.max(0, i + passo))]
}

export function EditableBlock({
  id, label, size, onTamanho, onRemover, alvo = false, children,
}: {
  id: DashboardBlockId
  label: string
  size: DashboardSpan
  /** Nova largura escolhida na alça (já grudada em 2, 3 ou 4 colunas). */
  onTamanho: (size: DashboardSpan) => void
  onRemover: () => void
  /** É este o bloco que está embaixo do cursor agora (vai receber o arrastado). */
  alvo?: boolean
  children: React.ReactNode
}) {
  // `animateLayoutChanges: false` porque a ordem muda DURANTE o arrasto (ver
  // DashboardPage): a animação de "voltar do lugar antigo" do @dnd-kit brigava
  // com o bloco que está seguindo o cursor e ele saía tremendo.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    animateLayoutChanges: () => false,
  })
  // Enquanto a pessoa puxa a alça: muda o contorno e mostra o nome do tamanho.
  const [puxando, setPuxando] = useState(false)
  // Medidas tiradas no começo do arrasto — a largura do bloco muda no meio do
  // gesto (é o objetivo), então o cálculo não pode depender do estado de agora.
  const arraste = useRef<{ x: number; coluna: number; vao: number; inicial: DashboardSpan } | null>(null)

  function aoPegarAlca(e: React.PointerEvent<HTMLDivElement>) {
    // O cartão inteiro é a alça de MOVER: sem barrar aqui, pegar o canto
    // arrastaria o bloco para outro lugar em vez de mudar a largura.
    e.stopPropagation()
    if (e.button > 0) return
    // A grade do painel é o pai do bloco: é ela que dá a largura da linha.
    const grade = e.currentTarget.closest<HTMLElement>('[data-bloco]')?.parentElement
    if (!grade) return
    const cheia = grade.getBoundingClientRect().width
    const vao = Number.parseFloat(getComputedStyle(grade).columnGap) || 0
    // Uma coluna: a linha toda menos os vãos, dividida pelas colunas da grade.
    const coluna = (cheia - vao * (COLUNAS - 1)) / COLUNAS
    arraste.current = { x: e.clientX, coluna, vao, inicial: size }
    // Segura o ponteiro: o dedo/mouse pode sair de cima da alça (ela é
    // pequena) que os eventos continuam chegando aqui até soltar.
    e.currentTarget.setPointerCapture?.(e.pointerId)
    // Sem isto o navegador começa a selecionar o texto do bloco no arrasto.
    e.preventDefault()
    setPuxando(true)
  }

  function aoMoverAlca(e: React.PointerEvent<HTMLDivElement>) {
    const a = arraste.current
    if (!a) return
    // A alça puxa a borda direita do bloco. Só existem três larguras (2, 3 ou
    // 4 colunas), então ela GRUDA na mais perto do que a mão pediu.
    const largura = larguraDoSpan(a.inicial, a.coluna, a.vao) + (e.clientX - a.x)
    const novo = spanMaisPerto(largura, a.coluna, a.vao)
    // Muda JÁ, no meio do arrasto: a pessoa precisa ver onde o bloco vai parar.
    if (novo !== size) onTamanho(novo)
  }

  function aoLargarAlca(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    arraste.current = null
    setPuxando(false)
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  function aoTeclarAlca(e: React.KeyboardEvent<HTMLDivElement>) {
    // Quem não usa mouse muda a largura pelas setas. O stopPropagation é
    // obrigatório: as mesmas setas movem o bloco de lugar (teclado do @dnd-kit).
    e.stopPropagation()
    const diminuir = e.key === 'ArrowLeft' || e.key === 'ArrowDown'
    const aumentar = e.key === 'ArrowRight' || e.key === 'ArrowUp'
    if (!diminuir && !aumentar) return
    e.preventDefault()
    onTamanho(vizinho(size, diminuir ? -1 : 1))
  }

  return (
    <section
      ref={setNodeRef}
      data-bloco={id}
      // Translate, não Transform: `Transform` também escreve scaleX/scaleY, e
      // com blocos de tamanhos diferentes isso esticava o cartão no arrasto.
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      // O cartão inteiro é a alça, então ele não pode virar um `role="button"`
      // (os controles de dentro ficariam inalcançáveis em alguns leitores de
      // tela). Como grupo focável, Espaço/setas do @dnd-kit continuam valendo.
      role="group"
      aria-roledescription="Bloco do painel"
      aria-label={`${label}. Segure e arraste para mudar de lugar, ou aperte a barra de espaço.`}
      className={cn(
        'relative cursor-grab rounded-xl border-2 border-dashed border-border bg-card/40 p-2',
        'active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        // Uma coluna no celular; no computador, metade ou as duas colunas.
        CLASSE_SPAN[size],
        // touch-none só enquanto arrasta: se valesse sempre, o dedo não rolaria
        // mais a página (o cartão ocupa a tela toda no celular).
        isDragging && 'z-10 touch-none border-primary opacity-80 shadow-lg',
        // Nada se mexe durante o arrasto: quem diz onde o bloco vai cair é este
        // destaque no cartão de baixo do cursor.
        alvo && 'border-primary bg-primary/10 ring-2 ring-primary/40',
        puxando && 'border-primary bg-primary/5',
      )}
    >
      {/* Sem prévia que reorganiza a tela, o aviso precisa estar escrito. */}
      {alvo && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute -top-3 left-3 z-10 rounded-md bg-primary px-2 py-0.5',
            'text-xs font-medium text-primary-foreground shadow-md',
          )}
        >
          Solte aqui
        </span>
      )}
      {/* Em cima da borda, não do conteúdo: assim o botão não tapa o número
          nem o título do bloco (cabe no respiro de 24px entre um e outro). */}
      <div className="absolute -top-5 right-2 z-10 flex gap-2">
        <button
          type="button"
          // O cartão inteiro escuta ponteiro e teclado para arrastar: sem barrar
          // aqui, clicar no botão começaria um arrasto e Espaço/Enter também.
          onPointerDown={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
          onClick={onRemover}
          aria-label={`Remover ${label} do painel`}
          className={cn(
            'inline-flex h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3',
            'text-sm font-medium shadow-md hover:bg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <X className="size-4" aria-hidden /> Remover
        </button>
      </div>

      {/* O bloco de verdade, congelado: não recebe clique nem foco. O respiro
          em cima é o lugar do botão: metade dele cai dentro do cartão, e sem
          isto ele tapava o que estivesse no canto (o seletor de salas da
          agenda, por exemplo). */}
      <div inert className="pt-6">{children}</div>

      {/* Alça do canto. Abaixo de lg não aparece: lá todo bloco ocupa a linha
          inteira e não há o que redimensionar. A caixa tem 44px (alvo de dedo)
          e o desenho, discreto, fica no meio dela. */}
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Largura de ${label}`}
        aria-orientation="horizontal"
        aria-valuemin={SPANS[0]}
        aria-valuemax={SPANS[SPANS.length - 1]}
        aria-valuenow={size}
        aria-valuetext={NOME_SPAN[size]}
        title="Puxe para mudar a largura"
        onPointerDown={aoPegarAlca}
        onPointerMove={aoMoverAlca}
        onPointerUp={aoLargarAlca}
        onPointerCancel={aoLargarAlca}
        onKeyDown={aoTeclarAlca}
        className={cn(
          'group/alca absolute -right-3 -bottom-3 z-10 hidden size-11 touch-none items-center justify-center',
          'cursor-nwse-resize rounded-lg lg:flex',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'focus-visible:ring-offset-background',
        )}
      >
        {/* O nome do tamanho aparece enquanto se puxa (para ver onde vai grudar
            sem tirar o olho do canto) e também com o foco do teclado, que é
            quando as setas passam a valer. `aria-hidden` porque o leitor de
            tela já ouve isto no `aria-valuetext`. */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute right-0 bottom-12 hidden rounded-md bg-foreground px-2 py-1',
            'text-xs font-medium whitespace-nowrap text-background shadow-md',
            'group-focus-visible/alca:block',
            puxando && 'block',
          )}
        >
          {NOME_SPAN[size]}
        </span>
        <span
          aria-hidden
          className={cn(
            'flex size-7 items-center justify-center rounded-md border border-border bg-background shadow-md',
            // Com foco pelo teclado fica igual a quando está sendo puxada: quem
            // navega por Tab precisa ver onde está antes de apertar as setas.
            'group-focus-visible/alca:border-primary group-focus-visible/alca:bg-primary',
            'group-focus-visible/alca:text-primary-foreground',
            puxando && 'border-primary bg-primary text-primary-foreground',
          )}
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M13.5 5.5 5.5 13.5M13.5 10.5l-3 3" />
          </svg>
        </span>
      </div>
    </section>
  )
}
