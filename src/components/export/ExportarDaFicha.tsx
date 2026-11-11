import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { downloadExport, exportErrorMessage, type ExportDataset, type ExportParams } from '@/lib/export'
import { textoDoBaixado } from '@/components/export/report-builder'
import { usePlanilhaDoMenu } from '@/components/export/use-planilha-do-menu'
import { TituloDaPlanilha } from '@/components/export/EscolhaDaPlanilha'
import {
  ItensDoMontador, MontadorAberto, type AberturaDoMontador, type FonteDoMontador,
} from '@/components/export/MontadorDeFontes'

/** Uma planilha do menu da ficha ("Ficha completa", "Propriedades (2)"): sai sem `fields`, o padrão. */
export type PlanilhaDaFicha = {
  rotulo: string
  dataset: ExportDataset
  params: ExportParams
  disabled?: boolean
}

/**
 * O "Exportar" das fichas de pessoa (`usuarios/$id`) e de empresa
 * (`empresas/$id`): as planilhas do registro e das propriedades dele e o grupo
 * "Montar relatório (escolher campos)".
 *
 * As planilhas saem no formato da escolha "Planilha [CSV] [Excel (.xlsx)]", a
 * MESMA do `ExportMenu` das listas, com a mesma preferência guardada
 * (`sr:planilha`, SR-111). Sem o catálogo da fonte da ficha (back velho), só
 * CSV, com o título de antes.
 */
export function ExportarDaFicha({ dataset, planilhas, fontes, textoSoNoComputador = false }: {
  /** A fonte da ficha (`people`, `companies`): o catálogo dela liga a escolha CSV/Excel. */
  dataset: ExportDataset
  planilhas: PlanilhaDaFicha[]
  /** "Montar relatório (escolher campos)": cada fonte aparece quando o catálogo dela carrega. */
  fontes: FonteDoMontador[]
  /** No celular o botão fica só com o ícone (a ficha da pessoa tem mais botões no topo). */
  textoSoNoComputador?: boolean
}) {
  const [baixando, setBaixando] = useState(false)
  // Cada abertura do montador começa do zero (padrão ou último usado).
  const [montador, setMontador] = useState<AberturaDoMontador>({ aberto: false, vez: 0, alvo: 0 })
  const planilha = usePlanilhaDoMenu(dataset)

  async function baixar(item: PlanilhaDaFicha) {
    const formato = planilha.formato
    setBaixando(true)
    try {
      const count = await downloadExport(item.dataset, item.params, formato)
      toast.success(textoDoBaixado(formato, count))
    } catch (e) {
      toast.error(exportErrorMessage(e, 'Erro ao exportar.'))
    } finally {
      setBaixando(false)
    }
  }

  return (
    <>
      <DropdownMenu modal={false} onOpenChange={aberto => { if (aberto) planilha.reler() }}>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5" disabled={baixando} aria-label="Exportar" title="Exportar">
            {baixando ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            <span className={textoSoNoComputador ? 'hidden sm:inline' : undefined}>Exportar</span>
          </Button>
        </DropdownMenuTrigger>
        {/* Da largura do texto, sem passar da tela do celular e sem encostar na borda. */}
        <DropdownMenuContent
          align="end"
          collisionPadding={8}
          className="w-max min-w-56 max-w-[min(22rem,calc(100vw-1rem))]"
        >
          <TituloDaPlanilha planilha={planilha} />
          {planilhas.map(item => (
            <DropdownMenuItem key={item.rotulo} disabled={item.disabled} onSelect={() => void baixar(item)}>
              {item.rotulo}
            </DropdownMenuItem>
          ))}
          <ItensDoMontador
            titulo="Montar relatório (escolher campos)"
            fontes={fontes}
            onAbrir={alvo => setMontador(m => ({ aberto: true, vez: m.vez + 1, alvo }))}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <MontadorAberto
        fontes={fontes}
        abertura={montador}
        onOpenChange={aberto => setMontador(m => ({ ...m, aberto }))}
      />
    </>
  )
}
