import type { LucideIcon } from 'lucide-react'
import { Loader2, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type RowAction = {
  /** O nome da ação: aparece no menu "Mais", na dica e no leitor de tela. */
  label: string
  icon: LucideIcon
  onClick: () => void
  /** Excluir e afins: vermelho da terra roxa e, no menu, por último, depois de uma linha. */
  destructive?: boolean
  /** Não desenha: sem permissão, ou a ação não vale para esta linha. */
  hidden?: boolean
  /** Desligada (ex.: mês fechado). O motivo vai em `reason`. */
  disabled?: boolean
  /** Por que está desligada; aparece na dica (e no `title` do item do menu). */
  reason?: string
  /** Trabalhando (gerando um PDF…): ícone girando e desligada. */
  busy?: boolean
  /** Chave estável, quando o rótulo pode se repetir. */
  key?: string
}

type RowActionsProps = {
  /** Na ordem de importância: as primeiras ficam à vista. */
  actions: RowAction[]
  /** Quantas ficam à vista (padrão 2). O resto vai para o menu "Mais". */
  visible?: number
  /** Para o leitor de tela, ex.: "Ações do lançamento Nº 215". */
  label?: string
  className?: string
}

function ActionIcon({ action }: { action: RowAction }) {
  const Icon = action.busy ? Loader2 : action.icon
  return <Icon className={cn('size-4', action.busy && 'animate-spin')} aria-hidden />
}

function InlineAction({ action }: { action: RowAction }) {
  const off = !!action.disabled || !!action.busy
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      // 44 px no toque, 32 px no computador (a regra de alvo do projeto).
      className={cn(
        'size-11 text-muted-foreground hover:text-foreground md:size-8',
        action.destructive && 'hover:bg-destructive-soft hover:text-destructive',
      )}
      onClick={action.onClick}
      disabled={off}
      aria-label={action.label}
    >
      <ActionIcon action={action} />
    </Button>
  )
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* O Button desligado não recebe o ponteiro: quem mostra a dica é o invólucro. */}
        {off ? <span tabIndex={0} className="inline-flex rounded-md">{button}</span> : button}
      </TooltipTrigger>
      <TooltipContent side="top">{action.disabled && action.reason ? action.reason : action.label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Ações de uma linha de tabela ou lista, iguais em todas as telas: as duas principais à
 * vista (ícone, com o nome na dica) e o resto num menu "Mais", com os nomes escritos.
 * Com uma ação sobrando só, ela também fica à vista (menu de um item não ajuda).
 */
export function RowActions({ actions, visible = 2, label = 'Ações', className }: RowActionsProps) {
  const shown = actions.filter(a => !a.hidden)
  let inline = shown.slice(0, visible)
  let rest = shown.slice(visible)
  if (rest.length === 1) {
    inline = shown
    rest = []
  }
  const menuRegular = rest.filter(a => !a.destructive)
  const menuDestructive = rest.filter(a => a.destructive)

  if (shown.length === 0) return null

  return (
    <div role="group" aria-label={label} className={cn('inline-flex items-center justify-end gap-0.5', className)}>
      {inline.map(a => <InlineAction key={a.key ?? a.label} action={a} />)}
      {rest.length > 0 && (
        <DropdownMenu modal={false}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-11 text-muted-foreground hover:text-foreground md:size-8"
                  aria-label="Mais ações"
                >
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">Mais</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-auto min-w-48">
            {menuRegular.map(a => (
              <DropdownMenuItem
                key={a.key ?? a.label}
                onSelect={() => a.onClick()}
                disabled={!!a.disabled || !!a.busy}
                title={a.disabled ? a.reason : undefined}
              >
                <ActionIcon action={a} />
                {a.label}
              </DropdownMenuItem>
            ))}
            {menuRegular.length > 0 && menuDestructive.length > 0 && <DropdownMenuSeparator />}
            {menuDestructive.map(a => (
              <DropdownMenuItem
                key={a.key ?? a.label}
                variant="destructive"
                onSelect={() => a.onClick()}
                disabled={!!a.disabled || !!a.busy}
                title={a.disabled ? a.reason : undefined}
              >
                <ActionIcon action={a} />
                {a.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
