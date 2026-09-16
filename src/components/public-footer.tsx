import { Link } from '@tanstack/react-router'
import { Phone, Mail, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FaFacebook, FaInstagram, FaWhatsapp } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ORG_CONTACT } from '@/lib/org-contact'
import { usePublicSocial } from '@/hooks/useSiteSettings'
import { safeUrl } from '@/utils/safe-url'

export function PublicFooter() {
  const { t } = useTranslation()
  const { data: social } = usePublicSocial()
  const socials = [
    { label: 'Facebook', url: social?.facebook, Icon: FaFacebook },
    { label: 'Instagram', url: social?.instagram, Icon: FaInstagram },
    { label: 'WhatsApp', url: social?.whatsapp, Icon: FaWhatsapp },
  ].filter(s => !!s.url && s.url.trim() !== '')

  return (
    <footer className="border-t bg-brand text-brand-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Logo + contact */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white p-1">
                <img
                  src="/logo-full.png"
                  alt="Logo Sindicato Rural de Terra Roxa"
                  width={52}
                  height={52}
                  className="object-contain"
                />
              </div>
            </div>
            <div className="space-y-2 text-sm text-brand-foreground/90">
              <p className="flex items-center gap-2">
                <Phone className="size-4 shrink-0" />
                {ORG_CONTACT.phone}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="size-4 shrink-0" />
                {ORG_CONTACT.email}
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                <span>
                  {ORG_CONTACT.street}
                  <br />
                  {ORG_CONTACT.district} - {ORG_CONTACT.zip}
                  <br />
                  {ORG_CONTACT.city} - {ORG_CONTACT.state}
                </span>
              </p>
            </div>
          </div>

          {/* Social media */}
          {socials.length > 0 && (
            <div>
              <h4 className="mb-4 text-sm font-semibold">{t('footer.socialMedia')}</h4>
              <div className="flex gap-3">
                {socials.map(s => (
                  <a
                    key={s.label}
                    href={safeUrl(s.url || '')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex size-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                    aria-label={s.label}
                  >
                    <s.Icon className="size-5" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">{t('footer.quickLinks')}</h4>
            <nav className="flex flex-col gap-2 text-sm text-brand-foreground/90">
              <Link to="/" className="transition-colors hover:text-white">{t('nav.home')}</Link>
              <Link to="/cursos" className="transition-colors hover:text-white">{t('nav.courses')}</Link>
              <Link to="/convenios" className="transition-colors hover:text-white">{t('nav.convenios')}</Link>
              <Link to="/sobre" className="transition-colors hover:text-white">{t('nav.about')}</Link>
              <Link to="/contato" className="transition-colors hover:text-white">{t('nav.contact')}</Link>
            </nav>
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{t('footer.contactUs')}</h4>
            <p className="text-xs text-brand-foreground/80">{t('footer.contactCta')}</p>
            <Link to="/contato">
              <Button className="w-full bg-white text-sm font-semibold text-brand hover:bg-white/90">
                {t('footer.contactButton')}
              </Button>
            </Link>
            <Link to="/login">
              <Button
                variant="outline"
                className="mt-1 w-full border border-white/60 bg-transparent text-sm text-white transition-colors hover:bg-white hover:text-brand"
              >
                {t('footer.adminPanel')}
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-10 border-t border-white/20 pt-6 flex items-center justify-between text-xs text-brand-foreground/50">
          <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
          <LanguageToggle variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" />
        </div>
      </div>
    </footer>
  )
}
