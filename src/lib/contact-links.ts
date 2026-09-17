/**
 * Links de contato a partir do telefone salvo no cadastro, que vem em formatos
 * variados: "(44) 99999-0000", "+55 44 99999-0000", "044 3645-2199"…
 */

/**
 * Número nacional (DDD + número, 10 ou 11 dígitos) ou `null` se não der para
 * entender. Tira o que não é dígito, o 0 de discagem e o +55 do país.
 */
export function brPhoneNational(phone: string | null | undefined): string | null {
  let d = (phone ?? '').replace(/\D/g, '').replace(/^0+/, '')
  // 55 só é código do país quando sobra DDD + número; "(55) 99999-9999" é DDD 55.
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
  return d.length === 10 || d.length === 11 ? d : null
}

/** Conversa no WhatsApp (https://wa.me/55…) ou `null` se o telefone não servir. */
export function whatsappUrl(phone: string | null | undefined): string | null {
  const national = brPhoneNational(phone)
  return national ? `https://wa.me/55${national}` : null
}

/** Link "tel:" para ligar; `null` sem telefone. */
export function telHref(phone: string | null | undefined): string | null {
  const national = brPhoneNational(phone)
  if (national) return `tel:+55${national}`
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits ? `tel:${digits}` : null
}

/**
 * Lista para copiar (um por linha): sem vazios e sem repetidos. `sameAs` diz
 * quando dois valores são o mesmo (ex.: telefone só pelos dígitos).
 */
export function uniqueContactLines(
  values: (string | null | undefined)[],
  sameAs: (value: string) => string = v => v.toLowerCase(),
): string[] {
  const seen = new Set<string>()
  const lines: string[] = []
  for (const raw of values) {
    const value = raw?.trim()
    if (!value) continue
    const key = sameAs(value)
    if (!key || seen.has(key)) continue
    seen.add(key)
    lines.push(value)
  }
  return lines
}

/** Chave de comparação de telefone: o número nacional ou, sem ele, só os dígitos. */
export function phoneKey(phone: string): string {
  return brPhoneNational(phone) ?? phone.replace(/\D/g, '')
}
