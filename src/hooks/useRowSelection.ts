import { useCallback, useMemo, useState } from 'react'

// Seleção de linhas de uma lista paginada: guarda os ids (não as linhas), então
// a seleção continua ao trocar de página.
export function useRowSelection() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  /** Marca todos os ids da página; se já estavam todos marcados, desmarca. */
  const togglePage = useCallback((pageIds: string[]) => {
    setSelected(prev => {
      const next = new Set(prev)
      const all = pageIds.length > 0 && pageIds.every(id => next.has(id))
      for (const id of pageIds) {
        if (all) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }, [])

  const clear = useCallback(() => setSelected(new Set()), [])

  /** Tira ids da seleção (ex.: registros excluídos). */
  const remove = useCallback((...ids: string[]) => {
    setSelected(prev => {
      if (!ids.some(id => prev.has(id))) return prev
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next
    })
  }, [])

  return useMemo(() => ({
    ids: [...selected],
    count: selected.size,
    isSelected: (id: string) => selected.has(id),
    /** Estado do "marcar todos" da página. */
    pageState: (pageIds: string[]): 'all' | 'some' | 'none' => {
      const n = pageIds.filter(id => selected.has(id)).length
      return n === 0 ? 'none' : n === pageIds.length ? 'all' : 'some'
    },
    toggle,
    togglePage,
    clear,
    remove,
  }), [selected, toggle, togglePage, clear, remove])
}

export type RowSelection = ReturnType<typeof useRowSelection>
