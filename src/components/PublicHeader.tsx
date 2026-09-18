import { Link, useLocation } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useConvenioMenu } from '@/hooks/useConvenios'

// Desktop: nome longo (ex.: convênio) é cortado com "…" e aparece inteiro no title.
const linkClass = {
  active: 'max-w-40 truncate px-3 py-1.5 text-sm font-semibold text-primary border-b-2 border-primary',
  idle: 'max-w-40 truncate px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors',
}
// Celular: cada item com pelo menos 44px de altura (alvo de toque confortável).
const mobileClass = {
  active: 'flex min-h-11 items-center px-4 py-2 text-base font-semibold bg-primary/10 text-primary rounded-lg',
  idle: 'flex min-h-11 items-center px-4 py-2 text-base font-medium hover:bg-muted text-foreground rounded-lg transition-colors',
}

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const pathname = location.pathname
  const { t } = useTranslation()
  const { data: convenios } = useConvenioMenu()

  // Cada convênio ativo é um item próprio do menu, entre Notícias e Sobre
  // (são poucos; não precisa de submenu).
  const links = [
    { href: '/', label: t('nav.home') },
    { href: '/cursos', label: t('nav.courses') },
    { href: '/eventos', label: t('nav.events') },
    { href: '/noticias', label: t('nav.news') },
    ...(convenios ?? []).map(c => ({ href: `/convenios/${c.slug}`, label: c.name })),
    { href: '/sobre', label: t('nav.about') },
    { href: '/contato', label: t('nav.contact') },
  ]

  const isActive = (href: string) => href === '/' ? pathname === href : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/logo-full.png"
            alt="Sindicato Rural de Terra Roxa"
            width={40}
            height={40}
            className="object-contain h-10 w-auto"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {links.map(link => (
            <Link key={link.href} to={link.href} title={link.label} className={isActive(link.href) ? linkClass.active : linkClass.idle}>
              {link.label}
            </Link>
          ))}
          <div className="ml-1 border-l border-border pl-1">
            <ThemeToggle />
          </div>
        </nav>

        {/* Mobile: theme + menu button */}
        <div className="flex lg:hidden items-center gap-1">
          <ThemeToggle className="size-11" />
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <nav className="lg:hidden border-t bg-background py-3 px-4 flex flex-col gap-1">
          {links.map(link => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMenuOpen(false)}
              className={isActive(link.href) ? mobileClass.active : mobileClass.idle}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
