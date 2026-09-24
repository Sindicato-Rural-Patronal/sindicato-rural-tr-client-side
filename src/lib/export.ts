import { apiFetch } from '@/lib/api'
import { saveBlob } from '@/utils/download'

// Exportação CSV (POST /admin/export/:dataset, filtros no corpo). Com `ids` o
// backend exporta só esses registros; sem, tudo o que bate com os mesmos
// filtros da listagem. POST porque uma seleção grande estoura o limite da URL.

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

/** Nome amigável do relatório, para o título dentro do PDF. */
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

/**
 * Baixa o relatório e devolve quantos registros vieram (-1 se não souber).
 *
 * O servidor sempre manda CSV; o PDF é montado aqui a partir dele, como os
 * outros PDFs do painel. Assim as colunas continuam definidas num lugar só (o
 * backend) e o PDF nunca discorda da planilha.
 */
export async function downloadExport(
  dataset: ExportDataset,
  params: ExportParams = {},
  format: ExportFormat = 'csv',
): Promise<number> {
  const res = await apiFetch(`/admin/export/${dataset}`, {
    method: 'POST',
    body: JSON.stringify(exportBody(params)),
  })
  const blob = await res.blob()

  const disposition = res.headers.get('Content-Disposition') ?? ''
  const today = new Date().toISOString().slice(0, 10)
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `${FALLBACK_NAME[dataset]}-${today}.csv`

  if (format === 'pdf') {
    // O react-pdf é pesado: só entra no pacote de quem pede um PDF.
    const { saveRelatorioPdf } = await import('@/lib/relatorio-pdf')
    await saveRelatorioPdf(await blob.text(), TITULO[dataset], filename.replace(/\.csv$/i, '.pdf'))
  } else {
    saveBlob(blob, filename)
  }

  // Header ausente (ex.: CORS sem expor) não pode virar "0 registros"
  const header = res.headers.get('X-Export-Count')
  if (header == null) return -1
  const count = Number(header)
  return Number.isFinite(count) ? count : -1
}
