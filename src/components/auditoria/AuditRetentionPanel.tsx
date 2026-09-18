import { useState } from 'react'
import { toast } from 'sonner'
import { Settings2, ChevronDown, Loader2 } from 'lucide-react'
import { useAuditSettings, useUpdateAuditRetention } from '@/hooks/useAuditTrail'
import { apiErrorMessage } from '@/lib/api-error-message'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'

// "Configurações da trilha": por quanto tempo os registros ficam guardados.
// Só aparece para quem tem UPDATE_AUDIT (a tela cuida disso).

const FALLBACK_OPTIONS = [0, 90, 180, 365, 730]

function retentionLabel(days: number): string {
  if (!days) return 'Guardar para sempre'
  if (days === 365) return '1 ano (365 dias)'
  if (days === 730) return '2 anos (730 dias)'
  if (days % 30 === 0) return `${days} dias (${days / 30} meses)`
  return `${days} dias`
}

export function AuditRetentionPanel() {
  const { data, isLoading } = useAuditSettings()
  const update = useUpdateAuditRetention()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<number | null>(null)

  const current = data?.retentionDays ?? 0
  const options = data?.options?.length ? data.options : FALLBACK_OPTIONS
  const oldest = data?.oldestAt ? new Date(data.oldestAt) : null

  async function save(days: number) {
    setConfirming(null)
    try {
      const result = await update.mutateAsync(days)
      const deleted = result.deleted ?? 0
      toast.success(
        days === 0
          ? 'Os registros passam a ser guardados para sempre.'
          : deleted > 0
            ? `Guarda de ${days} dias salva. ${deleted} registro(s) antigo(s) apagado(s).`
            : `Guarda de ${days} dias salva.`,
      )
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao salvar o tempo de guarda.'))
    }
  }

  function handleChange(value: string) {
    const days = Number(value)
    if (Number.isNaN(days) || days === current) return
    // Diminuir a guarda apaga registros na hora: confirma antes.
    const reducing = days > 0 && (current === 0 || days < current)
    if (reducing) setConfirming(days)
    else void save(days)
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <Settings2 className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Configurações da trilha</span>
        <span className="text-xs text-muted-foreground">
          {isLoading ? '' : `Guarda: ${retentionLabel(current)}`}
        </span>
        <ChevronDown className={`ml-auto size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-4">
          {isLoading ? (
            <Skeleton className="h-9 w-64" />
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] text-muted-foreground" htmlFor="audit-retention">
                    Tempo de guarda dos registros
                  </Label>
                  <NativeSelect
                    id="audit-retention"
                    className="h-9 w-[260px]"
                    value={String(current)}
                    disabled={update.isPending}
                    onChange={e => handleChange(e.target.value)}
                  >
                    {options.map(d => (
                      <option key={d} value={d}>{retentionLabel(d)}</option>
                    ))}
                  </NativeSelect>
                </div>
                {update.isPending && (
                  <span className="flex h-9 items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Salvando...
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Registros mais antigos que o prazo escolhido são apagados automaticamente.
                Com "Guardar para sempre" nada é apagado. A trilha guarda o IP, o aparelho
                (navegador e sistema) e a cidade aproximada de quem fez cada ação.
              </p>
              <p className="text-xs text-muted-foreground">
                {oldest
                  ? <>Registro mais antigo guardado: <strong className="text-foreground">{oldest.toLocaleDateString('pt-BR')}</strong>{typeof data?.total === 'number' ? ` · ${data.total} registro(s) na trilha.` : '.'}</>
                  : 'Nenhum registro na trilha ainda.'}
              </p>
            </>
          )}
        </div>
      )}

      <DeleteConfirmDialog
        open={confirming !== null}
        onOpenChange={o => { if (!o) setConfirming(null) }}
        title="Diminuir o tempo de guarda?"
        description={`Registros com mais de ${confirming ?? 0} dias serão apagados. Continuar?`}
        confirmLabel="Apagar e salvar"
        pendingLabel="Salvando..."
        pending={update.isPending}
        onConfirm={() => void save(confirming ?? 0)}
      />
    </div>
  )
}
