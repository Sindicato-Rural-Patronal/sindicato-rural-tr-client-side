import { Link, useLocation } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const pathname = location.pathname
  const { t } = useTranslation()

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/cursos', label: t('nav.courses') },
    { href: '/noticias', label: t('nav.news') },
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
            className="object-contain h-10 w-auto"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                to={link.href}
                className={
                  active
                    ? 'px-3 py-1.5 text-sm font-semibold text-primary border-b-2 border-primary'
                    : 'px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
                }
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Mobile: menu button */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <nav className="md:hidden border-t bg-background py-3 px-4 flex flex-col gap-1">
          {navLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMenuOpen(false)}
                className={
                  active
                    ? 'px-4 py-2 text-sm font-semibold bg-primary/10 text-primary rounded-lg'
                    : 'px-4 py-2 text-sm font-medium hover:bg-muted text-foreground rounded-lg transition-colors'
                }
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}
