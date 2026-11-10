import { Link, useLocation } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '@/components/ThemeToggle'

// Computador: item de 36 px; o ativo fica em texto principal com a linha verde
// embaixo, encostada na borda do cabeçalho.
const linkBase =
  'relative inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:-bottom-3.5 after:h-0.5 after:rounded-full'
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

  // Os convênios ficam num item só, "Convênios", que leva a /convenios (a lista
  // com todos). Antes cada convênio era um item do menu, e nomes longos
  // ("TIM S.A (TIM CELULAR…") eram cortados. Link direto, sem submenu: o
  // usuário já tinha pedido o menu sem submenu (docs/HISTORICO.md, Convênios).
  const links = [
    { href: '/', label: t('nav.home') },
    { href: '/cursos', label: t('nav.courses') },
    { href: '/eventos', label: t('nav.events') },
    { href: '/noticias', label: t('nav.news') },
    { href: '/convenios', label: t('nav.convenios') },
    { href: '/sobre', label: t('nav.about') },
    { href: '/contato', label: t('nav.contact') },
  ]

  const isActive = (href: string) => href === '/' ? pathname === href : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Só a assinatura: a imagem já traz "Sindicato Rural Terra Roxa Paraná".
            Ela tem texto verde-escuro em fundo transparente: no tema escuro vira
            silhueta clara, senão some. */}
        <Link to="/" className="flex shrink-0 items-center rounded-md">
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
          {links.map(link => (
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
