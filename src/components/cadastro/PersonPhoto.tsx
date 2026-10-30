import { useState } from 'react'
import { User } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * Foto do cadastro na ficha da pessoa: grande (128 px no celular, 160 no computador)
 * e, ao clicar, abre ampliada num diálogo. Sem foto mostra só o ícone, sem clique.
 */
export function PersonPhoto({ src, name }: { src?: string | null; name: string }) {
  const [open, setOpen] = useState(false)
  const quem = name.trim() || 'a pessoa'

  if (!src) {
    return (
      <div
        className="flex size-32 shrink-0 items-center justify-center rounded-full border bg-muted sm:size-40"
        role="img"
        aria-label="Sem foto"
      >
        <User className="size-12 text-muted-foreground sm:size-14" />
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ampliar a foto de ${quem}`}
        title="Clique para ampliar"
        className="shrink-0 cursor-zoom-in rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <img src={src} alt={`Foto de ${quem}`} className="size-32 rounded-full border object-cover sm:size-40" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[min(92vw,44rem)] gap-3 p-3 sm:max-w-[min(92vw,44rem)]">
          <DialogHeader>
            <DialogTitle className="truncate pr-8 text-base">{name.trim() || 'Foto do cadastro'}</DialogTitle>
            <DialogDescription className="sr-only">Foto do cadastro ampliada</DialogDescription>
          </DialogHeader>
          <img src={src} alt={`Foto ampliada de ${quem}`} className="mx-auto max-h-[75vh] w-auto max-w-full rounded-md object-contain" />
        </DialogContent>
      </Dialog>
    </>
  )
}
