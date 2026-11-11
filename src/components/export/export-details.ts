// "O que foi exportado" na Auditoria (decisão 006, item 7.2): a linha EXPORT
// ganha `details` com o formato, o modelo, os campos (rótulos), o escopo, os
// filtros e quantas linhas saíram. Aqui só se lê esse JSON com cuidado (é um
// campo livre do banco): linha antiga ou de outra ação não tem nada disso.

export type DetalhesDaExportacao = {
  formato: string | null
  modelo: string | null
  campos: string[]
  escopo: string | null
  filtros: { nome: string; valor: string }[]
  linhas: number | null
}

const FORMATOS: Record<string, string> = {
  csv: 'Planilha CSV',
  pdf: 'PDF',
  xlsx: 'Excel (.xlsx)',
}

const ESCOPOS: Record<string, string> = {
  selecionados: 'Selecionados',
  selected: 'Selecionados',
  ids: 'Selecionados',
  filtros: 'Todos com os filtros',
  filtered: 'Todos com os filtros',
  todos: 'Todos',
  all: 'Todos',
}

function texto(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return null
}

function valorDoFiltro(v: unknown): string | null {
  if (v === true) return 'sim'
  if (v === false) return 'não'
  if (Array.isArray(v)) return v.map(texto).filter(Boolean).join(', ') || null
  return texto(v)
}

/** Lê o `details` da linha; `null` quando não há nada de exportação nele. */
export function detalhesDaExportacao(details: unknown): DetalhesDaExportacao | null {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null
  const d = details as Record<string, unknown>

  const campos = Array.isArray(d.campos) ? d.campos.map(texto).filter((c): c is string => !!c) : []

  const filtros: { nome: string; valor: string }[] = []
  if (Array.isArray(d.filtros)) {
    for (const f of d.filtros) {
      if (typeof f === 'string' && f.trim()) { filtros.push({ nome: f.trim(), valor: '' }); continue }
      if (!f || typeof f !== 'object') continue
      const filtro = f as Record<string, unknown>
      const nome = texto(filtro.nome)
      if (!nome) continue
      filtros.push({ nome, valor: valorDoFiltro(filtro.valor) ?? '' })
    }
  }

  const formatoCru = texto(d.formato)
  const escopoCru = texto(d.escopo)
  const linhas = typeof d.linhas === 'number' && Number.isFinite(d.linhas) ? d.linhas : null
  const resultado: DetalhesDaExportacao = {
    formato: formatoCru ? FORMATOS[formatoCru.toLowerCase()] ?? formatoCru : null,
    modelo: texto(d.modelo),
    campos,
    escopo: escopoCru ? ESCOPOS[escopoCru.toLowerCase()] ?? escopoCru : null,
    filtros,
    linhas,
  }

  const temAlgo = resultado.formato || resultado.modelo || campos.length || resultado.escopo || filtros.length || linhas != null
  return temAlgo ? resultado : null
}
