import { ApiError, apiFetch } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error-message'
import { saveBlob } from '@/utils/download'

// Exportação (POST /admin/export/:dataset, filtros no corpo). Com `ids` o
// backend exporta só esses registros; sem, tudo o que bate com os mesmos
// filtros da listagem. POST porque uma seleção grande estoura o limite da URL.
//
// Sem `fields`, sai o modelo padrão (as colunas de sempre, em CSV). O montador
// de relatórios (decisão 006) e o PDF rápido do menu (nas fontes com montador,
// modelo "Resumo") mandam também `fields` (as chaves do catálogo, na ordem das
// colunas), `format` e `modelo`; com `format: 'pdf'` a API devolve JSON e o PDF
// é desenhado aqui (`lib/relatorio-pdf.tsx`).

export type ExportDataset =
  | 'people'
  | 'companies'
  | 'properties'
  | 'admins'
  | 'courses'
  | 'registrations'
  | 'contact-messages'
  | 'unimed'
  | 'audit-logs'
  | 'room-bookings'
  /** Relatório de cadastros: os 4 tipos num arquivo só (READ_USER_ADMIN). */
  | 'cadastros'

export type ExportParams = Record<string, string | number | boolean | string[] | null | undefined>

const FALLBACK_NAME: Record<ExportDataset, string> = {
  people: 'pessoas',
  companies: 'empresas',
  properties: 'propriedades',
  admins: 'administradores',
  courses: 'cursos',
  registrations: 'inscricoes',
  'contact-messages': 'mensagens',
  unimed: 'unimed',
  'audit-logs': 'auditoria',
  'room-bookings': 'agenda-salas',
  cadastros: 'relatorio-de-cadastros',
}

/**
 * Corpo da exportação: vazio/nulo e listas vazias ficam de fora (o backend
 * recusa `ids: []`). Os demais valores vão como texto, igual à query do GET.
 */
export function exportBody(params: ExportParams): Record<string, string | string[]> {
  const body: Record<string, string | string[]> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length) body[key] = value.map(String)
    } else {
      body[key] = String(value)
    }
  }
  return body
}

/**
 * Nome amigável do relatório, para o título do PDF montado do CSV (Relatório de
 * cadastros, fonte sem catálogo) e quando o JSON do PDF vem sem título.
 */
const TITULO: Record<ExportDataset, string> = {
  people: 'Pessoas',
  companies: 'Empresas',
  properties: 'Propriedades',
  admins: 'Administradores',
  courses: 'Cursos',
  registrations: 'Inscrições',
  'contact-messages': 'Mensagens de contato',
  unimed: 'Beneficiários Unimed',
  'audit-logs': 'Auditoria',
  'room-bookings': 'Reservas de sala',
  cadastros: 'Relatório de cadastros',
}

export type ExportFormat = 'csv' | 'pdf'

/** O que o montador de relatórios manda além dos filtros (decisão 006). */
export type ExportOptions = {
  /** Chaves do catálogo, na ordem das colunas. Ausente = o modelo padrão. */
  fields?: string[]
  /** Nome do modelo usado: só vai para a auditoria e para o cabeçalho do PDF. */
  modelo?: string
  /** Só as inscrições confirmadas (`registrations`). */
  confirmed?: boolean
  /** Imprimir: o PDF abre numa aba nova em vez de baixar. */
  print?: boolean
  /**
   * Aba já aberta no clique. O navegador bloqueia a aba que abre depois de
   * esperar a API e o desenho do PDF; aberta no clique, ela só recebe o PDF.
   */
  printWindow?: Window | null
  /**
   * Nada de arquivo vazio: com 0 registros, lança `RelatorioVazioError` em vez
   * de baixar (o montador avisa na tela). Só vale quando a resposta diz quantos.
   */
  recusarVazio?: boolean
}

/** O relatório saiu sem nenhum registro e não foi baixado (`recusarVazio`). */
export class RelatorioVazioError extends Error {
  constructor() {
    super('O relatório não tem nenhum registro.')
    this.name = 'RelatorioVazioError'
  }
}

export type ResultadoDaExportacao = {
  /** Quantos registros vieram (-1 = não se sabe). */
  count: number
  /** Imprimir: true = o PDF abriu numa aba; false = o navegador bloqueou e o arquivo foi baixado. */
  abriuAba: boolean
}

/** Uma coluna do relatório em JSON (decisão 006, seção 3). */
export type RelatorioColuna = { key: string; label: string; type: string; weight?: number }

/** Resposta de `format: 'pdf'`: as células já vêm formatadas como no CSV. */
export type RelatorioJson = {
  title: string
  filename: string
  count: number
  /** Os filtros em palavras ("Aba Associados · Busca: silva"). */
  filters: string | null
  modelo: string | null
  columns: RelatorioColuna[]
  rows: string[][]
}

