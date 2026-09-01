import { Link } from '@tanstack/react-router'
import { Phone, Mail, MapPin, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FaFacebook, FaInstagram } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { LanguageToggle } from '@/components/LanguageToggle'

export function PublicFooter() {
  const { t } = useTranslation()

  return (
    <footer className="border-t bg-brand text-brand-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Logo + contact */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white p-1">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo_rodape2%201-grg6Gf7BKrfEuICS8lvz0t5GZ7sglX.png"
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
                (44) 3645-2199
              </p>
              <p className="flex items-center gap-2">
                <Mail className="size-4 shrink-0" />
                sindicato@ruraltr.com.br
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                <span>
                  Rua Jose Tondato, 80
                  <br />
                  Centro - 85990-000
                  <br />
                  Terra Roxa - PR
                </span>
              </p>
            </div>
          </div>

          {/* Social media */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">{t('footer.socialMedia')}</h4>
            <div className="flex gap-3">
              <a
                href="#"
                className="flex size-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                aria-label="Facebook"
              >
                <FaFacebook className="size-5" />
              </a>
              <a
                href="#"
                className="flex size-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                aria-label="Telegram"
              >
                <Send className="size-5" />
              </a>
              <a
                href="#"
                className="flex size-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                aria-label="Instagram"
              >
                <FaInstagram className="size-5" />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">{t('footer.quickLinks')}</h4>
            <nav className="flex flex-col gap-2 text-sm text-brand-foreground/90">
              <Link to="/" className="transition-colors hover:text-white">{t('nav.home')}</Link>
              <Link to="/cursos" className="transition-colors hover:text-white">{t('nav.courses')}</Link>
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
