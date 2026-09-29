import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { apagarEmLotes } from '@/lib/bulk-delete'
import { cn } from '@/lib/utils'

// "Excluir selecionados" das listas do painel. Fica ao lado do Exportar, que
// já usa a mesma seleção: marcar dez linhas para exportar e ter de apagar uma
// a uma, abrindo cada registro, era o caminho que existia.

export function BulkDeleteButton({
  ids, singular, plural, allowed, onDelete, onDone, className,
}: {
  ids: string[]
  /** "curso", "pessoa" — usado nas frases do aviso e do resultado. */
  singular: string
  plural: string
  /** Sem a permissão de excluir, o botão não aparece. */
  allowed: boolean
  onDelete: (id: string) => Promise<unknown>
  /** Chamado no fim, mesmo com falhas — para limpar a seleção e recarregar. */
  onDone: () => void
  className?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const n = ids.length

  if (!allowed || n === 0) return null

  const quantos = `${n} ${n === 1 ? singular : plural}`

  async function excluir() {
    setExcluindo(true)
    try {
      const { ok, erros } = await apagarEmLotes(ids, onDelete)
      if (erros.length === 0) {
        toast.success(`${ok} ${ok === 1 ? singular : plural} ${ok === 1 ? 'excluído' : 'excluídos'}.`)
      } else if (ok > 0) {
        // Parcial: dizer quantos foram é o que evita a pessoa repetir tudo.
        toast.warning(`${ok} de ${n} ${plural} excluídos. O resto falhou: ${erros[0]}`, { duration: 12000 })
      } else {
        toast.error(`Nada foi excluído: ${erros[0]}`)
      }
    } finally {
      setExcluindo(false)
      setAberto(false)
      onDone()
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className={cn('gap-2 text-destructive hover:text-destructive', className)}
        disabled={excluindo}
        onClick={() => setAberto(true)}
      >
        {excluindo ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        Excluir ({n})
      </Button>

      <DeleteConfirmDialog
        open={aberto}
        onOpenChange={o => { if (!o && !excluindo) setAberto(false) }}
        title={`Excluir ${quantos}?`}
        description={`Isto exclui ${quantos} de uma vez e não tem como desfazer. Confira a seleção antes de confirmar.`}
        confirmLabel={`Excluir ${quantos}`}
        pending={excluindo}
        pendingLabel="Excluindo..."
        onConfirm={() => void excluir()}
      />
    </>
  )
}