/** Confere o JSON do PDF. Fora do formato é erro (não dá para desenhar). */
export function lerRelatorioJson(data: unknown, fallbackTitle: string, fallbackFilename: string): RelatorioJson {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  if (!Array.isArray(d.columns) || !Array.isArray(d.rows)) {
    throw new Error('Resposta do relatório em PDF fora do formato.')
  }
  const columns: RelatorioColuna[] = (d.columns as unknown[]).map((c, i) => {
    const col = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>
    return {
      key: typeof col.key === 'string' ? col.key : String(i),
      label: typeof col.label === 'string' ? col.label : '',
      type: typeof col.type === 'string' ? col.type : 'text',
      ...(typeof col.weight === 'number' && col.weight > 0 ? { weight: col.weight } : {}),
    }
  })
  const rows = (d.rows as unknown[]).map(r =>
    Array.isArray(r) ? r.map(v => (v == null ? '' : String(v))) : [],
  )
  const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null)
  return {
    title: texto(d.title) ?? fallbackTitle,
    filename: texto(d.filename) ?? fallbackFilename,
    count: typeof d.count === 'number' ? d.count : rows.length,
    filters: texto(d.filters),
    modelo: texto(d.modelo),
    columns,
    rows,
  }
}

/** Corpo do pedido: os filtros da tela (ou `ids`) mais o que o montador escolheu. */
export function reportBody(params: ExportParams, format: ExportFormat, opts: ExportOptions = {}): Record<string, unknown> {
  const body: Record<string, unknown> = exportBody(params)
  if (opts.fields) {
    body.fields = opts.fields
    body.format = format
    if (opts.modelo) body.modelo = opts.modelo
  }
  if (opts.confirmed) body.confirmed = true
  return body
}

/**
 * Mensagem do erro da exportação. O 429 da rota já vem em português ("Muitas
 * exportações seguidas. Aguarde um minuto…") e é mais certo que o texto genérico
 * do 429 do login, que o `apiErrorMessage` usaria.
 */
export function exportErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.status === 429 && /^Muitas /.test(err.message)) return err.message
  return apiErrorMessage(err, fallback)
}

/**
 * Abre o PDF para imprimir; se o navegador bloquear a aba, baixa o arquivo.
 * Devolve true quando abriu numa aba.
 */
function abrirParaImprimir(blob: Blob, filename: string, printWindow?: Window | null): boolean {
  const url = URL.createObjectURL(blob)
  let abriu = true
  if (printWindow && !printWindow.closed) {
    printWindow.location.href = url
  } else {
    const aba = window.open(url, '_blank')
    if (aba) aba.opener = null
    else {
      saveBlob(blob, filename)
      abriu = false
    }
  }
  // O leitor de PDF da aba já carregou o arquivo bem antes disso.
  setTimeout(() => URL.revokeObjectURL(url), 10 * 60_000)
  return abriu
}

/** `X-Export-Count`; ausente (ex.: CORS sem expor) não pode virar "0 registros". */
function contagemDoCabecalho(res: Response): number {
  const header = res.headers.get('X-Export-Count')
  if (header == null) return -1
  const count = Number(header)
  return Number.isFinite(count) ? count : -1
}

/**
 * Baixa o relatório (ou abre para imprimir) e diz quantos registros vieram e
 * se a aba de imprimir abriu.
 *
 * Com `opts.fields` (o montador e, nas fontes com montador, o PDF rápido do
 * menu), o PDF vem como JSON, só com as colunas escolhidas. Sem `opts.fields`,
 * o servidor manda CSV e o PDF é montado aqui a partir dele, com as colunas que
 * cabem no papel: é o caminho do "Relatório de cadastros" (4 tabelas num
 * arquivo) e das fontes sem catálogo (back velho).
 */
export async function exportarRelatorio(
  dataset: ExportDataset,
  params: ExportParams = {},
  format: ExportFormat = 'csv',
  opts: ExportOptions = {},
): Promise<ResultadoDaExportacao> {
  const res = await apiFetch(`/admin/export/${dataset}`, {
    method: 'POST',
    body: JSON.stringify(reportBody(params, format, opts)),
  })
  const today = new Date().toISOString().slice(0, 10)

  if (opts.fields && format === 'pdf') {
    const data = lerRelatorioJson(await res.json(), TITULO[dataset], `${FALLBACK_NAME[dataset]}-${today}.pdf`)
    if (opts.recusarVazio && data.rows.length === 0) throw new RelatorioVazioError()
    // O react-pdf é pesado: só entra no pacote de quem pede um PDF.
    const { relatorioJsonPdf } = await import('@/lib/relatorio-pdf')
    const blob = await relatorioJsonPdf(data)
    if (opts.print) return { count: data.count, abriuAba: abrirParaImprimir(blob, data.filename, opts.printWindow) }
    saveBlob(blob, data.filename)
    return { count: data.count, abriuAba: false }
  }

  const count = contagemDoCabecalho(res)
  if (opts.recusarVazio && count === 0) throw new RelatorioVazioError()
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `${FALLBACK_NAME[dataset]}-${today}.csv`

  if (format === 'pdf') {
    const { saveRelatorioPdf } = await import('@/lib/relatorio-pdf')
    await saveRelatorioPdf(await blob.text(), TITULO[dataset], filename.replace(/\.csv$/i, '.pdf'))
  } else {
    saveBlob(blob, filename)
  }
  return { count, abriuAba: false }
}

/** Baixa o relatório e devolve quantos registros vieram (-1 se não souber). */
export async function downloadExport(
  dataset: ExportDataset,
  params: ExportParams = {},
  format: ExportFormat = 'csv',
  opts: ExportOptions = {},
): Promise<number> {
  return (await exportarRelatorio(dataset, params, format, opts)).count
}
