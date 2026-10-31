import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// Peças do mês fechado (SR-060) na aba Lançamentos. A regra está em
// lib/finance-closed-month.ts; o texto do motivo vem de closedMonthMessage.

/** Selo da linha de um lançamento num mês fechado do caixa dele (o motivo no title). */
export function ClosedMonthBadge({ reason }: { reason: string }) {
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground" title={reason}>
      <Lock className="size-3" aria-hidden /> Mês fechado
    </Badge>
  )
}

/** Aviso do formulário: o caixa e a data escolhidos caem num mês fechado. */
export function ClosedMonthNotice({ id, reason }: { id?: string; reason: string }) {
  return (
    <p
      id={id}
      role="status"
      className="flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
    >
      <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 break-words">{reason}</span>
    </p>
  )
}

/**
 * Botão desligado com o motivo à vista ao passar o mouse. O Button desligado é
 * `pointer-events-none` e não mostra o próprio title: quem mostra é o invólucro.
 */
export function LockedReason({ reason, children }: { reason: string | null; children: ReactNode }) {
  if (!reason) return <>{children}</>
  return <span title={reason} className="inline-flex">{children}</span>
}
