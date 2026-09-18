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

/** Baixa a planilha e devolve quantos registros vieram (-1 se não souber). */
export async function downloadExport(dataset: ExportDataset, params: ExportParams = {}): Promise<number> {
  const res = await apiFetch(`/admin/export/${dataset}`, {
    method: 'POST',
    body: JSON.stringify(exportBody(params)),
  })
  const blob = await res.blob()

  const disposition = res.headers.get('Content-Disposition') ?? ''
  const today = new Date().toISOString().slice(0, 10)
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `${FALLBACK_NAME[dataset]}-${today}.csv`
  saveBlob(blob, filename)

  // Header ausente (ex.: CORS sem expor) não pode virar "0 registros"
  const header = res.headers.get('X-Export-Count')
  if (header == null) return -1
  const count = Number(header)
  return Number.isFinite(count) ? count : -1
}
