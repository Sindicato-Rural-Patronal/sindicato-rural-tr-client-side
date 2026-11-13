import { useState } from 'react'
import { toast } from 'sonner'
import { RECIBO_TEXTOS, alvoDoLancamento, emissorDoRecibo, type ReciboData } from '@/lib/recibo'
import { erroDoDocumento, registrarDocumento } from '@/lib/registrar-documento'
import type { OrgInfo } from '@/hooks/useSiteSettings'

export type OrgDoRecibo = Pick<OrgInfo, 'street' | 'district' | 'city' | 'state' | 'zip' | 'phone'>

/**
 * Gera o recibo de um lançamento (SR-065). A biblioteca de PDF só é carregada no clique,
 * como nos outros PDFs. Antes de gerar, o recibo vai para a auditoria
 * (`registrarDocumento('recibo', …)`, SR-106); se isso falhar, ele não sai e a tela mostra
 * a mensagem do registro. `busyKey` diz qual lançamento está sendo gerado: a lista usa para
 * girar o ícone da ação certa no `RowActions`.
 */
export function useGerarRecibo(org: OrgDoRecibo) {
  const [busyKey, setBusyKey] = useState<string | null>(null)

  async function gerar(tx: ReciboData, key = 'recibo') {
    setBusyKey(key)
    try {
      const { downloadRecibo } = await import('@/lib/recibo-pdf')
      await registrarDocumento('recibo', { linhas: 1, alvo: alvoDoLancamento(tx), ids: [tx.id], escopo: 'seleção' })
      await downloadRecibo(tx, emissorDoRecibo(org))
    } catch (e) {
      toast.error(erroDoDocumento(e, RECIBO_TEXTOS.erro))
    } finally {
      setBusyKey(null)
    }
  }

  return { gerar, busyKey }
}
