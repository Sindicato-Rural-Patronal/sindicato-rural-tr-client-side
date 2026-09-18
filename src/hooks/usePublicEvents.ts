import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

// Eventos publicados no site (reservas de sala marcadas como "Mostrar no site").
// Horários "de parede" no ISO ("…T08:00:00.000Z" = 08:00 em Terra Roxa).

export type PublicEvent = {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  roomName: string
}

export function usePublicEvents() {
  return useQuery<PublicEvent[]>({
    queryKey: ['events'],
    queryFn: () =>
      apiFetch('/events')
        .then(r => r.json())
        .then(d => (Array.isArray(d) ? d : (d?.data ?? []))),
  })
}
