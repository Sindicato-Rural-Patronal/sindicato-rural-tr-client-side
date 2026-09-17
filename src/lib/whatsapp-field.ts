import { brPhoneNational } from '@/lib/contact-links'
import { maskPhone } from '@/utils/masks'

// Campo "WhatsApp" das Configurações do site: a equipe digita o número e o site
// guarda o link https://wa.me/55<DDD+número>. Link colado (wa.me ou
// api.whatsapp.com) também serve.

const PHONE_LIKE = /^[\d\s()+.-]+$/

/** Telefone nacional (DDD + número) de um link do WhatsApp com só o número; senão null. */
function phoneFromWhatsappLink(value: string): string | null {
  let url: URL
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`)
  } catch {
    return null
  }
  // Link com mensagem pronta continua como link.
  if (url.searchParams.get('text')) return null
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  let digits: string
  if (host === 'wa.me') {
    const segments = url.pathname.split('/').filter(Boolean)
    if (segments.length !== 1) return null
    digits = segments[0]
  } else if (host === 'api.whatsapp.com' || host === 'web.whatsapp.com') {
    digits = url.searchParams.get('phone') ?? ''
  } else {
    return null
  }
  digits = digits.replace(/^\+/, '')
  // Só número do Brasil vira telefone; outro país fica como link.
  return /^55\d{10,11}$/.test(digits) ? digits.slice(2) : null
}

/** Digitação no campo: número ganha a máscara (tirando o +55); link fica como veio. */
export function maskWhatsappInput(raw: string): string {
  if (!raw.trim() || !PHONE_LIKE.test(raw)) return raw
  const digits = raw.replace(/\D/g, '')
  return maskPhone(digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits)
}

/** Valor salvo → texto do campo: "(44) 99999-0000" quando é só o número; senão o link. */
export function whatsappFieldFromStored(stored: string | null | undefined): string {
  const v = (stored ?? '').trim()
  if (!v) return ''
  const national = PHONE_LIKE.test(v) ? brPhoneNational(v) : phoneFromWhatsappLink(v)
  return national ? maskPhone(national) : v
}

/** Texto do campo → valor a salvar (link) ou mensagem de erro. Vazio tira do site. */
export function whatsappStoredFromField(text: string): { value: string } | { error: string } {
  const v = text.trim()
  if (!v) return { value: '' }
  if (PHONE_LIKE.test(v)) {
    const national = brPhoneNational(v)
    return national
      ? { value: `https://wa.me/55${national}` }
      : { error: 'Número do WhatsApp incompleto: digite o DDD e o número.' }
  }
  const national = phoneFromWhatsappLink(v)
  if (national) return { value: `https://wa.me/55${national}` }
  if (/^https?:\/\/\S+$/i.test(v)) return { value: v }
  if (/^(www\.)?(wa\.me|api\.whatsapp\.com)\/\S*$/i.test(v)) return { value: `https://${v}` }
  return { error: 'Digite o número com DDD ou cole o link do WhatsApp (https://wa.me/...).' }
}
