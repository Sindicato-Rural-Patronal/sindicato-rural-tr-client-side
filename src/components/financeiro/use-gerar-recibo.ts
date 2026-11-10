import { useState } from 'react'
import { toast } from 'sonner'
import { RECIBO_TEXTOS, emissorDoRecibo, type ReciboData } from '@/lib/recibo'
import type { OrgInfo } from '@/hooks/useSiteSettings'

export type OrgDoRecibo = Pick<OrgInfo, 'street' | 'district' | 'city' | 'state' | 'zip' | 'phone'>

/**
 * Gera o recibo de um lançamento (SR-065). A biblioteca de PDF só é carregada no clique,
 * como nos outros PDFs. `busyKey` diz qual lançamento está sendo gerado: a lista usa para
 * girar o ícone da ação certa no `RowActions`.
 */
export function useGerarRecibo(org: OrgDoRecibo) {
  const [busyKey, setBusyKey] = useState<string | null>(null)

  async function gerar(tx: ReciboData, key = 'recibo') {
    setBusyKey(key)
    try {
      const { downloadRecibo } = await import('@/lib/recibo-pdf')
      await downloadRecibo(tx, emissorDoRecibo(org))
    } catch {
      toast.error(RECIBO_TEXTOS.erro)
    } finally {
      setBusyKey(null)
    }
  }

  return { gerar, busyKey }
}
