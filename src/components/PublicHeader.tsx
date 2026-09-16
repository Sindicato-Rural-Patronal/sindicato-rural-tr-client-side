import { Link, useLocation } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useConvenioMenu } from '@/hooks/useConvenios'

const linkClass = {
  active: 'px-3 py-1.5 text-sm font-semibold text-primary border-b-2 border-primary',
  idle: 'px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors',
}
const mobileClass = {
  active: 'px-4 py-2 text-sm font-semibold bg-primary/10 text-primary rounded-lg',
  idle: 'px-4 py-2 text-sm font-medium hover:bg-muted text-foreground rounded-lg transition-colors',
}

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const pathname = location.pathname
  const { t } = useTranslation()
  const { data: convenios, isLoading: conveniosLoading, isError: conveniosError } = useConvenioMenu()

  // "Convênios" entra entre Notícias e Sobre. Some quando não há convênio ativo
  // (ou a API falhou); enquanto carrega fica visível pra não pular o menu.
  const showConvenios = !conveniosError && (conveniosLoading || (convenios?.length ?? 0) > 0)

  const linksBefore = [
    { href: '/', label: t('nav.home') },
    { href: '/cursos', label: t('nav.courses') },
    { href: '/noticias', label: t('nav.news') },
  ]
  const linksAfter = [
    { href: '/sobre', label: t('nav.about') },
    { href: '/contato', label: t('nav.contact') },
  ]

  const isActive = (href: string) => href === '/' ? pathname === href : pathname.startsWith(href)
  const conveniosActive = pathname.startsWith('/convenios')

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
          {linksBefore.map(link => (
            <Link key={link.href} to={link.href} className={isActive(link.href) ? linkClass.active : linkClass.idle}>
              {link.label}
            </Link>
          ))}

          {showConvenios && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                className={`${conveniosActive ? linkClass.active : linkClass.idle} inline-flex items-center gap-1 outline-none data-[state=open]:text-foreground`}
              >
                {t('nav.convenios')}
                <ChevronDown className="size-3.5 transition-transform in-data-[state=open]:rotate-180" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {conveniosLoading && (
                  <DropdownMenuItem disabled>{t('nav.loading')}</DropdownMenuItem>
                )}
                {convenios?.map(c => (
                  <DropdownMenuItem key={c.id} asChild>
                    <Link
                      to="/convenios/$slug"
                      params={{ slug: c.slug }}
                      className={pathname === `/convenios/${c.slug}` ? 'font-semibold text-primary' : ''}
                    >
                      {c.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/convenios">{t('nav.allConvenios')}</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {linksAfter.map(link => (
            <Link key={link.href} to={link.href} className={isActive(link.href) ? linkClass.active : linkClass.idle}>
              {link.label}
            </Link>
          ))}
          <div className="ml-1 border-l border-border pl-1">
            <ThemeToggle />
          </div>
        </nav>

        {/* Mobile: theme + menu button */}
        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
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
          {linksBefore.map(link => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMenuOpen(false)}
              className={isActive(link.href) ? mobileClass.active : mobileClass.idle}
            >
              {link.label}
            </Link>
          ))}

          {showConvenios && (
            <div className="flex flex-col gap-1">
              <Link
                to="/convenios"
                onClick={() => setMenuOpen(false)}
                className={pathname === '/convenios' ? mobileClass.active : mobileClass.idle}
              >
                {t('nav.convenios')}
              </Link>
              {convenios?.map(c => (
                <Link
                  key={c.id}
                  to="/convenios/$slug"
                  params={{ slug: c.slug }}
                  onClick={() => setMenuOpen(false)}
                  className={`ml-4 ${pathname === `/convenios/${c.slug}` ? mobileClass.active : mobileClass.idle}`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}

          {linksAfter.map(link => (
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
