import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { apiErrorMessage } from '@/lib/api-error-message'
import { downloadExport, type ExportDataset, type ExportParams } from '@/lib/export'
import { cn } from '@/lib/utils'

export type ExportExtraItem = {
  label: string
  dataset: ExportDataset
  params: ExportParams
  disabled?: boolean
}

async function runExport(dataset: ExportDataset, params: ExportParams) {
  try {
    const count = await downloadExport(dataset, params)
    toast.success(count === 1 ? 'Planilha com 1 registro baixada.' : count >= 0 ? `Planilha com ${count} registros baixada.` : 'Planilha baixada.')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Erro ao exportar.'))
  }
}

/**
 * Botão "Exportar" das listas: os selecionados (quando houver) ou todos os que
 * batem com os filtros atuais. `extra` adiciona exportações relacionadas
 * (ex.: propriedades das pessoas selecionadas).
 */
export function ExportMenu({ dataset, filters = {}, selectedIds = [], total, filtered = false, extra = [], className }: {
  dataset: ExportDataset
  /** Mesmos filtros da listagem (sem página/limite). */
  filters?: ExportParams
  selectedIds?: string[]
  /** Total da lista com os filtros atuais, para o rótulo. */
  total?: number
  /** Há filtro ativo? Muda o texto de "todos" para "com os filtros atuais". */
  filtered?: boolean
  extra?: ExportExtraItem[]
  className?: string
}) {
  const [busy, setBusy] = useState(false)

  async function run(ds: ExportDataset, params: ExportParams) {
    setBusy(true)
    await runExport(ds, params)
    setBusy(false)
  }

  const n = selectedIds.length
  const allLabel = `${filtered ? 'Todos com os filtros atuais' : 'Todos'}${total != null ? ` (${total})` : ''}`

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn('gap-2', className)} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Exportar{n > 0 ? ` (${n})` : ''}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Planilha CSV (abre no Excel)</DropdownMenuLabel>
        <DropdownMenuItem disabled={n === 0} onSelect={() => run(dataset, { ids: selectedIds })}>
          {n > 0 ? `Selecionados (${n})` : 'Selecionados (marque na lista)'}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={total === 0} onSelect={() => run(dataset, filters)}>
          {allLabel}
        </DropdownMenuItem>
        {extra.length > 0 && <DropdownMenuSeparator />}
        {extra.map(item => (
          <DropdownMenuItem key={item.label} disabled={item.disabled} onSelect={() => run(item.dataset, item.params)}>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
