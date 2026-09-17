import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

// Notificações do painel (sino): avisos do que aconteceu (lidos/não lidos) e
// pendências calculadas na hora, conforme as permissões de quem está logado.

/** Aviso de algo que aconteceu (inscrição nova, mensagem recebida...). */
export type NotificationEvent = {
  id: string
  type: string
  title: string
  body: string | null
  /** Tela do painel a abrir, ex.: `/admin/mensagens`. */
  link: string | null
  createdAt: string
  read: boolean
}

/** Pendência: algo que ainda precisa ser resolvido (some sozinha quando resolvido). */
export type PendingItem = {
  type: string
  title: string
  body: string | null
  count: number
  link: string | null
  severity: 'info' | 'warning'
}

export type NotificationsResponse = {
  unreadCount: number
  pendingCount: number
  events: NotificationEvent[]
  pending: PendingItem[]
}

export const NOTIFICATIONS_KEY = ['admin', 'notifications'] as const

export function useNotifications() {
  return useQuery<NotificationsResponse>({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => apiFetch('/admin/notifications').then(r => r.json()),
    // Confere de minuto em minuto e ao voltar para a aba do painel.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Marca avisos como lidos só na tela (antes da resposta do servidor).
 * Sem `ids` = todos. O contador desce pelos avisos que estavam não lidos.
 */
export function markReadLocally(data: NotificationsResponse, ids?: string[]): NotificationsResponse {
  if (!ids) {
    return { ...data, unreadCount: 0, events: data.events.map(e => (e.read ? e : { ...e, read: true })) }
  }
  const target = new Set(ids)
  let changed = 0
  const events = data.events.map(e => {
    if (e.read || !target.has(e.id)) return e
    changed++
    return { ...e, read: true }
  })
  return { ...data, events, unreadCount: Math.max(0, data.unreadCount - changed) }
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids?: string[]): Promise<{ updated: number }> =>
      apiFetch('/admin/notifications/read', {
        method: 'PATCH',
        body: JSON.stringify(ids ? { ids } : {}),
      }).then(r => r.json()),
    onMutate: async ids => {
      // Evita que uma consulta em andamento sobrescreva a marcação feita na tela.
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY })
      const previous = qc.getQueryData<NotificationsResponse>(NOTIFICATIONS_KEY)
      if (previous) qc.setQueryData(NOTIFICATIONS_KEY, markReadLocally(previous, ids))
      return { previous }
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) qc.setQueryData(NOTIFICATIONS_KEY, context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  })
}
