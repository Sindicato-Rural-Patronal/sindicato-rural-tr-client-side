import { Link, useLocation, useMatches } from '@tanstack/react-router'
import { MapPinOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { PublicHeader } from '@/components/PublicHeader'
import { PublicFooter } from '@/components/public-footer'
import { WhatsAppFloatingButton } from '@/components/WhatsAppFloatingButton'
import { useSeo } from '@/hooks/useSeo'

function NotFoundContent({ admin }: { admin: boolean }) {
  const { t } = useTranslation()
  useSeo({ title: t('notFoundPage.title') })

  return (
    <div className="flex flex-col items-center px-4 py-16 text-center md:py-24">
      <MapPinOff className="size-14 text-muted-foreground/50" aria-hidden />
      <p className="mt-4 text-sm font-semibold text-muted-foreground">404</p>
      <h1 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">{t('notFoundPage.title')}</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{t('notFoundPage.description')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {admin ? (
          <>
            <Button asChild className="h-11 px-5">
              <Link to="/admin">{t('notFoundPage.adminPanel')}</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-5">
              <Link to="/">{t('notFoundPage.site')}</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild className="h-11 px-5">
              <Link to="/">{t('notFoundPage.home')}</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-5">
              <Link to="/cursos">{t('notFoundPage.courses')}</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-5">
              <Link to="/contato">{t('notFoundPage.contact')}</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Endereço que não existe (notFoundComponent padrão do router). O router mostra
 * dentro do layout mais próximo que casou: em /cursos/x/y já vem com o cabeçalho
 * do site ou com a barra do painel; em /qualquer-coisa vem sozinho, então aqui
 * põe o cabeçalho e o rodapé do site (ou só o conteúdo, em /admin/…).
 */
export function NotFoundPage() {
  const pathname = useLocation({ select: l => l.pathname })
  const routeIds = useMatches({ select: ms => ms.map(m => m.routeId as string) })
  const inPublicLayout = routeIds.includes('/_public')
  const inAdminLayout = routeIds.includes('/_admin')
  const admin = inAdminLayout || pathname === '/admin' || pathname.startsWith('/admin/')

  if (inPublicLayout || inAdminLayout) return <NotFoundContent admin={admin} />

  if (admin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <NotFoundContent admin />
      </main>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <NotFoundContent admin={false} />
      </main>
      <PublicFooter />
      <WhatsAppFloatingButton />
    </div>
  )
}
