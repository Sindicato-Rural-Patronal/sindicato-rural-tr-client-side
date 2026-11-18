// Visões da lista (decisão 007, SR-149/SR-150): as regras, PURAS e testadas.
//
// Uma visão é o conjunto de colunas, na ordem, mais os filtros que ela liga. As de
// fábrica vêm do catálogo da API (`visoes`); as da equipe são os modelos da equipe
// da mesma fonte (`ReportTemplate`, com `filters`). Nada aqui conhece os campos de
// uma fonte: as colunas são chaves do catálogo, e os filtros, as chaves da lista
// na API (`type`, `categoryId`, `excludeTransfers`…). Cada tela traduz a URL dela
// para essas chaves.
import { brasiliaToday } from '@/utils/course-status'
import {
  LIMITE_DO_PDF_PADRAO, NOME_DO_MODELO_MAX, filtrosEmPalavras, normalizarNome, textoDoLimiteDoPdf,
  type ExportCatalog, type FiltrosDaVisao, type ModeloDaEquipe,
} from '@/components/export/report-builder'

// ---------------------------------------------------------------------------
// Período relativo (a visão nunca guarda datas fixas)
// ---------------------------------------------------------------------------

export type Periodo = 'mes-atual' | 'mes-passado' | 'ano-atual' | 'ultimos-12-meses'

/** Na ordem do "Período" do "Salvar como…" (e os nomes da API, `visaoFiltersText`). */
export const PERIODOS: readonly { valor: Periodo; rotulo: string }[] = [
  { valor: 'mes-atual', rotulo: 'mês atual' },
  { valor: 'mes-passado', rotulo: 'mês passado' },
  { valor: 'ano-atual', rotulo: 'ano atual' },
  { valor: 'ultimos-12-meses', rotulo: 'últimos 12 meses' },
]

export function ehPeriodo(v: unknown): v is Periodo {
  return PERIODOS.some(p => p.valor === v)
}

export function rotuloDoPeriodo(p: Periodo): string {
  return PERIODOS.find(x => x.valor === p)?.rotulo ?? p
}

const ymd = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const ultimoDia = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

/**
 * As datas do período pelo dia de Brasília (o mesmo dia de `currentMonthRange`):
 * meses inteiros; "ano atual" de 1º/1 a 31/12; "últimos 12 meses" do 1º dia de 11
 * meses atrás ao último dia deste mês.
 */
export function datasDoPeriodo(p: Periodo, now: Date = new Date()): { from: string; to: string } {
  const [y, m] = brasiliaToday(now).split('-').map(Number)
  if (p === 'mes-atual') return { from: ymd(y, m, 1), to: ymd(y, m, ultimoDia(y, m)) }
  if (p === 'mes-passado') {
    const yy = m === 1 ? y - 1 : y
    const mm = m === 1 ? 12 : m - 1
    return { from: ymd(yy, mm, 1), to: ymd(yy, mm, ultimoDia(yy, mm)) }
  }
  if (p === 'ano-atual') return { from: ymd(y, 1, 1), to: ymd(y, 12, 31) }
  const inicio = new Date(Date.UTC(y, m - 1 - 11, 1))
  return { from: ymd(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 1), to: ymd(y, m, ultimoDia(y, m)) }
}

