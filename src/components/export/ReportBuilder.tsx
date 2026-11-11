import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
  type Announcements, type DragEndEvent, type ScreenReaderInstructions,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowLeft, ArrowUp, GripVertical, Info, Loader2, Plus, ShieldAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { downloadExport, exportErrorMessage, type ExportDataset, type ExportParams } from '@/lib/export'
import { cn } from '@/lib/utils'
import { PrivacyBadge, ReportFieldPicker } from '@/components/export/ReportFieldPicker'
import {
  AVISO_COLUNAS_PDF, aplicarModelo, avisoDadosPessoais, camposDoCatalogo, estadoInicial, filtrosEmPalavras,
  formatoNaTela, guardarUltimo, lerUltimo, marcarCampo, modeloParaApi, modelosDe, moverCampo, moverPara,
  nomeDoModelo, problemaParaBaixar, quantosVaoSair, textoDoBotao, tirarCampo,
  type CampoComGrupo, type ExportCatalog, type ReportFormat, type ReportState,
} from '@/components/export/report-builder'

// "Montar relatório" (decisão 006, SR-089). Quem exporta escolhe os campos e a
// ordem das colunas; o catálogo da API diz quais campos existem e quais a
// pessoa pode levar. Os filtros são os da tela (não há filtro próprio, só
// "Só confirmadas" nas inscrições).
//
// Computador: diálogo de duas colunas (campos com busca | colunas escolhidas,
// que se ordenam arrastando ou com ↑↓). Celular: folha de baixo de altura
// cheia, uma coluna, ordem só com ↑↓ (arrastar na tela de toque briga com a
// rolagem), "+ Adicionar campo" e o botão de baixar preso no rodapé.
//
// Só usa o que existe na staging e no redesign (ui/dialog, ui/sheet,
// ui/button, ui/input, ui/badge, inputs nativos e cores por token).

export type ReportBuilderProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  dataset: ExportDataset
  catalog: ExportCatalog
  /** Os mesmos filtros que o "Todos" do menu manda. */
  filters?: ExportParams
  /** Seleção da lista. `undefined` = a tela não tem seleção. */
  selectedIds?: string[]
  /** Total da lista com os filtros atuais. */
  total?: number
  /** Há filtro ativo? Muda "Todos" para "Todos com os filtros atuais". */
  filtered?: boolean
}

const INSTRUCOES_LEITOR: ScreenReaderInstructions = {
  draggable:
    'Aperte a barra de espaço para pegar a coluna. Use as setas para cima e para baixo para escolher o lugar, '
    + 'a barra de espaço de novo para soltar e Esc para desistir.',
}

type Rotulo = (id: string | number) => string

