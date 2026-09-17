import { Link } from '@tanstack/react-router'
import { Clock, Phone, Mail, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FaFacebook, FaInstagram, FaWhatsapp } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '@/components/LanguageToggle'
import { useOrgInfo, usePublicSiteSettings } from '@/hooks/useSiteSettings'
import { phoneDigits } from '@/lib/org-contact'
import { safeUrl } from '@/utils/safe-url'

// Quatro colunas sempre preenchidas (marca + redes, links, contato, chamada),
// distribuídas na largura toda; as redes ficam sob a marca, então a grade não
// fica com buraco quando não há rede social cadastrada.
export function PublicFooter() {
  const { t } = useTranslation()
  const { data: social } = usePublicSiteSettings()
  const org = useOrgInfo()
  const socials = [
    { label: 'Facebook', url: social?.facebook, Icon: FaFacebook },
    { label: 'Instagram', url: social?.instagram, Icon: FaInstagram },
    { label: 'WhatsApp', url: social?.whatsapp, Icon: FaWhatsapp },
  ].filter(s => !!s.url && s.url.trim() !== '')

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/cursos', label: t('nav.courses') },
    { to: '/noticias', label: t('nav.news') },
    { to: '/convenios', label: t('nav.convenios') },
    { to: '/cotacoes', label: t('nav.quotes') },
    { to: '/sobre', label: t('nav.about') },
    { to: '/contato', label: t('nav.contact') },
  ]

  return (
    <footer className="border-t bg-brand text-brand-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1.2fr_1fr] lg:gap-12">
          {/* Marca + redes */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white p-1">
                <img src="/logo-full.png" alt="" width={52} height={52} className="object-contain" />
              </div>
              <p className="font-semibold leading-tight">Sindicato Rural<br />de Terra Roxa</p>
            </div>
            <p className="max-w-xs text-sm text-brand-foreground/80">{t('footer.tagline')}</p>
            {socials.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-foreground/70">{t('footer.socialMedia')}</h4>
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
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">{t('footer.quickLinks')}</h4>
            <nav className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-brand-foreground/90 sm:grid-cols-1">
              {links.map(l => (
                <Link key={l.to} to={l.to} className="w-fit transition-colors hover:text-white">{l.label}</Link>
              ))}
            </nav>
          </div>

          {/* Contato */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">{t('footer.contact')}</h4>
            <div className="space-y-3 text-sm text-brand-foreground/90">
              <a href={`tel:${phoneDigits(org.phone)}`} className="flex items-center gap-2 transition-colors hover:text-white">
                <Phone className="size-4 shrink-0" />
                {org.phone}
              </a>
              <a href={`mailto:${org.email}`} className="flex items-center gap-2 break-all transition-colors hover:text-white">
                <Mail className="size-4 shrink-0" />
                {org.email}
              </a>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                <span>
                  {org.street}, {org.district}
                  <br />
                  {org.city} - {org.state}, {org.zip}
                </span>
              </p>
              {org.hours.length > 0 && (
                <p className="flex items-start gap-2">
                  <Clock className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {org.hours.map(h => (
                      <span key={h.label} className="block">{h.label}{h.time && `: ${h.time}`}</span>
                    ))}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Chamada */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">{t('footer.contactUs')}</h4>
            <p className="text-sm text-brand-foreground/80">{t('footer.contactCta')}</p>
            <Button asChild className="w-full bg-white text-sm font-semibold text-brand hover:bg-white/90">
              <Link to="/contato">{t('footer.contactButton')}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full border border-white/60 bg-transparent text-sm text-white transition-colors hover:bg-white hover:text-brand"
            >
              <Link to="/login">{t('footer.adminPanel')}</Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-white/20 pt-6 text-xs text-brand-foreground/60">
          <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
          <LanguageToggle variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" />
        </div>
      </div>
    </footer>
  )
}
