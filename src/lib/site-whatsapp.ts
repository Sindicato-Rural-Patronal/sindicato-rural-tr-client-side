import { safeUrl } from '@/utils/safe-url'
import { whatsappUrl } from '@/lib/contact-links'

/**
 * Link do WhatsApp do sindicato (Configurações do site › Redes sociais). O campo
 * pode ter um link pronto ("https://wa.me/5544…", "wa.me/…") ou, em cadastros
 * antigos, só o número ("(44) 99999-0000") — que vira https://wa.me/55….
 * `null` quando vazio ou quando não dá para montar um link que funcione.
 */
export function siteWhatsappHref(value: string | null | undefined): string | null {
  const v = (value ?? '').trim()
  if (!v) return null
  // Só dígitos e pontuação de telefone → número.
  if (/^[\d\s()+.-]+$/.test(v)) return whatsappUrl(v)
  const url = safeUrl(v)
  return url === '#' ? null : url
}

/**
 * Página de detalhe do curso (/cursos/:id): lá, no celular, a barra fixa de
 * "Inscrever-se" ocupa o rodapé da tela e o botão flutuante sai do caminho.
 */
export function isCourseDetailPath(pathname: string): boolean {
  return /^\/cursos\/[^/]+\/?$/.test(pathname)
}