/** O período cujas datas são exatamente estas (para já vir marcado no "Salvar como…"); senão, null. */
export function periodoDasDatas(from: string | undefined, to: string | undefined, now: Date = new Date()): Periodo | null {
  if (!from || !to) return null
  return PERIODOS.find(({ valor }) => {
    const d = datasDoPeriodo(valor, now)
    return d.from === from && d.to === to
  })?.valor ?? null
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

/**
 * Os filtros da lista na tela, com as chaves da API (`from`, `to`, `type`,
 * `categoryId`…). Ausente, vazio ou `false` = desligado.
 */
export type FiltrosDaLista = Record<string, string | boolean | undefined>

/** Nunca vão para a visão: datas fixas ficam velhas, e a busca é do momento. */
export const FILTROS_QUE_NAO_SE_GUARDAM: readonly string[] = ['from', 'to', 'search', 'ids']

const ligado = (v: string | boolean | undefined): v is string | true => v === true || (typeof v === 'string' && v !== '')

/**
 * O que aplicar a visão muda nos filtros da tela: só as chaves que ela guarda
 * (o resto fica como está) e, com período, as datas dele. `false` desliga.
 */
export function patchDaVisao(filters: FiltrosDaVisao | null, now: Date = new Date()): FiltrosDaLista {
  if (!filters) return {}
  const patch: FiltrosDaLista = {}
  for (const [chave, valor] of Object.entries(filters)) {
    if (chave === 'periodo') continue
    if (FILTROS_QUE_NAO_SE_GUARDAM.includes(chave)) continue
    patch[chave] = ligado(valor) ? valor : undefined
  }
  if (ehPeriodo(filters.periodo)) Object.assign(patch, datasDoPeriodo(filters.periodo, now))
  return patch
}

/** Algum filtro que a visão guarda está diferente na tela? (É o que, com as colunas, faz a "(alterada)".) */
export function filtrosMudaram(filters: FiltrosDaVisao | null, tela: FiltrosDaLista, now: Date = new Date()): boolean {
  const patch = patchDaVisao(filters, now)
  const norm = (v: string | boolean | undefined) => (ligado(v) ? v : undefined)
  return Object.keys(patch).some(k => norm(patch[k]) !== norm(tela[k]))
}

/**
 * "Guardar os filtros de agora": só os que estão ligados (decisão do usuário,
 * 18/11), nunca a busca nem as datas, e o período escolhido no fim. Nada ligado e
 * sem período = null (a visão aplica só as colunas).
 */
export function filtrosParaGuardar(tela: FiltrosDaLista, periodo: Periodo | null): FiltrosDaVisao | null {
  const filtros: FiltrosDaVisao = {}
  for (const [chave, valor] of Object.entries(tela)) {
    if (FILTROS_QUE_NAO_SE_GUARDAM.includes(chave) || chave === 'periodo') continue
    if (ligado(valor)) filtros[chave] = valor
  }
  if (periodo) filtros.periodo = periodo
  return Object.keys(filtros).length ? filtros : null
}

/**
 * Os filtros da visão em palavras, como a linha "Filtros:" do PDF, com o período
 * no fim: "Tipo: Entrada · Sem transferências entre caixas · Período: mês passado".
 * `textos` é o que a tela sabe dizer melhor (categoria e caixa pelo nome).
 */
export function filtrosDaVisaoEmPalavras(
  filters: FiltrosDaVisao | null,
  filterLabels: Record<string, string>,
  textos: Record<string, string> = {},
): string[] {
  if (!filters) return []
  const { periodo, ...resto } = filters
  const partes = filtrosEmPalavras(resto, filterLabels, { textos })
  if (ehPeriodo(periodo)) partes.push(`Período: ${rotuloDoPeriodo(periodo)}`)
  return partes
}

// ---------------------------------------------------------------------------
// As visões
// ---------------------------------------------------------------------------

/** A visão Padrão da lista (a tela de sempre): é a primeira do catálogo. */
export const ID_DO_PADRAO = 'padrao-tela'

const PREFIXO_DA_EQUIPE = 'equipe:'

export type Visao = {
  /** O id de fábrica ("contabilidade") ou `equipe:<id do modelo>`. */
  id: string
  name: string
  /** As colunas que existem no catálogo, na ordem. */
  fields: string[]
  /** Colunas gravadas que saíram do catálogo (só nas da equipe). */
  missingFields: string[]
  filters: FiltrosDaVisao | null
  origem: 'fabrica' | 'equipe'
  /** O modelo da equipe por trás (só nas da equipe). */
  modelo?: ModeloDaEquipe
}

export function idDaVisaoDaEquipe(idDoModelo: string): string {
  return `${PREFIXO_DA_EQUIPE}${idDoModelo}`
}

/**
 * As visões do seletor: as de fábrica do catálogo (a Padrão primeiro) e, depois,
 * as da equipe, pelo nome (a ordem da API). Os modelos que a equipe salvou antes
 * da SR-149 (`filters` null) entram sozinhos, como visões só de colunas.
 */
export function visoesDaLista(catalog: ExportCatalog | null | undefined, equipe: ModeloDaEquipe[] = []): Visao[] {
  const deFabrica = (catalog?.visoes ?? []).map(v => ({
    id: v.id, name: v.name, fields: v.fields, missingFields: [], filters: v.filters, origem: 'fabrica' as const,
  }))
  const padrao = deFabrica.filter(v => v.id === ID_DO_PADRAO)
  const outras = deFabrica.filter(v => v.id !== ID_DO_PADRAO)
  return [
    ...padrao,
    ...outras,
    ...equipe.map(m => ({
      id: idDaVisaoDaEquipe(m.id),
      name: m.name,
      fields: m.fields,
      missingFields: m.missingFields,
      filters: m.filters,
      origem: 'equipe' as const,
      modelo: m,
    })),
  ]
}

export const mesmasColunas = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((k, i) => k === b[i])

/** O painel Colunas: marcar põe no fim; desmarcar tira (sempre fica pelo menos uma coluna). */
export function alternarColuna(cols: readonly string[], chave: string): string[] {
  if (!cols.includes(chave)) return [...cols, chave]
  return cols.length > 1 ? cols.filter(c => c !== chave) : [...cols]
}

/** ↑ e ↓ do painel Colunas. */
export function moverColuna(cols: readonly string[], chave: string, passo: -1 | 1): string[] {
  const i = cols.indexOf(chave)
  const j = i + passo
  if (i < 0 || j < 0 || j >= cols.length) return [...cols]
  const nova = [...cols]
  ;[nova[i], nova[j]] = [nova[j], nova[i]]
  return nova
}

/** `?cols=` da URL → as colunas (sem vazias nem repetidas); ausente, null. */
export function colunasDaUrl(cols: string | undefined): string[] | null {
  if (!cols) return null
  const lista = [...new Set(cols.split(',').map(c => c.trim()).filter(Boolean))]
  return lista.length ? lista : null
}

/** O `?cols=` só existe quando as colunas diferem das da visão. */
export function colunasParaUrl(cols: readonly string[], daVisao: readonly string[]): string | undefined {
  return mesmasColunas(cols, daVisao) ? undefined : cols.join(',')
}

/**
 * As colunas que a tela mostra: as da URL (ou do navegador) que ainda estão no
 * catálogo, ou as da visão. Coluna que saiu do catálogo some sem quebrar.
 */
export function colunasDaTela(visao: Pick<Visao, 'fields'>, pedidas: string[] | null, noCatalogo?: (k: string) => boolean): string[] {
  const base = pedidas ?? visao.fields
  const validas = noCatalogo ? base.filter(noCatalogo) : base
  return validas.length ? validas : visao.fields
}

const SUFIXO_ALTERADA = ' (alterada)'

/** "Contabilidade (alterada)". */
export function rotuloDaVisao(nome: string, alterada: boolean): string {
  return `${nome}${alterada ? SUFIXO_ALTERADA : ''}`
}

/**
 * O nome que vai na exportação (`visao`, até 64): com "(alterada)" e o nome
 * comprido, o nome encurta com "…" para o "(alterada)" não se perder.
 */
export function visaoParaApi(nome: string, alterada: boolean): string {
  if (!alterada) return nome.slice(0, NOME_DO_MODELO_MAX)
  const cabe = NOME_DO_MODELO_MAX - SUFIXO_ALTERADA.length
  const curto = nome.length > cabe ? `${nome.slice(0, cabe - 1).trimEnd()}…` : nome
  return `${curto}${SUFIXO_ALTERADA}`
}

/** O mesmo que a API confere no nome (400), com as palavras da visão. null = pode. */
export function problemaDoNomeDaVisao(nome: string): string | null {
  const limpo = normalizarNome(nome)
  if (!limpo) return 'Informe o nome da visão.'
  if (limpo.length > NOME_DO_MODELO_MAX) return `O nome da visão pode ter até ${NOME_DO_MODELO_MAX} caracteres.`
  return null
}

const DIA_BRASILIA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
})

