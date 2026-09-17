/**
 * Copia texto para a área de transferência. Usa a API do navegador e, se ela
 * não existir ou falhar (página sem HTTPS, navegador antigo), o jeito antigo
 * com um campo escondido. Retorna se deu certo.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // tenta o jeito antigo abaixo
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}
