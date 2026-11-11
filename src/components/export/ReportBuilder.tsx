import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
  type Announcements, type DragEndEvent, type ScreenReaderInstructions,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowDown, ArrowLeft, ArrowUp, GripVertical, Info, Loader2, Pencil, Plus, Save, ShieldAlert, Trash2, X,
} from 'lucide-react'
import { AjudaLink } from '@/components/ajuda/AjudaLink'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { useReportTemplateMutations, useReportTemplates } from '@/hooks/useReportTemplates'
import { apiErrorMessage } from '@/lib/api-error-message'
import {
  RelatorioVazioError, exportErrorMessage, exportarRelatorio, type ExportDataset, type ExportParams,
} from '@/lib/export'
import { cn } from '@/lib/utils'
import { PrivacyBadge, ReportFieldPicker } from '@/components/export/ReportFieldPicker'
import {
  AVISO_COLUNAS_PDF, NOME_DO_MODELO_MAX, TEXTO_NENHUM_REGISTRO, TEXTO_NENHUMA_CONFIRMADA, aplicarModelo, autoriaDoModelo,
  avisoDadosPessoais, avisoDoCorte, camposDoCatalogo, contagem, corpoDoModelo, ehDaEquipe, ehPdf, estadoInicial,
  filtrosEmPalavras, formatoNaTela, formatoDaApi, guardarUltimo, idDaEquipe, lerUltimo, marcarCampo, modeloParaApi,
  modeloQueBate, modelosDe, moverCampo, moverPara, mudouDoModelo, nomeDoModelo, normalizarNome, problemaDoNome,
  problemaParaBaixar, quantosVaoSair, semModelo, textoDoBaixado, textoDoBotao, tirarCampo, totalComCorte, travaDoModelo,
  ultimoDoEstado,
  type CampoComGrupo, type ExportCatalog, type ModeloDaEquipe, type ReportFormat, type ReportState,
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
//
// Modelos da equipe (fase 3, SR-115): o seletor tem o grupo "Modelos da
// equipe" (a lista vem da API com o montador aberto). "Salvar como modelo…",
// "Salvar alterações no modelo", renomear e excluir abrem um painel embaixo do
// seletor, dentro do montador: nada de diálogo dentro do diálogo, e as colunas
// montadas não se perdem.

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
  /**
   * Quantas estão confirmadas, quando a tela sabe (Inscrições). Com "Só
   * confirmadas", é o número do botão; sem ele, o total vira só um teto ("até 5").
   */
  totalConfirmadas?: number
  /** Como a tela diz um filtro na linha "Filtros:" ({ courseIds: 'Curso: Horta' }). */
  filterTexts?: Record<string, string>
  /**
   * O que entra já está decidido pela tela ("Só esta pessoa", "Inscrições dos
   * cursos selecionados"): em vez de "Todos"/"Selecionados", "O que entra" mostra
   * este texto, e vão os `filters` como estão. Fichas e extras do menu.
   */
  escopo?: string
  /**
   * A fonte leva só as `limits.rows` linhas mais recentes em vez de recusar
   * (Auditoria): o botão conta as que saem, avisa do corte e não trava.
   */
  cortaNoLimite?: boolean
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

/** O painel embaixo do seletor de modelo (um de cada vez). */
type Painel =
  | { tipo: 'salvar' | 'renomear'; nome: string }
  | { tipo: 'atualizar' | 'excluir' }

/** O nome do painel para o leitor de tela. */
const TITULO_DO_PAINEL: Record<Painel['tipo'], string> = {
  salvar: 'Salvar como modelo',
  atualizar: 'Salvar alterações no modelo',
  renomear: 'Renomear o modelo',
  excluir: 'Excluir o modelo',
}

const ERRO_DO_PAINEL: Record<Painel['tipo'], string> = {
  salvar: 'Não foi possível salvar o modelo. Tente de novo.',
  atualizar: 'Não foi possível salvar o modelo. Tente de novo.',
  renomear: 'Não foi possível renomear o modelo. Tente de novo.',
  excluir: 'Não foi possível excluir o modelo. Tente de novo.',
}

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
  open, onOpenChange, dataset, catalog, filters = {}, selectedIds, total, filtered = false, totalConfirmadas,
  filterTexts, escopo, cortaNoLimite = false,
}: ReportBuilderProps) {
  const celular = useIsMobile()
  const temSelecao = !escopo && selectedIds !== undefined
  const selecionados = temSelecao ? (selectedIds?.length ?? 0) : 0

  // Os modelos da equipe: buscados só com o montador aberto. `listaConhecida`:
  // undefined enquanto carrega; null sem a rota ou a permissão (404/403) ou se
  // não carregou; a lista quando chegou.
  const listaDaEquipe = useReportTemplates(dataset, { enabled: open })
  const listaConhecida: ModeloDaEquipe[] | null | undefined = listaDaEquipe.data !== undefined
    ? listaDaEquipe.data
    : listaDaEquipe.isError ? null : undefined
  const equipe = useMemo(() => listaDaEquipe.data ?? [], [listaDaEquipe.data])
  const operacoes = useReportTemplateMutations(dataset)
  const enviando = operacoes.salvar.isPending || operacoes.mudar.isPending || operacoes.excluir.isPending

  const [ultimo] = useState(() => lerUltimo(dataset))
  const [estado, setEstado] = useState<ReportState>(
    () => estadoInicial(catalog, { ultimo, selecionados, equipe: listaConhecida }),
  )
  // O último apontava para um modelo da equipe e a lista ainda não tinha
  // chegado: quando ela chega, e se a pessoa ainda não mexeu, o montador abre
  // de novo com ela (o modelo como está agora, ou as colunas guardadas se ele
  // foi excluído).
  const [mexeu, setMexeu] = useState(false)
  const [listaChegou, setListaChegou] = useState(listaConhecida !== undefined)
  if (!listaChegou && listaConhecida !== undefined) {
    setListaChegou(true)
    if (!mexeu && ehDaEquipe(ultimo?.modelo)) {
      setEstado(estadoInicial(catalog, { ultimo, selecionados, equipe: listaConhecida }))
    }
  }

  const [busca, setBusca] = useState('')
  const [tela, setTela] = useState<'colunas' | 'campos'>('colunas')
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [painel, setPainel] = useState<Painel | null>(null)
  const [erroDoPainel, setErroDoPainel] = useState<string | null>(null)
  const listaRef = useRef<HTMLOListElement>(null)
  const seletorRef = useRef<HTMLSelectElement>(null)
  const focoPendente = useRef<{ key: string; acao: Acao } | null>(null)
  const ids = useId()

  const campos = useMemo(() => camposDoCatalogo(catalog), [catalog])
  const modelos = useMemo(() => modelosDe(catalog, equipe), [catalog, equipe])
  const formato = formatoNaTela(estado.format, celular)
  // O que sai de verdade (a Auditoria corta nas mais recentes); o "Todos" mostra o total da tela.
  const contagens = { total: totalComCorte(total, catalog, cortaNoLimite), selecionados, totalConfirmadas }
  const corte = avisoDoCorte(total, catalog, cortaNoLimite)
  const quantos = quantosVaoSair(estado, contagens)
  const problema = problemaParaBaixar(estado, catalog, { ...contagens, celular })
  const dadosPessoais = avisoDadosPessoais(estado, catalog)
  const nomeModelo = nomeDoModelo(estado, catalog, equipe)
  const modeloEscolhido = modelos.find(m => m.id === estado.modeloId)
  const alterado = !!modeloEscolhido && nomeModelo !== modeloEscolhido.name
  const filtrosTexto = filtrosEmPalavras(filters, catalog.filterLabels, { textos: filterTexts })
  const muitasColunas = ehPdf(formato) && estado.fields.length >= AVISO_COLUNAS_PDF
  const escolhidos = estado.fields.map(k => campos.get(k)).filter((c): c is CampoComGrupo => !!c)

  // O modelo da equipe aberto: quem criou e mudou, se a pessoa pode mudá-lo e se a tela está diferente dele.
  const daEquipe = modeloEscolhido?.daEquipe ?? null
  const trava = daEquipe ? travaDoModelo(catalog, daEquipe) : null
  const oferecerAtualizar = !!modeloEscolhido && !!daEquipe && !trava && mudouDoModelo(estado, catalog, modeloEscolhido, dataset)
  // 404/403: a fonte não tem modelos da equipe para quem pede; não há o que salvar.
  const salvaModelos = listaDaEquipe.data !== null
  const carregandoModelo = ehDaEquipe(estado.modeloId) && !modeloEscolhido && listaConhecida === undefined
  const comConfirmadas = dataset === 'registrations'

  function mudar(fn: (s: ReportState) => ReportState) {
    setEstado(fn)
    setErro(null)
    setMexeu(true)
  }

  function abrirPainel(novo: Painel) {
    setPainel(novo)
    setErroDoPainel(null)
  }

  function fecharPainel() {
    setPainel(null)
    setErroDoPainel(null)
    seletorRef.current?.focus()
  }

  /** Esc com o painel aberto fecha só o painel; o montador e as colunas ficam. */
  function fecharSoOPainel(e: KeyboardEvent) {
    if (!painel) return
    e.preventDefault()
    fecharPainel()
  }

  /** O botão do painel: salva, renomeia, salva por cima ou exclui o modelo da equipe. */
  async function confirmarPainel() {
    if (!painel || enviando) return
    setErroDoPainel(null)
    try {
      if (painel.tipo === 'salvar' || painel.tipo === 'renomear') {
        const motivo = problemaDoNome(painel.nome)
        if (motivo) { setErroDoPainel(motivo); return }
        const nome = normalizarNome(painel.nome)
        if (painel.tipo === 'salvar') {
          const novo = await operacoes.salvar.mutateAsync({ name: nome, ...corpoDoModelo(estado, dataset) })
          setEstado(s => ({ ...s, modeloId: idDaEquipe(novo.id), avisos: [] }))
          toast.success(`Modelo "${novo.name}" salvo para a equipe.`)
        } else if (daEquipe && nome !== daEquipe.name) {
          const mudado = await operacoes.mudar.mutateAsync({ id: daEquipe.id, body: { name: nome } })
          toast.success(`Modelo renomeado para "${mudado.name}".`)
        }
      } else if (painel.tipo === 'atualizar' && daEquipe) {
        const mudado = await operacoes.mudar.mutateAsync({ id: daEquipe.id, body: corpoDoModelo(estado, dataset) })
        setEstado(s => ({ ...s, avisos: [] }))
        toast.success(`Modelo "${mudado.name}" atualizado.`)
      } else if (painel.tipo === 'excluir' && daEquipe) {
        await operacoes.excluir.mutateAsync(daEquipe.id)
        // As colunas ficam; o nome passa a ser o de um modelo que bata com elas, ou nenhum.
        const restantes = semModelo(equipe, daEquipe.id)
        setEstado(s => ({ ...s, modeloId: modeloQueBate(catalog, s.fields, restantes)?.id ?? null }))
        toast.success(`Modelo "${daEquipe.name}" excluído.`)
      }
      fecharPainel()
    } catch (e) {
      setErroDoPainel(apiErrorMessage(e, ERRO_DO_PAINEL[painel.tipo]))
    }
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
      const { count, abriuAba } = await exportarRelatorio(dataset, params, formatoDaApi(formato), {
        fields: estado.fields,
        // O nome do modelo (de fábrica ou da equipe), com "(alterado)" se mudou: vai para o PDF, o Excel e a auditoria.
        modelo: modeloParaApi(estado, catalog, equipe),
        confirmed: estado.confirmed,
        print: imprimir,
        printWindow: aba,
        // Com "Só confirmadas" a tela pode não saber quantas são: em vez de um
        // arquivo vazio, o aviso aparece aqui.
        recusarVazio: true,
      })
      guardarUltimo(dataset, ultimoDoEstado(estado, catalog, equipe))
      toast.success(
        imprimir
          ? abriuAba
            ? 'Relatório aberto em outra aba para imprimir.'
            : 'O navegador não abriu outra aba: o relatório foi baixado. Abra o arquivo para imprimir.'
          : textoDoBaixado(formatoDaApi(formato), count),
      )
      onOpenChange(false)
    } catch (e) {
      aba?.close()
      setErro(
        e instanceof RelatorioVazioError
          ? (estado.confirmed ? TEXTO_NENHUMA_CONFIRMADA : TEXTO_NENHUM_REGISTRO)
          : exportErrorMessage(e, 'Não foi possível gerar o relatório. Tente de novo.'),
      )
    } finally {
      setBaixando(false)
    }
  }

  const titulo = `Montar relatório · ${catalog.title || 'Exportação'}`

  // ---- pedaços que as duas telas usam ----

  const deFabrica = modelos.filter(m => !m.daEquipe)
  const modelosDaEquipe = modelos.filter(m => m.daEquipe)
  const opcao = (m: (typeof modelos)[number]) => <option key={m.id} value={m.id}>{m.name}</option>

  const seletor = (
    <select
      id={`${ids}-modelo`}
      ref={seletorRef}
      // Alterado (ou montado à mão) mostra o texto à parte, para escolher o
      // mesmo modelo de novo funcionar (o select não avisa troca para o mesmo valor).
      value={alterado || !modeloEscolhido ? '' : modeloEscolhido.id}
      onChange={e => {
        const id = e.target.value
        if (!id) return
        setPainel(null)
        setErroDoPainel(null)
        mudar(s => aplicarModelo(s, catalog, id, equipe))
      }}
      className={cn(
        'min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:max-w-xs',
        celular ? 'h-11' : 'h-8',
      )}
    >
      {(alterado || !modeloEscolhido) && (
        <option value="" disabled>{carregandoModelo ? 'Carregando o modelo…' : (nomeModelo ?? 'Montado à mão')}</option>
      )}
      {modelosDaEquipe.length > 0 ? (
        <>
          <optgroup label="Modelos de fábrica">{deFabrica.map(opcao)}</optgroup>
          <optgroup label="Modelos da equipe">{modelosDaEquipe.map(opcao)}</optgroup>
        </>
      ) : deFabrica.map(opcao)}
    </select>
  )

  // Renomear e excluir: só no modelo da equipe aberto. Com campo que a pessoa
  // não pode exportar, ficam desligados, com o motivo (a API daria 403).
  const tamanhoDoBotao = celular ? 'size-11' : 'size-8'
  const botoesDoModelo = daEquipe && (
    <span className="flex shrink-0 items-center" title={trava ?? undefined}>
      <Button
        type="button" variant="ghost" size="icon" className={tamanhoDoBotao}
        aria-label={`Renomear o modelo "${daEquipe.name}"`} title={trava ? undefined : 'Renomear'}
        disabled={!!trava || enviando}
        onClick={() => abrirPainel({ tipo: 'renomear', nome: daEquipe.name })}
      >
        <Pencil />
      </Button>
      <Button
        type="button" variant="ghost" size="icon" className={tamanhoDoBotao}
        aria-label={`Excluir o modelo "${daEquipe.name}"`} title={trava ? undefined : 'Excluir'}
        disabled={!!trava || enviando}
        onClick={() => abrirPainel({ tipo: 'excluir' })}
      >
        <Trash2 />
      </Button>
    </span>
  )

  const botaoSalvarComo = salvaModelos && (
    <Button
      type="button" variant="outline" className={cn('gap-1.5', celular ? 'h-11' : 'ml-auto')}
      disabled={estado.fields.length === 0 || enviando}
      onClick={() => abrirPainel({ tipo: 'salvar', nome: '' })}
    >
      <Save /> Salvar como modelo…
    </Button>
  )

  const textoDoPainel = !painel || !daEquipe ? null
    : painel.tipo === 'atualizar'
      ? `Salvar no modelo "${daEquipe.name}" as colunas${comConfirmadas ? ', o formato e o "Só confirmadas"' : ' e o formato'} de agora? Ele muda para toda a equipe.`
      : painel.tipo === 'excluir'
        ? `Excluir o modelo "${daEquipe.name}"? Ele sai da lista de modelos para toda a equipe.`
        : null

  const erroNaTela = erroDoPainel && (
    <p id={`${ids}-erro-modelo`} role="alert" className="text-sm text-destructive">{erroDoPainel}</p>
  )

  const painelDoModelo = !painel || (painel.tipo !== 'salvar' && !daEquipe) ? null : (
    <div role="group" aria-label={TITULO_DO_PAINEL[painel.tipo]} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
      {painel.tipo === 'salvar' || painel.tipo === 'renomear' ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={e => { e.preventDefault(); void confirmarPainel() }}
        >
          <label htmlFor={`${ids}-nome`} className="text-sm font-medium text-foreground">
            {painel.tipo === 'salvar' ? 'Nome do modelo' : 'Novo nome do modelo'}
          </label>
          <div className="flex flex-wrap gap-2">
            <Input
              id={`${ids}-nome`}
              value={painel.nome}
              maxLength={NOME_DO_MODELO_MAX}
              autoFocus
              autoComplete="off"
              placeholder="Ex.: Telefones dos associados"
              aria-invalid={erroDoPainel ? true : undefined}
              aria-describedby={erroDoPainel ? `${ids}-erro-modelo` : undefined}
              onChange={e => { const nome = e.target.value; setPainel(p => (p && 'nome' in p ? { ...p, nome } : p)) }}
              className={cn('min-w-0 flex-1 basis-48', celular && 'h-11')}
            />
            <div className="flex gap-2">
              <Button type="submit" className={cn('gap-2', celular && 'h-11')} disabled={enviando}>
                {enviando && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {painel.tipo === 'salvar' ? 'Salvar modelo' : 'Renomear'}
              </Button>
              <Button type="button" variant="outline" className={cn(celular && 'h-11')} onClick={fecharPainel}>Cancelar</Button>
            </div>
          </div>
          {painel.tipo === 'salvar' && (
            <p className="text-xs text-muted-foreground">
              {comConfirmadas
                ? 'O modelo fica para toda a equipe, com as colunas, o formato e o "Só confirmadas" de agora.'
                : 'O modelo fica para toda a equipe, com as colunas e o formato de agora.'}
            </p>
          )}
          {erroNaTela}
        </form>
      ) : (
        <>
          <p className="text-sm text-foreground">{textoDoPainel}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={painel.tipo === 'excluir' ? 'destructive' : 'default'}
              className={cn('gap-2', celular && 'h-11')}
              disabled={enviando}
              autoFocus={painel.tipo === 'atualizar'}
              onClick={() => void confirmarPainel()}
            >
              {enviando && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {painel.tipo === 'excluir' ? 'Excluir modelo' : 'Salvar no modelo'}
            </Button>
            <Button
              type="button" variant="outline" className={cn(celular && 'h-11')}
              autoFocus={painel.tipo === 'excluir'}
              onClick={fecharPainel}
            >
              Cancelar
            </Button>
          </div>
          {erroNaTela}
        </>
      )}
    </div>
  )

  const seletorDeModelo = (
    <div className="flex flex-col gap-2">
      {celular ? (
        <>
          <div className="flex items-center gap-2">
            <label htmlFor={`${ids}-modelo`} className="text-sm text-muted-foreground">Modelo</label>
            {seletor}
          </div>
          {(botaoSalvarComo || botoesDoModelo) && (
            <div className="flex flex-wrap items-center gap-1">
              {botaoSalvarComo}
              {botoesDoModelo}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <label htmlFor={`${ids}-modelo`} className="text-sm text-muted-foreground">Modelo</label>
          {seletor}
          {botoesDoModelo}
          {botaoSalvarComo}
        </div>
      )}
      {daEquipe && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">{autoriaDoModelo(daEquipe)}</p>
          {oferecerAtualizar && painel?.tipo !== 'atualizar' && (
            <Button
              type="button" variant="outline" size={celular ? 'default' : 'sm'} className={cn('gap-1.5', celular && 'h-11')}
              disabled={enviando}
              onClick={() => abrirPainel({ tipo: 'atualizar' })}
            >
              <Save /> Salvar alterações no modelo
            </Button>
          )}
        </div>
      )}
      {trava && <p className="text-xs text-muted-foreground">{trava}</p>}
      {listaDaEquipe.isError && listaDaEquipe.data === undefined && (
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          Os modelos da equipe não carregaram.
          <Button
            type="button" variant="link" size="sm" className="h-auto p-0 text-xs"
            onClick={() => void listaDaEquipe.refetch()}
          >
            Tentar de novo
          </Button>
        </p>
      )}
      {painelDoModelo}
      {/* Sem o painel (o modelo sumiu da lista: 404 de quem excluiu antes), o erro fica aqui. */}
      {!painelDoModelo && erroNaTela}
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

  // O número do "Todos" segue o "Só confirmadas" (ou vira teto: "até 5").
  const numeroTodos = contagem(quantosVaoSair({ ...estado, scope: 'all' }, { ...contagens, total }))
  const todosRotulo = `${filtered && !celular ? 'Todos com os filtros atuais' : 'Todos'}${numeroTodos}`
  const oQueEntra = (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1 text-sm font-medium text-foreground">O que entra</legend>
      {escopo ? (
        <p className="text-sm text-foreground">{escopo}</p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <label className={cn('flex cursor-pointer items-center gap-2 text-sm', celular && 'min-h-11')}>
            <input
              type="radio" name={`${ids}-escopo`} className="size-4 accent-primary"
              checked={estado.scope === 'all'} onChange={() => mudar(s => ({ ...s, scope: 'all' }))}
            />
            {todosRotulo}
          </label>
          {temSelecao && (
            <label className={cn('flex items-center gap-2 text-sm', selecionados === 0 ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer', celular && 'min-h-11')}>
              <input
                type="radio" name={`${ids}-escopo`} className="size-4 accent-primary"
                checked={estado.scope === 'selected'} disabled={selecionados === 0}
                onChange={() => mudar(s => ({ ...s, scope: 'selected' }))}
              />
              {selecionados > 0 ? `Selecionados (${selecionados.toLocaleString('pt-BR')})` : 'Selecionados (marque na lista)'}
            </label>
          )}
        </div>
      )}
      {!escopo && estado.scope === 'all' && filtrosTexto.length > 0 && (
        <p className="text-xs text-muted-foreground">Filtros: {filtrosTexto.join(' · ')}</p>
      )}
      {estado.scope === 'all' && corte && <p className="text-xs text-muted-foreground">{corte}</p>}
      {dataset === 'registrations' && (
        <label className={cn('flex cursor-pointer items-center gap-2 text-sm', celular && 'min-h-11')}>
          <input
            type="checkbox" className="size-4 accent-primary"
            checked={estado.confirmed} onChange={e => { const v = e.target.checked; mudar(s => ({ ...s, confirmed: v })) }}
          />
          Só confirmadas{totalConfirmadas != null ? ` (${totalConfirmadas.toLocaleString('pt-BR')})` : ''}
        </label>
      )}
    </fieldset>
  )

  // O Excel aparece também no celular; só o "Imprimir" fica de fora lá.
  const opcoesDeFormato: { valor: ReportFormat; rotulo: string }[] = [
    { valor: 'csv', rotulo: 'Planilha CSV' },
    { valor: 'xlsx', rotulo: 'Planilha do Excel (.xlsx)' },
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

  // O "?" da Ajuda: 44 px no celular; no computador, do tamanho do título.
  // Abre em outra aba: na mesma, a tela trocava e as colunas montadas sem
  // baixar se perdiam. Aqui o montador fica aberto como estava.
  const ajuda = (
    <AjudaLink
      topico="montar-relatorio"
      titulo="Montar relatório"
      novaAba
      className="md:size-7"
    />
  )

  if (celular) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {/* A altura vai no mesmo seletor do ui/sheet (data-[side=bottom]:h-auto),
            senão ele ganha: a folha encolhia e a busca pulava enquanto se digitava. */}
        <SheetContent
          side="bottom" showCloseButton={false} className="max-h-dvh gap-0 p-0 data-[side=bottom]:h-dvh"
          onEscapeKeyDown={fecharSoOPainel}
        >
          <div className="flex items-center gap-1 border-b border-border px-1 py-1">
            {tela === 'campos' && (
              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Voltar às colunas" onClick={() => setTela('colunas')}>
                <ArrowLeft />
              </Button>
            )}
            <SheetTitle className="min-w-0 flex-1 truncate px-2">{tela === 'campos' ? 'Adicionar campo' : titulo}</SheetTitle>
            {ajuda}
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
              // A lista de colunas fica por último e o "+ Adicionar campo" no
              // topo dela: com o Padrão (57 colunas) ela passa de 3.000 px, e o
              // resto ficaria lá embaixo.
              <div className="flex flex-col gap-4">
                {seletorDeModelo}
                {oQueEntra}
                {escolhaDeFormato}
                {avisos}
                <section className="flex flex-col gap-2 border-t border-border pt-3">
                  <h3 className="text-sm font-medium text-foreground">Colunas, nesta ordem ({estado.fields.length})</h3>
                  <Button type="button" variant="outline" className="h-11 gap-2" onClick={() => setTela('campos')}>
                    <Plus /> Adicionar campo
                  </Button>
                  {listaDeColunas}
                </section>
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
      <DialogContent className="flex h-[min(760px,92dvh)] flex-col gap-3 sm:max-w-[880px]" onEscapeKeyDown={fecharSoOPainel}>
        <DialogHeader className="pr-8">
          <div className="flex items-center gap-1">
            <DialogTitle>{titulo}</DialogTitle>
            {ajuda}
          </div>
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
