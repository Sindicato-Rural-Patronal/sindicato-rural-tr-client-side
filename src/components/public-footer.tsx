import { Link } from '@tanstack/react-router'
import { Clock, Phone, Mail, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FaFacebook, FaInstagram, FaWhatsapp } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { useOrgInfo, usePublicSiteSettings } from '@/hooks/useSiteSettings'
import { orgAddressLines, phoneDigits } from '@/lib/org-contact'
import { safeUrl } from '@/utils/safe-url'
import { siteWhatsappHref } from '@/lib/site-whatsapp'

// Quatro colunas sempre preenchidas (marca + redes, links, contato, chamada),
// distribuídas na largura toda; as redes ficam sob a marca, então a grade não
// fica com buraco quando não há rede social cadastrada.
export function PublicFooter() {
  const { t } = useTranslation()
  const { data: social } = usePublicSiteSettings()
  const org = useOrgInfo()
  const address = orgAddressLines(org)
  const socials = [
    { label: 'Facebook', href: social?.facebook?.trim() ? safeUrl(social.facebook) : null, Icon: FaFacebook },
    { label: 'Instagram', href: social?.instagram?.trim() ? safeUrl(social.instagram) : null, Icon: FaInstagram },
    // Número solto (cadastro antigo) vira https://wa.me/55… em vez de "https://44999…".
    { label: 'WhatsApp', href: siteWhatsappHref(social?.whatsapp), Icon: FaWhatsapp },
  ].flatMap(s => (s.href && s.href !== '#' ? [{ ...s, href: s.href }] : []))

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
            {socials.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-foreground/70">{t('footer.socialMedia')}</h4>
                <div className="flex gap-3">
                  {socials.map(s => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex size-11 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
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
            <nav className="grid grid-cols-2 gap-x-6 text-sm text-brand-foreground/90 sm:grid-cols-1 sm:gap-y-2">
              {links.map(l => (
                <Link key={l.to} to={l.to} className="flex min-h-11 w-fit items-center transition-colors hover:text-white sm:min-h-0">{l.label}</Link>
              ))}
            </nav>
          </div>

          {/* Contato */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">{t('footer.contact')}</h4>
            <div className="space-y-3 text-sm text-brand-foreground/90">
              {org.phone && (
                <a href={`tel:${phoneDigits(org.phone)}`} className="flex items-center gap-2 transition-colors hover:text-white">
                  <Phone className="size-4 shrink-0" />
                  {org.phone}
                </a>
              )}
              {org.email && (
                <a href={`mailto:${org.email}`} className="flex items-center gap-2 break-all transition-colors hover:text-white">
                  <Mail className="size-4 shrink-0" />
                  {org.email}
                </a>
              )}
              {address.length > 0 && (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {address.map((line, i) => <span key={i} className="block">{line}</span>)}
                  </span>
                </p>
              )}
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
            <Button asChild className="h-11 w-full bg-white text-sm font-semibold text-brand hover:bg-white/90">
              <Link to="/contato">{t('footer.contactButton')}</Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/20 pt-6 text-xs text-brand-foreground/60">
          <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
          {/* Acesso da equipe: link discreto, sem competir com o "Entrar em contato".
              A margem negativa compensa o px-2, alinhando o texto à borda. */}
          <Link to="/login" className="-mx-2 inline-flex min-h-11 items-center px-2 underline-offset-4 transition-colors hover:text-white hover:underline sm:min-h-0">
            {t('footer.adminPanel')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
