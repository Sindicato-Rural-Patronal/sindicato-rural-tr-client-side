import * as React from "react"

const MOBILE_BREAKPOINT = 768

let mql: MediaQueryList | undefined
function getMql() {
  mql ??= window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  return mql
}

function subscribe(onChange: () => void) {
  const query = getMql()
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

export function useIsMobile(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => getMql().matches,
    () => false
  )
}
