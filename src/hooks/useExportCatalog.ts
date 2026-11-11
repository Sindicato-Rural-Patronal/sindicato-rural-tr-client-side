import { useQuery } from '@tanstack/react-query'
import { ApiError, apiFetch } from '@/lib/api'
import type { ExportDataset } from '@/lib/export'
import { lerCatalogo, type ExportCatalog } from '@/components/export/report-builder'

// Catálogo do montador de relatórios (decisão 006): os campos que a fonte
// exporta, agrupados, com a permissão de cada um para quem pede, o padrão, os
// modelos de fábrica, o nome dos filtros e os limites.
//
// `null` = esta fonte não tem montador. É o 404 do back velho (a rota não
// existe) e das fontes que ainda não passaram ao motor ("Este conjunto ainda
// não tem o montador."): o item "Montar relatório…" não aparece e o menu fica
// como antes. O 403 também (sem a permissão da fonte, nem exportar dá).

/** O catálogo muda só com deploy ou com a regra de quem pede: pode ficar guardado. */
export const EXPORT_CATALOG_STALE_TIME = 30 * 60_000

export function exportCatalogKey(dataset: ExportDataset) {
  return ['admin', 'export-catalog', dataset] as const
}

export async function fetchExportCatalog(dataset: ExportDataset): Promise<ExportCatalog | null> {
  try {
    const res = await apiFetch(`/admin/export/${dataset}/catalog`)
    return lerCatalogo(await res.json())
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) return null
    throw e
  }
}

export function useExportCatalog(dataset: ExportDataset, opts: { enabled?: boolean } = {}) {
  return useQuery<ExportCatalog | null>({
    queryKey: exportCatalogKey(dataset),
    queryFn: () => fetchExportCatalog(dataset),
    staleTime: EXPORT_CATALOG_STALE_TIME,
    gcTime: 2 * EXPORT_CATALOG_STALE_TIME,
    enabled: opts.enabled ?? true,
  })
}
