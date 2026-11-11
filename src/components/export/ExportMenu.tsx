import { lazy, Suspense, useState } from 'react'
import { toast } from 'sonner'
import { Columns3, Download, FileSpreadsheet, FileText, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useExportCatalog } from '@/hooks/useExportCatalog'
import { downloadExport, exportErrorMessage, type ExportDataset, type ExportFormat, type ExportParams } from '@/lib/export'
import { cn } from '@/lib/utils'

// O montador (dnd-kit e companhia) só entra no pacote de quem abre.
const ReportBuilder = lazy(() => import('@/components/export/ReportBuilder').then(m => ({ default: m.ReportBuilder })))

export type ExportExtraItem = {
  label: string
  dataset: ExportDataset
  params: ExportParams
  disabled?: boolean
}

async function runExport(dataset: ExportDataset, params: ExportParams, format: ExportFormat = 'csv') {
  const nome = format === 'pdf' ? 'Relatório' : 'Planilha'
  try {
    const count = await downloadExport(dataset, params, format)
    toast.success(
      count === 1 ? `${nome} com 1 registro baixado.`
        : count >= 0 ? `${nome} com ${count} registros baixado.`
          : `${nome} baixado.`,
    )
  } catch (err) {
    toast.error(exportErrorMessage(err, 'Erro ao exportar.'))
  }
}

/**
 * Botão "Exportar" das listas: os selecionados (quando houver) ou todos os que
 * batem com os filtros atuais. `extra` adiciona exportações relacionadas
 * (ex.: propriedades das pessoas selecionadas).
 *
 * "Montar relatório…" (decisão 006) só aparece quando o catálogo da fonte
 * carrega: o back velho e as fontes sem montador respondem 404 e o menu fica
 * como antes. O montador recebe os mesmos filtros e a mesma seleção.
 */
export function ExportMenu({
  dataset, filters = {}, selectedIds, total, filtered = false, extra = [], className, label = 'Exportar', size,
}: {
  dataset: ExportDataset
  /** Mesmos filtros da listagem (sem página/limite). */
  filters?: ExportParams
  /** Seleção da lista. Sem a prop, a tela não tem seleção e os itens "Selecionados" somem. */
  selectedIds?: string[]
  /** Total da lista com os filtros atuais, para o rótulo. */
  total?: number
  /** Há filtro ativo? Muda o texto de "todos" para "com os filtros atuais". */
  filtered?: boolean
  extra?: ExportExtraItem[]
  className?: string
  /** Texto do botão ("Planilha" nas inscrições do curso). */
  label?: string
  size?: 'sm' | 'default'
}) {
  const [busy, setBusy] = useState(false)
  // Cada abertura do montador começa do zero (padrão ou último usado).
  const [montador, setMontador] = useState({ aberto: false, vez: 0 })
  const { data: catalogo } = useExportCatalog(dataset)

  async function run(ds: ExportDataset, params: ExportParams, format: ExportFormat = 'csv') {
    setBusy(true)
    await runExport(ds, params, format)
    setBusy(false)
  }

  const temSelecao = selectedIds !== undefined
  const ids = selectedIds ?? []
  const n = ids.length
  const allLabel = `${filtered ? 'Todos com os filtros atuais' : 'Todos'}${total != null ? ` (${total})` : ''}`

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={size} className={cn('gap-2', className)} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {label}{n > 0 ? ` (${n})` : ''}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Planilha CSV (abre no Excel)</DropdownMenuLabel>
          {temSelecao && (
            <DropdownMenuItem disabled={n === 0} onSelect={() => run(dataset, { ids })}>
              <FileSpreadsheet className="size-4" />
              {n > 0 ? `Selecionados (${n})` : 'Selecionados (marque na lista)'}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={total === 0} onSelect={() => run(dataset, filters)}>
            <FileSpreadsheet className="size-4" />
            {allLabel}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* O PDF sai do mesmo dado, com as colunas que cabem no papel. */}
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Relatório em PDF (para imprimir)
          </DropdownMenuLabel>
          {temSelecao && (
            <DropdownMenuItem disabled={n === 0} onSelect={() => run(dataset, { ids }, 'pdf')}>
              <FileText className="size-4" />
              {n > 0 ? `Selecionados (${n})` : 'Selecionados (marque na lista)'}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={total === 0} onSelect={() => run(dataset, filters, 'pdf')}>
            <FileText className="size-4" />
            {allLabel}
          </DropdownMenuItem>
          {extra.length > 0 && <DropdownMenuSeparator />}
          {extra.map(item => (
            <DropdownMenuItem key={item.label} disabled={item.disabled} onSelect={() => run(item.dataset, item.params)}>
              {item.label}
            </DropdownMenuItem>
          ))}
          {catalogo && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setMontador(m => ({ aberto: true, vez: m.vez + 1 }))}>
                <Columns3 className="size-4" />
                Montar relatório…
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {catalogo && montador.vez > 0 && (
        <Suspense fallback={null}>
          <ReportBuilder
            key={montador.vez}
            open={montador.aberto}
            onOpenChange={aberto => setMontador(m => ({ ...m, aberto }))}
            dataset={dataset}
            catalog={catalogo}
            filters={filters}
            selectedIds={selectedIds}
            total={total}
            filtered={filtered}
          />
        </Suspense>
      )}
    </>
  )
}

/** Exportar um registro só (telas de detalhe). */
export function ExportOneButton({ dataset, id, label = 'Exportar', className, size }: {
  dataset: ExportDataset
  id: string
  label?: string
  className?: string
  size?: 'sm' | 'default'
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      variant="outline"
      size={size}
      className={cn('gap-2', className)}
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await runExport(dataset, { ids: [id] })
        setBusy(false)
      }}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      {label}
    </Button>
  )
}

/** Checkbox de linha / "marcar todos" das tabelas com seleção. */
export function SelectCheckbox({ checked, indeterminate = false, onChange, label }: {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
  label: string
}) {
  return (
    <input
      type="checkbox"
      className="size-4 cursor-pointer accent-primary align-middle"
      checked={checked}
      ref={el => { if (el) el.indeterminate = indeterminate }}
      onChange={onChange}
      onClick={e => e.stopPropagation()}
      aria-label={label}
    />
  )
}

/** "3 selecionados · Limpar" ao lado do botão de exportar. */
export function SelectionInfo({ count, onClear }: { count: number; onClear: () => void }) {
  if (count === 0) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
      {count} selecionado{count > 1 ? 's' : ''}
      <button type="button" onClick={onClear} className="rounded-full p-0.5 hover:bg-primary/15" aria-label="Limpar seleção">
        <X className="size-3" />
      </button>
    </span>
  )
}