function diaBrasilia(iso: string): string | null {
  const data = new Date(iso)
  return iso && !Number.isNaN(data.getTime()) ? DIA_BRASILIA.format(data) : null
}

/** "Visão da equipe, criada por gestor em 10/11/2026 e editada por bali em 11/11/2026." */
export function autoriaDaVisao(modelo: ModeloDaEquipe): string {
  const parte = (verbo: string, quem: string | null | undefined, iso: string) => {
    const dia = diaBrasilia(iso)
    return `${verbo}${quem ? ` por ${quem}` : ''}${dia ? ` em ${dia}` : ''}`
  }
  const criada = parte('criada', modelo.createdBy.username, modelo.createdAt)
  const editada = modelo.updatedBy ? ` e ${parte('editada', modelo.updatedBy.username, modelo.updatedAt)}` : ''
  return `Visão da equipe, ${criada}${editada}.`
}

// ---------------------------------------------------------------------------
// O último estado, no navegador (por pessoa: é o navegador dela)
// ---------------------------------------------------------------------------

export type UltimaVisao = { visao: string; cols?: string }

export function chaveDaUltimaVisao(dataset: string): string {
  return `sr:visao:${dataset}`
}

export function lerUltimaVisao(dataset: string): UltimaVisao | null {
  try {
    const v = JSON.parse(localStorage.getItem(chaveDaUltimaVisao(dataset)) ?? 'null') as unknown
    if (!v || typeof v !== 'object') return null
    const { visao, cols } = v as Record<string, unknown>
    if (typeof visao !== 'string' || !visao) return null
    return { visao, ...(typeof cols === 'string' && cols ? { cols } : {}) }
  } catch {
    return null
  }
}

export function guardarUltimaVisao(dataset: string, ultima: UltimaVisao): void {
  try {
    localStorage.setItem(chaveDaUltimaVisao(dataset), JSON.stringify(ultima))
  } catch {
    // Sem armazenamento (aba anônima, cota): a tela continua, só não lembra.
  }
}

/**
 * Ao abrir a lista sem `?visao`, a última visão volta. Os filtros dela só são
 * aplicados se a URL não traz nenhum dos que ela guarda (um link ou o clique no
 * painel mandam os filtros deles, e esses ganham).
 */
export function deveAplicarFiltrosAoVoltar(filters: FiltrosDaVisao | null, tela: FiltrosDaLista): boolean {
  if (!filters) return false
  const chaves = Object.keys(patchDaVisao(filters))
  return !chaves.some(k => ligado(tela[k]))
}

// ---------------------------------------------------------------------------
// Exportar o que está na tela
// ---------------------------------------------------------------------------

/** Por que o PDF (e o Imprimir) está desligado: acima do limite de linhas da API; null = pode. */
export function pdfDesligado(total: number | undefined, catalog: Pick<ExportCatalog, 'limits'> | null): string | null {
  const limite = catalog?.limits.pdfRows ?? LIMITE_DO_PDF_PADRAO
  return total != null && total > limite ? textoDoLimiteDoPdf(limite) : null
}
