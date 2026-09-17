import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Carregando uma página (pendingComponent padrão do router): aparece quando o
 * código ou os dados da rota demoram (internet lenta) em vez de tela em branco.
 */
export function PageLoader() {
  const { t } = useTranslation()
  return (
    <div role="status" className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}
