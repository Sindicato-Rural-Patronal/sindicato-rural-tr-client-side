import { cn } from '@/lib/utils'

/**
 * Avatar compartilhado: renderiza a foto do usuário quando disponível, senão as
 * iniciais do nome. Substitui as cópias que viviam em contato.tsx (Avatar) e
 * admin/usuarios/index.tsx (AvatarCircle).
 *
 * As iniciais ficam sobre um fundo neutro com a linha fina (SR-080): seis cores
 * diferentes por nome competiam com o único destaque do sistema, o verde.
 */

const INITIALS_COLOR = 'bg-secondary text-muted-foreground ring-1 ring-inset ring-border'

const SIZE_CLASSES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-16 text-lg',
} as const

export type InitialsAvatarSize = keyof typeof SIZE_CLASSES

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export function InitialsAvatar({
  name,
  avatar,
  size = 'md',
  className,
}: {
  name: string
  avatar?: string | null
  size?: InitialsAvatarSize
  className?: string
}) {
  const sizeCls = SIZE_CLASSES[size]

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={cn(sizeCls, 'rounded-full object-cover shrink-0 border border-border', className)}
      />
    )
  }

  return (
    <div
      className={cn(
        sizeCls,
        INITIALS_COLOR,
        'rounded-full flex items-center justify-center font-medium shrink-0',
        className,
      )}
    >
      {getInitials(name)}
    </div>
  )
}
