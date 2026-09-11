import { useEffect } from 'react'

// Avisa o navegador antes de sair/atualizar/fechar a aba com alterações não
// salvas. (Navegação interna via <Link> não dispara isto — guarde o clique.)
export function useUnsavedGuard(active: boolean) {
  useEffect(() => {
    if (!active) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [active])
}

// Confirmação para navegação interna (voltar/cancelar) quando há alterações.
export function confirmLeaveIfDirty(dirty: boolean, e: { preventDefault: () => void }) {
  if (dirty && !window.confirm('Você tem alterações não salvas. Sair mesmo assim?')) {
    e.preventDefault()
  }
}
