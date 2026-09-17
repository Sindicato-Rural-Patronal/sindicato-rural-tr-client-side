import { RefreshCw, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  onRetry: () => void
  /** Já está tentando de novo: botão desabilitado e ícone girando. */
  retrying?: boolean
  /** Padrão: "Não foi possível carregar." */
  message?: string
  /** Mostra "Verifique sua conexão…" embaixo da mensagem. */
  hint?: boolean
  /** `inline` = uma linha só (faixas estreitas, ex.: cotações da home). */
  variant?: 'block' | 'inline'
  className?: string
}

/**
 * Falha ao carregar dados no site público. Nunca diz "não há nada" quando a
 * API falhou: avisa e oferece "Tentar de novo".
 */
export function LoadErrorRetry({ onRetry, retrying = false, message, hint = false, variant = 'block', className }: Props) {
  const { t } = useTranslation()
  const text = message ?? t('common.loadError')
  const button = (
    <Button type="button" variant="outline" className="h-11 gap-2" onClick={onRetry} disabled={retrying}>
      <RefreshCw className={cn('size-4', retrying && 'animate-spin')} aria-hidden />
      {t('common.retry')}
    </Button>
  )

  if (variant === 'inline') {
    return (
      <div role="alert" className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground', className)}>
        <span className="inline-flex items-center gap-2">
          <WifiOff className="size-4 shrink-0" aria-hidden />
          {text}
        </span>
        {button}
      </div>
    )
  }

  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      <WifiOff className="size-10 text-muted-foreground/50" aria-hidden />
      <div>
        <p className="font-medium text-foreground">{text}</p>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{t('common.connectionHint')}</p>}
      </div>
      {button}
    </div>
  )
}
