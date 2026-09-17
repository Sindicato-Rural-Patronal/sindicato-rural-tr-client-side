import { apiFetch } from '@/lib/api'

// Exportação CSV (GET /admin/export/:dataset). Com `ids` o backend exporta só
// esses registros; sem, tudo o que bate com os mesmos filtros da listagem.

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
}

/** Monta a query: listas viram "a,b,c"; vazio/nulo fica de fora. */
export function exportQuery(params: ExportParams): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length) qs.set(key, value.join(','))
    } else {
      qs.set(key, String(value))
    }
  }
  return qs.toString()
}

/** Baixa a planilha e devolve quantos registros vieram. */
export async function downloadExport(dataset: ExportDataset, params: ExportParams = {}): Promise<number> {
  const query = exportQuery(params)
  const res = await apiFetch(`/admin/export/${dataset}${query ? `?${query}` : ''}`)
  const blob = await res.blob()

  const disposition = res.headers.get('Content-Disposition') ?? ''
  const today = new Date().toISOString().slice(0, 10)
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `${FALLBACK_NAME[dataset]}-${today}.csv`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)

  const count = Number(res.headers.get('X-Export-Count'))
  return Number.isFinite(count) ? count : -1
}
