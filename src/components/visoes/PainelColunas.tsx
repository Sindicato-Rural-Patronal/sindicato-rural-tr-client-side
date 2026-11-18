// O painel "Colunas" da visão (decisão 007, seção 2): os campos do catálogo
// (agrupados, com busca; `ReportFieldPicker`) e as colunas em ordem (arrastar, ↑,
// ↓ e ×; as linhas do montador). A tabela muda na hora; não há "Aplicar". Marcar
// põe a coluna no fim. "Ações" não é coluna escolhível: fica sempre por último.
//
// Computador: Popover largo ancorado no botão, para o lado com mais espaço e com a
// altura limitada ao espaço desse lado (cada lista rola por dentro). Se o painel não
// cabe inteiro em nenhum dos lados, a página sobe só o que falta antes de ele abrir
// (SR-153: a 1280 × 800, com a página no topo, ele abria para cima com 368 px e
// mostrava 6 colunas). Celular: folha de baixo de altura cheia, ↑ ↓ × de 44 px, sem
// arrastar; "Adicionar coluna" troca o conteúdo pela lista agrupada e "Pronto" volta.
import { useMemo, useRef, useState } from 'react'
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ArrowLeft, Columns3, Plus, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ReportFieldPicker } from '@/components/export/ReportFieldPicker'
import { LinhaArrastavel, LinhaDaColuna } from '@/components/export/LinhaDaColuna'
import { camposDoCatalogo, type CampoComGrupo, type ExportCatalog } from '@/components/export/report-builder'
import { cn } from '@/lib/utils'
import { alternarColuna, moverColuna } from '@/components/visoes/visoes'

/**
 * A altura do painel inteiro no computador (o respiro de 16 px, o cabeçalho, as
 * listas de 480 px: umas 10 colunas à vista), mais a distância do botão e a folga da borda da janela.
 */
const ALTURA_DO_PAINEL = 600
/** Até onde a página sobe: o botão fica a esta distância do topo da janela. */
const TOPO_MINIMO = 16

/**
 * Antes de abrir: se o painel não cabe inteiro nem embaixo nem em cima do botão, a
 * página rola só o que falta para ele caber embaixo (sem tirar o botão da tela).
 */
function darEspacoAoPainel(botao: HTMLElement | null) {
  if (!botao || typeof window === 'undefined') return
  const r = botao.getBoundingClientRect()
  const abaixo = window.innerHeight - r.bottom
  if (abaixo >= ALTURA_DO_PAINEL || r.top >= ALTURA_DO_PAINEL) return
  const sobe = Math.min(ALTURA_DO_PAINEL - abaixo, r.top - TOPO_MINIMO)
  if (sobe > 0) window.scrollBy({ top: sobe, behavior: 'instant' })
}

type Props = {
  catalog: ExportCatalog | null
  cols: string[]
  onChange: (cols: string[]) => void
  /** A visão está "(alterada)"? Liga o "Voltar ao padrão da visão". */
  alterada: boolean
  onVoltar: () => void
  celular: boolean
  className?: string
}

