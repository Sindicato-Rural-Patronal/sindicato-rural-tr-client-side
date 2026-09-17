import { useLocation } from '@tanstack/react-router'
import { FaWhatsapp } from 'react-icons/fa'
import { usePublicSiteSettings } from '@/hooks/useSiteSettings'
import { isCourseDetailPath, siteWhatsappHref } from '@/lib/site-whatsapp'
import { cn } from '@/lib/utils'

/**
 * Botão redondo do WhatsApp no canto inferior direito das páginas públicas.
 * Só aparece quando Configurações do site › Redes sociais tem o WhatsApp. No
 * detalhe do curso some abaixo de lg (lá fica a barra fixa "Inscrever-se").
 */
export function WhatsAppFloatingButton() {
  const { data } = usePublicSiteSettings()
  const pathname = useLocation({ select: l => l.pathname })
  const href = siteWhatsappHref(data?.whatsapp)
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      title="WhatsApp"
      className={cn(
        'fixed z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40',
        isCourseDetailPath(pathname) && 'max-lg:hidden',
      )}
      style={{
        // Pelo menos 16px da borda e fora da área do gesto/entalhe do celular (safe area).
        right: 'max(1rem, calc(env(safe-area-inset-right) + 0.5rem))',
        bottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))',
      }}
    >
      <FaWhatsapp className="size-8" aria-hidden />
    </a>
  )
}
