import { useState } from 'react'
import { HandCoins } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RECIBO_TEXTOS, alvoDoLancamento, emissorDoRecibo, podeGerarRecibo, type ReciboData } from '@/lib/recibo'
import { erroDoDocumento, registrarDocumento } from '@/lib/registrar-documento'
import type { OrgInfo } from '@/hooks/useSiteSettings'

/**
 * Botão "Gerar recibo em PDF" da linha de um lançamento (SR-065). Só existe em entrada
 * (`podeGerarRecibo`); em saída, "só nota" e transferência entre caixas não aparece nada.
 * Não trava com o mês fechado: o recibo só lê o lançamento. A biblioteca de PDF só é
 * carregada no clique, como nos outros PDFs. Antes de gerar, o recibo vai para a
 * auditoria ("Gerou o documento "Recibo: Nº 128 · …""); se isso falhar, ele não sai.
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
      await registrarDocumento('recibo', { linhas: 1, alvo: alvoDoLancamento(tx), ids: [tx.id], escopo: 'seleção' })
      await downloadRecibo(tx, emissorDoRecibo(org))
    } catch (e) {
      toast.error(erroDoDocumento(e, RECIBO_TEXTOS.erro))
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
