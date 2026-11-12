import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import type { FormatoDaPlanilha } from '@/components/export/report-builder'
import type { PlanilhaDoMenu } from '@/components/export/use-planilha-do-menu'

/** As duas planilhas, na ordem da escolha. O nome acessível diz o formato inteiro. */
const OPCOES_DA_PLANILHA: { valor: FormatoDaPlanilha; rotulo: string; nome: string }[] = [
  { valor: 'csv', rotulo: 'CSV', nome: 'Planilha CSV' },
  { valor: 'xlsx', rotulo: 'Excel (.xlsx)', nome: 'Planilha do Excel (.xlsx)' },
]

/**
 * "Planilha: [CSV] [Excel (.xlsx)]" numa linha só, no lugar do título da seção:
 * os itens de baixo baixam no formato marcado. São itens de rádio do menu
 * (setas e Enter funcionam) que não fecham o menu.
 */
function EscolhaDaPlanilha({ formato, onEscolher }: {
  formato: FormatoDaPlanilha
  onEscolher: (formato: FormatoDaPlanilha) => void
}) {
  return (
    <div className="flex items-center gap-2 px-1.5 py-1">
      <span className="text-xs text-muted-foreground">Planilha</span>
      <DropdownMenuPrimitive.RadioGroup
        value={formato}
        onValueChange={v => onEscolher(v === 'xlsx' ? 'xlsx' : 'csv')}
        aria-label="Formato da planilha"
        className="flex gap-1"
      >
        {OPCOES_DA_PLANILHA.map(op => (
          <DropdownMenuPrimitive.RadioItem
            key={op.valor}
            value={op.valor}
            aria-label={op.nome}
            // Escolher o formato não fecha o menu: o clique seguinte é o que baixa.
            onSelect={e => e.preventDefault()}
            className="flex h-7 cursor-default items-center rounded-md border border-input px-2.5 text-xs whitespace-nowrap outline-hidden select-none data-highlighted:ring-2 data-highlighted:ring-ring/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          >
            {op.rotulo}
          </DropdownMenuPrimitive.RadioItem>
        ))}
      </DropdownMenuPrimitive.RadioGroup>
    </div>
  )
}

/**
 * O título da seção da planilha num menu Exportar: com o catálogo, a escolha
 * CSV/Excel (`usePlanilhaDoMenu`); sem ele (back velho), o título de antes,
 * "Planilha CSV (abre no Excel)".
 */
export function TituloDaPlanilha({ planilha }: { planilha: PlanilhaDoMenu }) {
  return planilha.comEscolha ? (
    <EscolhaDaPlanilha formato={planilha.formato} onEscolher={planilha.escolher} />
  ) : (
    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Planilha CSV (abre no Excel)</DropdownMenuLabel>
  )
}
