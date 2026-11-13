import { useLocation } from '@tanstack/react-router'
import { FaWhatsapp } from 'react-icons/fa'
import { usePublicSiteSettings } from '@/hooks/useSiteSettings'
import { isCourseDetailPath, siteWhatsappHref } from '@/lib/site-whatsapp'
import { cn } from '@/lib/utils'

/**
 * Botão redondo do WhatsApp no canto inferior direito das páginas públicas.
 * Só aparece quando Configurações do site › Redes sociais tem o WhatsApp. No
 * detalhe do curso some abaixo de lg (lá fica a barra fixa "Inscrever-se").
 * 48 px, no verde do Sindicato (o único destaque do site), sombra baixa e sem
 * crescer no hover: o hover só escurece o fundo. A borda na cor do papel separa
 * o botão do rodapé verde, onde ele para no fim da página.
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
        'fixed z-40 flex size-12 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-float transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isCourseDetailPath(pathname) && 'max-lg:hidden',
      )}
      style={{
        // Pelo menos 16px da borda e fora da área do gesto/entalhe do celular (safe area).
        right: 'max(1rem, calc(env(safe-area-inset-right) + 0.5rem))',
        bottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))',
      }}
    >
      <FaWhatsapp className="size-6" aria-hidden />
    </a>
  )
}