function avisosDoLeitor(rotulo: Rotulo, posicao: (id: string | number) => number): Announcements {
  return {
    onDragStart: ({ active }) => `Pegou a coluna ${rotulo(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${rotulo(active.id)} vai para a posição ${posicao(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over ? `${rotulo(active.id)} ficou na posição ${posicao(over.id)}.` : `${rotulo(active.id)} voltou para o lugar.`,
    onDragCancel: ({ active }) => `Desistiu de mover. ${rotulo(active.id)} voltou para o lugar.`,
  }
}

type Acao = 'subir' | 'descer' | 'tirar'

function LinhaDaColuna({
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
        arrastando && 'relative z-10 shadow-md',
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
function LinhaArrastavel(props: Omit<Parameters<typeof LinhaDaColuna>[0], 'alca' | 'refLinha' | 'estilo' | 'arrastando'>) {
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

export function ReportBuilder({
  open, onOpenChange, dataset, catalog, filters = {}, selectedIds, total, filtered = false,
}: ReportBuilderProps) {
  const celular = useIsMobile()
  const temSelecao = selectedIds !== undefined
  const selecionados = selectedIds?.length ?? 0
  const [estado, setEstado] = useState<ReportState>(
    () => estadoInicial(catalog, { ultimo: lerUltimo(dataset), selecionados }),
  )
  const [busca, setBusca] = useState('')
  const [tela, setTela] = useState<'colunas' | 'campos'>('colunas')
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const listaRef = useRef<HTMLOListElement>(null)
  const focoPendente = useRef<{ key: string; acao: Acao } | null>(null)
  const ids = useId()

  const campos = useMemo(() => camposDoCatalogo(catalog), [catalog])
  const modelos = useMemo(() => modelosDe(catalog), [catalog])
  const formato = formatoNaTela(estado.format, celular)
  const quantos = quantosVaoSair(estado, { total, selecionados })
  const problema = problemaParaBaixar(estado, catalog, { total, selecionados, celular })
  const dadosPessoais = avisoDadosPessoais(estado, catalog)
  const nomeModelo = nomeDoModelo(estado, catalog)
  const modeloEscolhido = modelos.find(m => m.id === estado.modeloId)
  const alterado = !!modeloEscolhido && nomeModelo !== modeloEscolhido.name
  const filtrosTexto = filtrosEmPalavras(filters, catalog.filterLabels)
  const muitasColunas = formato !== 'csv' && estado.fields.length >= AVISO_COLUNAS_PDF
  const escolhidos = estado.fields.map(k => campos.get(k)).filter((c): c is CampoComGrupo => !!c)

  function mudar(fn: (s: ReportState) => ReportState) {
    setEstado(fn)
    setErro(null)
  }

  // Depois de ↑↓ (ou de tirar), o foco continua no mesmo lugar para quem usa o
  // teclado: o botão da mesma linha, ou o outro sentido quando chegou na ponta.
  useEffect(() => {
    const pendente = focoPendente.current
    focoPendente.current = null
    if (!pendente || !listaRef.current) return
    const linha = Array.from(listaRef.current.querySelectorAll<HTMLElement>('[data-coluna]'))
      .find(el => el.dataset.coluna === pendente.key)
    if (!linha) return
    const ordem: Acao[] = pendente.acao === 'subir' ? ['subir', 'descer', 'tirar']
      : pendente.acao === 'descer' ? ['descer', 'subir', 'tirar'] : ['tirar']
    for (const acao of ordem) {
      const botao = linha.querySelector<HTMLButtonElement>(`[data-acao="${acao}"]`)
      if (botao && !botao.disabled) { botao.focus(); return }
    }
  }, [estado.fields])

  function mover(key: string, passo: -1 | 1) {
    focoPendente.current = { key, acao: passo < 0 ? 'subir' : 'descer' }
    mudar(s => moverCampo(s, key, passo))
  }

  function tirar(key: string) {
    const i = estado.fields.indexOf(key)
    const vizinho = estado.fields[i + 1] ?? estado.fields[i - 1]
    focoPendente.current = vizinho ? { key: vizinho, acao: 'tirar' } : null
    mudar(s => tirarCampo(s, key))
  }

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function aoSoltar({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    mudar(s => moverPara(s, s.fields.indexOf(String(active.id)), s.fields.indexOf(String(over.id))))
  }

  const rotulo: Rotulo = id => campos.get(String(id))?.label ?? String(id)
  const posicao = (id: string | number) => estado.fields.indexOf(String(id)) + 1

  async function baixar() {
    if (problema || baixando) return
    setErro(null)
    const imprimir = formato === 'print'
    // A aba de imprimir abre JÁ, no clique: depois de esperar a API e o desenho
    // do PDF, o navegador a bloquearia.
    let aba: Window | null = null
    if (imprimir) {
      aba = window.open('', '_blank')
      if (aba) {
        aba.opener = null
        try {
          aba.document.title = 'Gerando o relatório…'
          aba.document.body.style.fontFamily = 'sans-serif'
          aba.document.body.textContent = 'Gerando o relatório… O PDF abre nesta aba quando ficar pronto.'
        } catch {
          // Só o texto de espera; o PDF chega do mesmo jeito.
        }
      }
    }
    setBaixando(true)
    try {
      const params: ExportParams = estado.scope === 'selected' ? { ids: selectedIds ?? [] } : filters
      const count = await downloadExport(dataset, params, formato === 'csv' ? 'csv' : 'pdf', {
        fields: estado.fields,
        modelo: modeloParaApi(estado, catalog),
        confirmed: estado.confirmed,
        print: imprimir,
        printWindow: aba,
      })
      guardarUltimo(dataset, { fields: estado.fields, format: estado.format })
      const registros = count === 1 ? '1 registro' : count >= 0 ? `${count} registros` : null
      toast.success(
        imprimir ? 'Relatório aberto em outra aba para imprimir.'
          : formato === 'csv' ? `Planilha${registros ? ` com ${registros}` : ''} baixada.`
            : `Relatório${registros ? ` com ${registros}` : ''} baixado.`,
      )
      onOpenChange(false)
    } catch (e) {
      aba?.close()
      setErro(exportErrorMessage(e, 'Não foi possível gerar o relatório. Tente de novo.'))
    } finally {
      setBaixando(false)
    }
  }

  const titulo = `Montar relatório · ${catalog.title || 'Exportação'}`

  // ---- pedaços que as duas telas usam ----

  const seletorDeModelo = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <label htmlFor={`${ids}-modelo`} className="text-sm text-muted-foreground">Modelo</label>
      <select
        id={`${ids}-modelo`}
        // Alterado (ou montado à mão) mostra o texto à parte, para escolher o
        // mesmo modelo de novo funcionar (o select não avisa troca para o mesmo valor).
        value={alterado || !modeloEscolhido ? '' : modeloEscolhido.id}
        onChange={e => { if (e.target.value) mudar(s => aplicarModelo(s, catalog, e.target.value)) }}
        className={cn(
          'min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:max-w-xs',
          celular ? 'h-11' : 'h-8',
        )}
      >
        {(alterado || !modeloEscolhido) && <option value="" disabled>{nomeModelo ?? 'Montado à mão'}</option>}
        {modelos.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </div>
  )

  const listaDeColunas = escolhidos.length === 0 ? (
    <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
      {celular ? 'Nenhuma coluna. Toque em "Adicionar campo".' : 'Nenhuma coluna. Marque os campos ao lado.'}
    </p>
  ) : celular ? (
    <ol ref={listaRef} className="flex flex-col gap-1.5" aria-label="Colunas, nesta ordem">
      {escolhidos.map((campo, i) => (
        <LinhaDaColuna
          key={campo.key} campo={campo} posicao={i + 1} total={escolhidos.length} grande
          onMover={passo => mover(campo.key, passo)} onTirar={() => tirar(campo.key)}
        />
      ))}
    </ol>
  ) : (
    <DndContext
      sensors={sensores}
      collisionDetection={closestCenter}
      onDragEnd={aoSoltar}
      accessibility={{ announcements: avisosDoLeitor(rotulo, posicao), screenReaderInstructions: INSTRUCOES_LEITOR }}
    >
      <SortableContext items={estado.fields} strategy={verticalListSortingStrategy}>
        <ol ref={listaRef} className="flex flex-col gap-1" aria-label="Colunas, nesta ordem">
          {escolhidos.map((campo, i) => (
            <LinhaArrastavel
              key={campo.key} campo={campo} posicao={i + 1} total={escolhidos.length} grande={false}
              onMover={passo => mover(campo.key, passo)} onTirar={() => tirar(campo.key)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )

  const todosRotulo = `${filtered ? 'Todos com os filtros atuais' : 'Todos'}${total != null ? ` (${total.toLocaleString('pt-BR')})` : ''}`
  const oQueEntra = (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1 text-sm font-medium text-foreground">O que entra</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <label className={cn('flex cursor-pointer items-center gap-2 text-sm', celular && 'min-h-11')}>
          <input
            type="radio" name={`${ids}-escopo`} className="size-4 accent-primary"
            checked={estado.scope === 'all'} onChange={() => mudar(s => ({ ...s, scope: 'all' }))}
          />
          {celular && filtered ? `Todos${total != null ? ` (${total.toLocaleString('pt-BR')})` : ''}` : todosRotulo}
        </label>
        {temSelecao && (
          <label className={cn('flex items-center gap-2 text-sm', selecionados === 0 ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer', celular && 'min-h-11')}>
            <input
              type="radio" name={`${ids}-escopo`} className="size-4 accent-primary"
              checked={estado.scope === 'selected'} disabled={selecionados === 0}
              onChange={() => mudar(s => ({ ...s, scope: 'selected' }))}
            />
            {selecionados > 0 ? `Selecionados (${selecionados})` : 'Selecionados (marque na lista)'}
          </label>
        )}
      </div>
      {estado.scope === 'all' && filtrosTexto.length > 0 && (
        <p className="text-xs text-muted-foreground">Filtros: {filtrosTexto.join(' · ')}</p>
      )}
      {dataset === 'registrations' && (
        <label className={cn('flex cursor-pointer items-center gap-2 text-sm', celular && 'min-h-11')}>
          <input
            type="checkbox" className="size-4 accent-primary"
            checked={estado.confirmed} onChange={e => { const v = e.target.checked; mudar(s => ({ ...s, confirmed: v })) }}
          />
          Só confirmadas
        </label>
      )}
    </fieldset>
  )

  const opcoesDeFormato: { valor: ReportFormat; rotulo: string }[] = [
    { valor: 'csv', rotulo: 'Planilha CSV' },
    { valor: 'pdf', rotulo: 'PDF' },
    ...(celular ? [] : [{ valor: 'print' as const, rotulo: 'Imprimir' }]),
  ]
  const escolhaDeFormato = (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1 text-sm font-medium text-foreground">Formato</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {opcoesDeFormato.map(op => (
          <label key={op.valor} className={cn('flex cursor-pointer items-center gap-2 text-sm', celular && 'min-h-11')}>
            <input
              type="radio" name={`${ids}-formato`} className="size-4 accent-primary"
              checked={formato === op.valor} onChange={() => mudar(s => ({ ...s, format: op.valor }))}
            />
            {op.rotulo}
          </label>
        ))}
      </div>
    </fieldset>
  )

  const avisos = (
    <div className="flex flex-col gap-1.5 text-sm empty:hidden">
      {estado.avisos.map(aviso => (
        <p key={aviso} className="flex items-start gap-2 text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> {aviso}
        </p>
      ))}
      {muitasColunas && (
        <p className="flex items-start gap-2 text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Com {estado.fields.length} colunas o PDF sai deitado e com letra menor. Se ficar difícil de ler, tire colunas ou baixe a planilha.
        </p>
      )}
      {dadosPessoais && (
        <p className="flex items-start gap-2 text-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /> {dadosPessoais}
        </p>
      )}
    </div>
  )

  const motivo = erro ? (
    <p role="alert" className="text-sm text-destructive">{erro}</p>
  ) : problema ? (
    <p className="text-sm text-muted-foreground">{problema}</p>
  ) : null

  const botaoBaixar = (
    <Button
      type="button"
      className={cn('gap-2', celular && 'h-11 w-full text-base')}
      disabled={!!problema || baixando}
      onClick={() => void baixar()}
    >
      {baixando && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {textoDoBotao(formato, quantos)}
    </Button>
  )

  if (celular) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" showCloseButton={false} className="h-dvh max-h-dvh gap-0 p-0">
          <div className="flex items-center gap-1 border-b border-border px-1 py-1">
            {tela === 'campos' && (
              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Voltar às colunas" onClick={() => setTela('colunas')}>
                <ArrowLeft />
              </Button>
            )}
            <SheetTitle className="min-w-0 flex-1 truncate px-2">{tela === 'campos' ? 'Adicionar campo' : titulo}</SheetTitle>
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Fechar">
                <X />
              </Button>
            </SheetClose>
          </div>
          <SheetDescription className="sr-only">Escolha os campos e a ordem das colunas do relatório.</SheetDescription>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {tela === 'campos' ? (
              <ReportFieldPicker
                catalog={catalog} selected={estado.fields} grande
                onToggle={key => mudar(s => marcarCampo(s, catalog, key))}
                busca={busca} onBusca={setBusca}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {seletorDeModelo}
                <section className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium text-foreground">Colunas, nesta ordem</h3>
                  {listaDeColunas}
                  <Button type="button" variant="outline" className="h-11 gap-2" onClick={() => setTela('campos')}>
                    <Plus /> Adicionar campo
                  </Button>
                </section>
                {oQueEntra}
                {escolhaDeFormato}
                {avisos}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {tela === 'campos' ? (
              <Button type="button" className="h-11 w-full text-base" onClick={() => setTela('colunas')}>
                Pronto ({estado.fields.length} {estado.fields.length === 1 ? 'coluna' : 'colunas'})
              </Button>
            ) : (
              <>
                {motivo}
                {botaoBaixar}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(760px,92dvh)] flex-col gap-3 sm:max-w-[880px]">
        <DialogHeader className="pr-8">
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Escolha os campos e a ordem das colunas.</DialogDescription>
        </DialogHeader>

        {seletorDeModelo}

        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-[minmax(0,1fr)] gap-4">
          <section className="flex min-h-0 flex-col gap-2" aria-labelledby={`${ids}-campos`}>
            <h3 id={`${ids}-campos`} className="text-sm font-medium text-foreground">Campos</h3>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <ReportFieldPicker
                catalog={catalog} selected={estado.fields}
                onToggle={key => mudar(s => marcarCampo(s, catalog, key))}
                busca={busca} onBusca={setBusca}
              />
            </div>
          </section>
          <section className="flex min-h-0 flex-col gap-2 border-l border-border pl-4" aria-labelledby={`${ids}-colunas`}>
            <h3 id={`${ids}-colunas`} className="text-sm font-medium text-foreground">
              Colunas, nesta ordem ({estado.fields.length})
            </h3>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">{listaDeColunas}</div>
            {escolhidos.length > 0 && (
              <p className="truncate text-xs text-muted-foreground" title={escolhidos.map(c => c.label).join(' | ')}>
                Prévia: {escolhidos.map(c => c.label).join(' | ')}
              </p>
            )}
          </section>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
          {oQueEntra}
          {escolhaDeFormato}
        </div>
        {avisos}

        <DialogFooter className="items-center sm:justify-between">
          <div className="min-w-0 flex-1">{motivo}</div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            {botaoBaixar}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
