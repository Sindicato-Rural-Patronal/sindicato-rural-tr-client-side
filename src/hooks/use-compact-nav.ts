import * as React from "react"

// Abaixo disto o menu lateral do painel vira gaveta (como no celular). Com ele
// fixo, o menu aberto come 256px e sobravam só ~500px para o conteúdo em 768px.
// `use-mobile.ts` (768) continua valendo para o resto do sistema.
const COMPACT_NAV_BREAKPOINT = 1024

let mql: MediaQueryList | undefined
function getMql() {
  mql ??= window.matchMedia(`(max-width: ${COMPACT_NAV_BREAKPOINT - 1}px)`)
  return mql
}

function subscribe(onChange: () => void) {
  const query = getMql()
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

export function useIsCompactNav(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => getMql().matches,
    () => false
  )
}
