import { cn } from '@/lib/utils'

/**
 * Avatar compartilhado: renderiza a foto do usuário quando disponível, senão as
 * iniciais do nome sobre uma cor derivada do nome. Substitui as cópias que
 * viviam em contato.tsx (Avatar) e admin/usuarios/index.tsx (AvatarCircle).
 */

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
]

// Fallback neutro para nomes vazios/em branco — evita o crash de n[0] e o
// índice de cor NaN (''.charCodeAt(0) → NaN → cor undefined).
const NEUTRAL_COLOR = 'bg-muted text-muted-foreground'

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

  const initials = getInitials(name)
  const color =
    initials === '?'
      ? NEUTRAL_COLOR
      : AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

  return (
    <div
      className={cn(
        sizeCls,
        color,
        'rounded-full flex items-center justify-center font-semibold shrink-0',
        className,
      )}
    >
      {initials}
    </div>
  )
}
