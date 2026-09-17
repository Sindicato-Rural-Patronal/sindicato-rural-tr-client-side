import { useId, useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Bell, CheckCheck, Info, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  useMarkNotificationsRead, useNotifications,
  type NotificationEvent, type PendingItem,
} from '@/hooks/useNotifications'
import { fullDateTime, relativeTime } from '@/lib/relative-time'
import { cn } from '@/lib/utils'

// Só abre telas do próprio painel (nada de endereço externo vindo da API).
function isAdminLink(link: string | null): link is string {
  return !!link && /^\/admin(\/|\?|#|$)/.test(link)
}

// Pendências "warning" contam no número do sino junto com os avisos não lidos.
function badgeCount(unread: number, pending: PendingItem[]) {
  return unread + pending.filter(p => p.severity === 'warning').length
}

type BellProps = {
  className?: string
  /** Lado em que o painel abre no computador (na barra lateral: à direita). */
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

/** Sino de notificações do painel: popover no computador, painel lateral no celular. */
export function NotificationBell({ className, side = 'bottom', align = 'end' }: BellProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const { data } = useNotifications()

  const count = data ? badgeCount(data.unreadCount, data.pending) : 0
  const label = count === 0 ? 'Notificações' : `Notificações, ${count} ${count === 1 ? 'nova' : 'novas'}`

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title="Notificações"
      className={cn('relative size-10 shrink-0', className)}
    >
      <Bell className="size-5" />
      {count > 0 && (
        <span
          aria-hidden
          data-testid="notification-badge"
          className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] leading-none font-bold text-white tabular-nums"
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Button>
  )

  const close = () => setOpen(false)

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="right" className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
          <SheetDescription className="sr-only">Pendências e avisos do painel</SheetDescription>
          <NotificationPanel
            onClose={close}
            title={<SheetTitle className="text-lg font-semibold">Notificações</SheetTitle>}
            headerClassName="pr-14"
            listClassName="flex-1"
          />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className="w-[min(26rem,calc(100vw-2rem))] gap-0 p-0"
      >
        <NotificationPanel
          onClose={close}
          title={<h2 className="text-base font-semibold">Notificações</h2>}
          listClassName="max-h-[min(70vh,36rem)]"
        />
      </PopoverContent>
    </Popover>
  )
}

type PanelProps = {
  onClose: () => void
  title: ReactNode
  headerClassName?: string
  listClassName?: string
}

function NotificationPanel({ onClose, title, headerClassName, listClassName }: PanelProps) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch, isFetching } = useNotifications()
  const markRead = useMarkNotificationsRead()
  const headingId = useId()

  function open(link: string) {
    onClose()
    navigate({ href: link })
  }

  function selectEvent(event: NotificationEvent) {
    if (!event.read) markRead.mutate([event.id])
    if (isAdminLink(event.link)) open(event.link)
  }

  function markAll() {
    markRead.mutate(undefined, {
      onError: () => toast.error('Não foi possível marcar os avisos como lidos.'),
    })
  }

  // Avisos importantes primeiro (ordem do servidor mantida dentro de cada grupo).
  const pending = [...(data?.pending ?? [])].sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === 'warning' ? -1 : 1,
  )
  const events = data?.events ?? []
  const unread = data?.unreadCount ?? 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn('flex min-h-14 items-center justify-between gap-2 border-b px-4 py-2', headerClassName)}>
        {title}
        {unread > 0 && (
          <Button variant="ghost" className="h-9 px-3 text-sm" onClick={markAll}>
            <CheckCheck className="size-4" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      <div className={cn('min-h-0 overflow-y-auto pb-2', listClassName)}>
        {isLoading ? (
          <div className="flex flex-col gap-3 p-4" aria-label="Carregando notificações">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : isError && !data ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <p className="text-sm text-destructive">Não foi possível carregar as notificações.</p>
            <Button variant="outline" className="h-10 px-4" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} /> Tentar de novo
            </Button>
          </div>
        ) : (
          <>
            <section aria-labelledby={`${headingId}-pendencias`}>
              <h3 id={`${headingId}-pendencias`} className="px-4 pt-3 pb-2 text-sm font-semibold text-muted-foreground">
                Pendências
              </h3>
              {pending.length === 0 ? (
                <p className="px-4 pb-2 text-sm text-muted-foreground">Nada pendente.</p>
              ) : (
                <ul className="flex flex-col gap-2 px-3">
                  {pending.map((item, i) => (
                    <li key={`${item.type}-${i}`}>
                      <PendingRow item={item} onOpen={open} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby={`${headingId}-avisos`} className="mt-2 border-t">
              <h3 id={`${headingId}-avisos`} className="px-4 pt-3 pb-2 text-sm font-semibold text-muted-foreground">
                Avisos
              </h3>
              {events.length === 0 ? (
                <p className="px-4 pb-2 text-sm text-muted-foreground">Nenhum aviso nos últimos 30 dias.</p>
              ) : (
                <ul className="flex flex-col px-1">
                  {events.map(event => (
                    <li key={event.id}>
                      <EventRow event={event} onSelect={selectEvent} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function PendingRow({ item, onOpen }: { item: PendingItem; onOpen: (link: string) => void }) {
  const warning = item.severity === 'warning'
  const Icon = warning ? AlertTriangle : Info
  const base = cn(
    'flex w-full items-start gap-3 rounded-lg border p-3 text-left',
    warning
      ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
      : 'border-border bg-card text-foreground',
  )
  const content = (
    <>
      <Icon
        aria-hidden
        className={cn('mt-0.5 size-5 shrink-0', warning ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug font-semibold">{item.title}</span>
        {item.body && (
          <span className={cn('mt-0.5 block text-sm', warning ? 'text-amber-900/80 dark:text-amber-200/80' : 'text-muted-foreground')}>
            {item.body}
          </span>
        )}
      </span>
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
          warning ? 'bg-amber-200 text-amber-950 dark:bg-amber-800 dark:text-amber-50' : 'bg-muted text-foreground',
        )}
      >
        {item.count}
      </span>
    </>
  )

  if (!isAdminLink(item.link)) return <div className={base}>{content}</div>
  const link = item.link
  return (
    <button
      type="button"
      onClick={() => onOpen(link)}
      className={cn(
        base,
        'transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        warning ? 'hover:bg-amber-100 dark:hover:bg-amber-950/60' : 'hover:bg-muted/60',
      )}
    >
      {content}
    </button>
  )
}

function EventRow({ event, onSelect }: { event: NotificationEvent; onSelect: (e: NotificationEvent) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span
        aria-hidden
        className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', event.read ? 'bg-transparent' : 'bg-primary')}
      />
      <span className="min-w-0 flex-1">
        <span className={cn('block text-sm leading-snug', event.read ? 'text-foreground/80' : 'font-semibold text-foreground')}>
          {event.title}
          {!event.read && <span className="sr-only"> (não lido)</span>}
        </span>
        {event.body && <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{event.body}</span>}
      </span>
      <time
        dateTime={event.createdAt}
        title={fullDateTime(event.createdAt)}
        className="shrink-0 pt-0.5 text-xs text-muted-foreground"
      >
        {relativeTime(event.createdAt)}
      </time>
    </button>
  )
}
