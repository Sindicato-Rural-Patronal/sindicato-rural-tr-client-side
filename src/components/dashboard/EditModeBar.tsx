import { useLayoutEffect, useRef, useState } from 'react'
import { Check, Loader2, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Barra do modo de organizar o painel. Fica sempre à vista enquanto a pessoa
// mexe nos blocos, porque o resultado é a própria tela mudando embaixo dela —
// sem a barra à mão ninguém acha o botão de salvar depois de rolar a página.
//
// É `fixed`, e não `sticky`, pelo mesmo motivo da barra de salvar da ficha da
// pessoa: o <main> do painel tem overflow próprio e mata o sticky. No
// computador ela fica no alto (recuada pela largura da sidebar); no celular
// vai para o pé da tela, onde o polegar alcança e não tapa o menu do topo.

export function EditModeBar({
  alterado, salvando, onSalvar, onCancelar, onRestaurar, onAltura,
}: {
  /** true quando o rascunho já difere do que está salvo. */
  alterado: boolean
  salvando: boolean
  onSalvar: () => void
  onCancelar: () => void
  onRestaurar: () => void
  /** Altura medida da barra; no celular a página usa isto para não ficar com o
   *  último bloco escondido atrás dela (a barra vai para o pé da tela). */
  onAltura?: (altura: number) => void
}) {
  // Barra fixa não ocupa lugar na página: este espaço reservado (só no
  // computador, onde ela fica no alto) impede que ela tape o primeiro bloco.
  const barra = useRef<HTMLDivElement>(null)
  const [altura, setAltura] = useState(0)
  useLayoutEffect(() => {
    const el = barra.current
    if (!el) return
    const medir = () => { setAltura(el.offsetHeight); onAltura?.(el.offsetHeight) }
    medir()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(medir)
    observer.observe(el)
    return () => observer.disconnect()
  }, [onAltura])

  return (
    <>
      <div
        ref={barra}
        role="region"
        aria-label="Organizar o painel"
        className={cn(
          'fixed inset-x-0 z-30 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/85',
          'bottom-0 border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.06)]',
          'md:top-0 md:bottom-auto md:border-t-0 md:border-b md:px-6 md:shadow-none',
          // Começa depois da sidebar, para não tapar o menu nem o sino.
          'md:left-(--sidebar-width) md:group-has-data-[collapsible=icon]/sidebar-wrapper:md:left-(--sidebar-width-icon)',
        )}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
              Organizando o painel
              {alterado && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  Alterações não salvas
                </span>
              )}
            </p>
            {/* Uma linha só: o resto a pessoa descobre olhando os blocos. */}
            <p className="text-sm text-muted-foreground">Segure e arraste um bloco para mudar a ordem.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:flex-nowrap">
            <Button
              type="button"
              variant="outline"
              className="h-11 grow gap-2 px-3 sm:grow-0"
              onClick={onRestaurar}
              disabled={salvando}
            >
              <RotateCcw className="size-4" aria-hidden /> Restaurar padrão
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 grow gap-2 px-3 sm:grow-0"
              onClick={onCancelar}
              disabled={salvando}
            >
              <X className="size-4" aria-hidden /> Cancelar
            </Button>
            <Button
              type="button"
              className="h-11 grow gap-2 px-4 sm:grow-0"
              onClick={onSalvar}
              disabled={salvando}
            >
              {salvando
                ? <Loader2 className="size-4 animate-spin" aria-hidden />
                : <Check className="size-4" aria-hidden />}
              Salvar
            </Button>
          </div>
        </div>
      </div>

      <div aria-hidden className="hidden md:block" style={{ height: altura }} />
    </>
  )
}
