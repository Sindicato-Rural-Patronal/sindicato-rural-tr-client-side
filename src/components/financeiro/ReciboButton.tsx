import { useState } from 'react'
import { HandCoins } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RECIBO_TEXTOS, emissorDoRecibo, podeGerarRecibo, type ReciboData } from '@/lib/recibo'
import type { OrgInfo } from '@/hooks/useSiteSettings'

/**
 * Botão "Gerar recibo em PDF" da linha de um lançamento (SR-065). Só existe em entrada
 * (`podeGerarRecibo`); em saída, "só nota" e transferência entre caixas não aparece nada.
 * Não trava com o mês fechado: o recibo só lê o lançamento. A biblioteca de PDF só é
 * carregada no clique, como nos outros PDFs.
 */
export function ReciboButton({ tx, org, className }: {
  tx: ReciboData
  /** Dados do sindicato (`useOrgInfo()`): vão no cabeçalho e na cidade do "local e data". */
  org: Pick<OrgInfo, 'street' | 'district' | 'city' | 'state' | 'zip' | 'phone'>
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  if (!podeGerarRecibo(tx)) return null

  async function gerar() {
    setBusy(true)
    try {
      const { downloadRecibo } = await import('@/lib/recibo-pdf')
      await downloadRecibo(tx, emissorDoRecibo(org))
    } catch {
      toast.error(RECIBO_TEXTOS.erro)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className={cn('text-muted-foreground', className)}
      disabled={busy}
      onClick={() => void gerar()}
      aria-label={RECIBO_TEXTOS.botao}
      title={RECIBO_TEXTOS.botao}
    >
      <HandCoins className="size-4" />
    </Button>
  )
}
