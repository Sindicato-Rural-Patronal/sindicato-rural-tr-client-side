import { useState } from 'react'
import { useExportCatalog } from '@/hooks/useExportCatalog'
import type { ExportDataset } from '@/lib/export'
import {
  guardarFormatoDaPlanilha, lerFormatoDaPlanilha, type ExportCatalog, type FormatoDaPlanilha,
} from '@/components/export/report-builder'

/**
 * A planilha rápida de um menu Exportar: CSV ou Excel (SR-106). Usada pelo
 * `ExportMenu` das listas e pelo Exportar das fichas de pessoa e de empresa
 * (SR-111), com a MESMA escolha guardada (`sr:planilha`, uma para todo o painel).
 */
export type PlanilhaDoMenu = {
  /** O catálogo da fonte (`undefined` carregando, `null` sem montador). */
  catalogo: ExportCatalog | null | undefined
  /** Com o catálogo (a API nova), o menu mostra a escolha "Planilha [CSV] [Excel (.xlsx)]". */
  comEscolha: boolean
  /** O formato em que os itens da planilha baixam (sem o catálogo, sempre CSV). */
  formato: FormatoDaPlanilha
  escolher: (formato: FormatoDaPlanilha) => void
  /** Relê a escolha guardada: chame ao abrir o menu (outra tela pode ter mudado). */
  reler: () => void
}

export function usePlanilhaDoMenu(dataset: ExportDataset): PlanilhaDoMenu {
  // O mesmo catálogo que o montador já pede (a mesma consulta): diz se a API
  // gera o Excel e os limites de linhas.
  const { data: catalogo } = useExportCatalog(dataset)
  const [escolhida, setEscolhida] = useState<FormatoDaPlanilha>(lerFormatoDaPlanilha)
  return {
    catalogo,
    comEscolha: !!catalogo,
    formato: catalogo ? escolhida : 'csv',
    escolher(formato) {
      setEscolhida(formato)
      guardarFormatoDaPlanilha(formato)
    },
    reler() {
      setEscolhida(lerFormatoDaPlanilha())
    },
  }
}
