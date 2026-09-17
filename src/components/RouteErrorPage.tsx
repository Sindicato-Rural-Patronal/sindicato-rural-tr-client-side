import { useEffect } from 'react'
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/**
 * Tela de erro padrão das rotas (errorComponent do router), no lugar do
 * "Something went wrong!" em inglês. "Tentar de novo" recarrega os dados da
 * rota; "Ir para o início" recarrega a página inteira (se o erro deixou o app
 * em estado ruim, sai dele).
 */
export function RouteErrorPage({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    console.error(error)
  }, [error])

  function retry() {
    reset()
    void router.invalidate()
  }

  return (
    <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <AlertTriangle className="size-12 text-amber-500" aria-hidden />
      <h1 className="mt-4 text-xl font-bold text-foreground md:text-2xl">{t('errorPage.title')}</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{t('common.connectionHint')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button className="h-11 gap-2 px-5" onClick={retry}>
          <RefreshCw className="size-4" aria-hidden />
          {t('common.retry')}
        </Button>
        <Button asChild variant="outline" className="h-11 px-5">
          <a href="/">{t('errorPage.home')}</a>
        </Button>
      </div>
    </div>
  )
}
