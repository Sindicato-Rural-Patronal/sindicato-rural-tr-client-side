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
import { cn } from '@/lib/utils'

// Computador: item de 36 px; o ativo fica em texto principal com a linha verde embaixo.
const linkBase =
  'relative inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full'
const linkClass = {
  active: `${linkBase} text-foreground after:bg-primary`,
  idle: `${linkBase} text-muted-foreground hover:bg-accent hover:text-foreground after:bg-transparent`,
}
// Celular: cada item com pelo menos 44px de altura (alvo de toque confortável).
const mobileClass = {
  active: 'flex min-h-11 items-center rounded-lg bg-muted px-4 py-2 text-base font-medium text-foreground',
  idle: 'flex min-h-11 items-center rounded-lg px-4 py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
}

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const pathname = location.pathname
  const { t } = useTranslation()
  const { data: convenios } = useConvenioMenu()

  // Os convênios ficam num item só ("Convênios"): antes cada um era um item do
  // menu, e nomes longos ("TIM S.A (TIM CELULAR…") eram cortados.
  const before = [
    { href: '/', label: t('nav.home') },
    { href: '/cursos', label: t('nav.courses') },
    { href: '/eventos', label: t('nav.events') },
    { href: '/noticias', label: t('nav.news') },
  ]
  const after = [
    { href: '/sobre', label: t('nav.about') },
    { href: '/contato', label: t('nav.contact') },
  ]
  const convenioLinks = (convenios ?? []).map(c => ({ href: `/convenios/${c.slug}`, label: c.name }))

  const isActive = (href: string) => href === '/' ? pathname === href : pathname.startsWith(href)
  const conveniosActive = isActive('/convenios')

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Só a assinatura: a imagem já traz "Sindicato Rural Terra Roxa Paraná".
            Ela tem texto verde-escuro em fundo transparente: no tema escuro vira
            silhueta clara, senão some. */}
        <Link to="/" className="flex shrink-0 items-center rounded-md" aria-label="Sindicato Rural de Terra Roxa – início">
          <img
            src="/logo-icon.png"
            alt="Sindicato Rural de Terra Roxa – Paraná"
            width={130}
            height={48}
            className="h-10 w-auto object-contain sm:h-12 dark:brightness-0 dark:invert"
          />
        </Link>

        {/* Computador */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Menu principal">
          {before.map(link => (
            <Link key={link.href} to={link.href} className={isActive(link.href) ? linkClass.active : linkClass.idle}>
              {link.label}
            </Link>
          ))}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className={cn(conveniosActive ? linkClass.active : linkClass.idle, 'gap-1 outline-none data-[state=open]:bg-accent data-[state=open]:text-foreground')}>
              {t('nav.convenios')}
              <ChevronDown className="size-4 text-faint-foreground" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuItem asChild>
                <Link to="/convenios">{t('nav.allConvenios')}</Link>
              </DropdownMenuItem>
              {convenioLinks.length > 0 && <DropdownMenuSeparator />}
              {convenioLinks.map(c => (
                <DropdownMenuItem key={c.href} asChild>
                  <Link to={c.href} className="min-w-0">
                    <span className="truncate">{c.label}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {after.map(link => (
            <Link key={link.href} to={link.href} className={isActive(link.href) ? linkClass.active : linkClass.idle}>
              {link.label}
            </Link>
          ))}
          <div className="ml-2 border-l border-border pl-2">
            <ThemeToggle />
          </div>
        </nav>

        {/* Celular: tema + botão do menu */}
        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle className="size-11" />
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Menu do celular */}
      {menuOpen && (
        <nav className="flex max-h-[calc(100dvh-4rem)] flex-col gap-1 overflow-y-auto border-t border-border bg-background px-4 py-3 lg:hidden" aria-label="Menu principal">
          {before.map(link => (
            <Link key={link.href} to={link.href} onClick={() => setMenuOpen(false)} className={isActive(link.href) ? mobileClass.active : mobileClass.idle}>
              {link.label}
            </Link>
          ))}
          <Link
            to="/convenios"
            onClick={() => setMenuOpen(false)}
            className={pathname === '/convenios' || pathname === '/convenios/' ? mobileClass.active : mobileClass.idle}
          >
            {t('nav.convenios')}
          </Link>
          {convenioLinks.map(c => (
            <Link
              key={c.href}
              to={c.href}
              onClick={() => setMenuOpen(false)}
              className={cn(isActive(c.href) ? mobileClass.active : mobileClass.idle, 'ml-4 min-w-0 text-sm')}
            >
              <span className="truncate">{c.label}</span>
            </Link>
          ))}
          {after.map(link => (
            <Link key={link.href} to={link.href} onClick={() => setMenuOpen(false)} className={isActive(link.href) ? mobileClass.active : mobileClass.idle}>
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
