// Deploy troca os hashes dos chunks; uma aba aberta pode pedir um chunk que
// não existe mais → import dinâmico falha (`vite:preloadError`). A saída é
// recarregar para pegar o index e os chunks novos.
//
// A guarda contra loop é um HORÁRIO, não um "já recarreguei": um flag que nunca
// se apaga deixava a aba sem recarga no segundo deploy ("Failed to fetch
// dynamically imported module"). Com o horário, a falha logo depois de uma
// recarga (offline, chunk que realmente não existe) não recarrega de novo, mas
// um deploy novo, minutos depois, recarrega.

const KEY = 'chunk-reload-at'

/** Intervalo mínimo entre duas recargas automáticas da mesma aba. */
export const CHUNK_RELOAD_COOLDOWN_MS = 60_000

/**
 * Decide se recarrega agora e, se sim, anota o horário. Sem sessionStorage
 * (modo restrito) NÃO recarrega: sem onde guardar o horário não há como impedir
 * o loop, e a tela de erro da rota já oferece "Tentar de novo".
 */
export function shouldReloadForNewChunks(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
  now: number = Date.now(),
): boolean {
  if (!storage) return false
  try {
    const last = Number(storage.getItem(KEY))
    if (Number.isFinite(last) && last > 0 && now >= last && now - last < CHUNK_RELOAD_COOLDOWN_MS) return false
    storage.setItem(KEY, String(now))
    return true
  } catch {
    return false
  }
}

export function reloadForNewChunks() {
  let storage: Storage | null = null
  try { storage = window.sessionStorage } catch { /* indisponível */ }
  if (shouldReloadForNewChunks(storage)) window.location.reload()
}
