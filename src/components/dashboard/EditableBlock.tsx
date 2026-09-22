import { useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { blockSpan, type DashboardBlockId, type DashboardBlockSize } from '@/components/dashboard/dashboard-prefs'

// Um bloco do painel no modo de organizar. O bloco continua sendo o bloco de
// verdade, inteiro (nada de amostra cortada): a pessoa quer ver a tela dela.
// Só fica congelado (`inert`, sem clique nem foco) e ganha dois controles:
//   • "Remover", no alto;
//   • a ALÇA DO CANTO de baixo à direita, que muda a largura (como no painel da
//     AWS: puxa-se o canto do cartão em vez de apertar um botão).
// Mover é arrastar o cartão todo.

/** Como a pessoa (e o leitor de tela) ouve cada largura. */
const NOME_TAMANHO: Record<DashboardBlockSize, string> = {
  full: 'Linha inteira',
  half: 'Metade da linha',
}

export function EditableBlock({
  id, label, size, onTamanho, onRemover, children,
}: {
  id: DashboardBlockId
  label: string
  size: DashboardBlockSize
  /** Nova largura escolhida na alça (já grudada em "metade" ou "inteira"). */
  onTamanho: (size: DashboardBlockSize) => void
  onRemover: () => void
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
  const arraste = useRef<{ x: number; meia: number; cheia: number; inicial: DashboardBlockSize } | null>(null)

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
    arraste.current = { x: e.clientX, cheia, meia: (cheia - vao) / 2, inicial: size }
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
    // A alça puxa a borda direita do bloco. Só existem duas larguras, então ela
    // GRUDA na mais perto: o ponto de virada é o meio entre meia linha e linha
    // inteira. (Virar já no meio da LINHA faria qualquer tremidinha de mão
    // trocar a largura, porque o bloco de meia linha acaba bem ali.)
    const largura = (a.inicial === 'full' ? a.cheia : a.meia) + (e.clientX - a.x)
    const novo: DashboardBlockSize = largura > (a.meia + a.cheia) / 2 ? 'full' : 'half'
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
    onTamanho(diminuir ? 'half' : 'full')
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
        blockSpan(size) === 2 && 'lg:col-span-2',
        // touch-none só enquanto arrasta: se valesse sempre, o dedo não rolaria
        // mais a página (o cartão ocupa a tela toda no celular).
        isDragging && 'z-10 touch-none border-primary opacity-80 shadow-lg',
        puxando && 'border-primary bg-primary/5',
      )}
    >
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
        aria-valuemin={1}
        aria-valuemax={2}
        aria-valuenow={blockSpan(size)}
        aria-valuetext={NOME_TAMANHO[size]}
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
          {NOME_TAMANHO[size]}
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