export function PainelColunas({ catalog, cols, onChange, alterada, onVoltar, celular, className }: Props) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [tela, setTela] = useState<'colunas' | 'campos'>('colunas')
  const botaoRef = useRef<HTMLButtonElement>(null)
  const campos = useMemo(() => (catalog ? camposDoCatalogo(catalog) : new Map<string, CampoComGrupo>()), [catalog])
  const escolhidos = cols.map(k => campos.get(k)).filter((c): c is CampoComGrupo => !!c)

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const alternar = (k: string) => onChange(alternarColuna(cols, k))
  const mover = (k: string, passo: -1 | 1) => onChange(moverColuna(cols, k, passo))
  const tirar = (k: string) => { if (cols.length > 1) onChange(cols.filter(c => c !== k)) }
  function aoSoltar({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    onChange(arrayMove(cols, cols.indexOf(String(active.id)), cols.indexOf(String(over.id))))
  }

  const botao = (
    <Button
      ref={botaoRef}
      type="button"
      variant="outline"
      className={cn('gap-2', celular && 'h-11 w-full', className)}
      disabled={!catalog}
      title={!catalog ? 'Carregando os campos…' : undefined}
      onClick={celular ? () => { setTela('colunas'); setAberto(true) } : undefined}
    >
      <Columns3 className="size-4" aria-hidden /> Colunas ({cols.length})
    </Button>
  )

  const voltar = (
    <Button type="button" variant="ghost" size="sm" className={cn('gap-1.5', celular && 'h-11')} disabled={!alterada} onClick={onVoltar}>
      <RotateCcw className="size-3.5" aria-hidden /> Voltar ao padrão da visão
    </Button>
  )

  if (celular) {
    return (
      <>
        {botao}
        <Sheet open={aberto} onOpenChange={setAberto}>
          <SheetContent side="bottom" showCloseButton={false} className="max-h-dvh gap-0 p-0 data-[side=bottom]:h-dvh">
            <div className="flex items-center gap-1 border-b border-border px-1 py-1">
              {tela === 'campos' && (
                <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Voltar às colunas" onClick={() => setTela('colunas')}>
                  <ArrowLeft />
                </Button>
              )}
              <SheetTitle className="min-w-0 flex-1 truncate px-2">
                {tela === 'campos' ? 'Adicionar coluna' : `Colunas da lista (${cols.length})`}
              </SheetTitle>
              <SheetClose asChild>
                <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Fechar"><X /></Button>
              </SheetClose>
            </div>
            <SheetDescription className="sr-only">Escolha as colunas da lista e a ordem delas.</SheetDescription>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {tela === 'campos' && catalog ? (
                <ReportFieldPicker catalog={catalog} selected={cols} grande onToggle={alternar} busca={busca} onBusca={setBusca} />
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">A lista muda na hora. Os cartões mostram as colunas nesta ordem.</p>
                  <Button type="button" variant="outline" className="h-11 gap-2" onClick={() => setTela('campos')}>
                    <Plus /> Adicionar coluna
                  </Button>
                  <ol className="flex flex-col gap-1.5" aria-label="Colunas, nesta ordem">
                    {escolhidos.map((campo, i) => (
                      <LinhaDaColuna
                        key={campo.key} campo={campo} posicao={i + 1} total={escolhidos.length} grande
                        onMover={passo => mover(campo.key, passo)} onTirar={() => tirar(campo.key)}
                      />
                    ))}
                  </ol>
                  {voltar}
                </div>
              )}
            </div>
            <div className="border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {tela === 'campos' ? (
                <Button type="button" className="h-11 w-full text-base" onClick={() => setTela('colunas')}>
                  Pronto ({cols.length} {cols.length === 1 ? 'coluna' : 'colunas'})
                </Button>
              ) : (
                <SheetClose asChild>
                  <Button type="button" className="h-11 w-full text-base">Pronto</Button>
                </SheetClose>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <Popover open={aberto} onOpenChange={o => { if (o) darEspacoAoPainel(botaoRef.current); setAberto(o) }}>
      <PopoverTrigger asChild>{botao}</PopoverTrigger>
      {/* Abre para o lado com mais espaço (o `flip` do Radix escolhe o que melhor cabe),
          com a altura desse lado (`available-height`, com 12 px de folga); cada lista
          rola por dentro. A 1280 × 800 a página sobe antes e ele abre para baixo inteiro. */}
      <PopoverContent
        side="bottom"
        align="start"
        collisionPadding={12}
        className="max-h-(--radix-popover-content-available-height) w-[min(680px,calc(100vw-2rem))] gap-3 overflow-hidden p-4"
      >
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="font-medium text-foreground">Colunas da lista</p>
            <p className="text-xs text-muted-foreground">A tabela muda na hora. "Ações" fica sempre por último.</p>
          </div>
          {voltar}
        </div>
        {catalog && (
          <div className="grid h-[480px] min-h-32 shrink grid-cols-[3fr_2fr] grid-rows-[minmax(0,1fr)] gap-4">
            <section className="flex min-h-0 flex-col gap-2" aria-label="Campos">
              <h3 className="text-sm font-medium text-foreground">Campos</h3>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <ReportFieldPicker catalog={catalog} selected={cols} onToggle={alternar} busca={busca} onBusca={setBusca} />
              </div>
            </section>
            <section className="flex min-h-0 flex-col gap-2 border-l border-border pl-4" aria-label="Colunas, nesta ordem">
              <h3 className="text-sm font-medium text-foreground">Colunas, nesta ordem ({cols.length})</h3>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
                  <SortableContext items={cols} strategy={verticalListSortingStrategy}>
                    <ol className="flex flex-col gap-1">
                      {escolhidos.map((campo, i) => (
                        <LinhaArrastavel
                          key={campo.key} campo={campo} posicao={i + 1} total={escolhidos.length} grande={false}
                          onMover={passo => mover(campo.key, passo)} onTirar={() => tirar(campo.key)}
                        />
                      ))}
                    </ol>
                  </SortableContext>
                </DndContext>
              </div>
              <p className="text-xs text-faint-foreground">+ Ações (sempre a última)</p>
            </section>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
