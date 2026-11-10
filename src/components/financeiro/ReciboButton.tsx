import { HandCoins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RECIBO_TEXTOS, podeGerarRecibo, type ReciboData } from '@/lib/recibo'
import { useGerarRecibo, type OrgDoRecibo } from '@/components/financeiro/use-gerar-recibo'

/**
 * Botão "Gerar recibo em PDF" de um lançamento (SR-065). Só existe em entrada
 * (`podeGerarRecibo`); em saída, "só nota" e transferência entre caixas não aparece nada.
 * Não trava com o mês fechado: o recibo só lê o lançamento. Na lista do Financeiro a ação
 * vai no `RowActions` (com o `useGerarRecibo`); o botão fica para quem precisa dele sozinho.
 */
export function ReciboButton({ tx, org, className }: {
  tx: ReciboData
  /** Dados do sindicato (`useOrgInfo()`): vão no cabeçalho e na cidade do "local e data". */
  org: OrgDoRecibo
  className?: string
}) {
  const { gerar, busyKey } = useGerarRecibo(org)
  if (!podeGerarRecibo(tx)) return null

  return (
    <Button
      size="sm"
      variant="ghost"
      className={cn('text-muted-foreground', className)}
      disabled={busyKey !== null}
      onClick={() => void gerar(tx)}
      aria-label={RECIBO_TEXTOS.botao}
      title={RECIBO_TEXTOS.botao}
    >
      <HandCoins className="size-4" />
    </Button>
  )
}
