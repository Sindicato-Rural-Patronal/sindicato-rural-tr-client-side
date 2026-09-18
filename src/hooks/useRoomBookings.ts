import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { BookingType, ScheduleKind } from '@/lib/agenda'

// Reservas de sala (eventos e reuniões) e a agenda das salas (reservas + cursos).
// Horários "de parede" no ISO (08:00 = "…T08:00:00.000Z"), igual aos cursos.

export type RoomBooking = {
  id: string
  type: BookingType
  title: string
  /** Observações internas da equipe (não aparecem no site). */
  description: string | null
  /** Evento publicado na página /eventos. */
  publicOnSite: boolean
  /** Texto do evento no site. */
  publicDescription: string | null
  roomId: string
  roomName: string
  startTime: string
  endTime: string
  responsible: { id: string; name: string } | null
  responsibleName: string | null
  seriesId: string | null
}

export type RoomScheduleItem = {
  kind: ScheduleKind
  id: string
  title: string
  roomId: string
  roomName: string
  startTime: string
  endTime: string
  status: string | null
  seriesId: string | null
  /** Evento publicado no site (sempre false para cursos e reuniões). */
  publicOnSite: boolean
}

export type RoomBookingFilters = {
  from: string
  to: string
  roomId?: string
  type?: BookingType
  search?: string
}

export type RoomBookingBody = {
  type: BookingType
  title: string
  description?: string | null
  publicOnSite?: boolean
  publicDescription?: string | null
  roomId: string
  startTime: string
  endTime: string
  responsibleUserDataId?: string | null
  responsibleName?: string | null
  repeat?: { frequency: 'WEEKLY' | 'MONTHLY'; until: string }
}

export type CreateRoomBookingResponse = { ids: string[]; seriesId: string | null }
export type DeleteScope = 'one' | 'future'

function queryString(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) qs.set(key, value)
  return qs.toString()
}

async function asArray<T>(res: Response): Promise<T[]> {
  const data = await res.json()
  return Array.isArray(data) ? data : (data?.data ?? [])
}

export function useRoomBookings(filters: RoomBookingFilters, options: { enabled?: boolean } = {}) {
  return useQuery<RoomBooking[]>({
    queryKey: ['admin', 'room-bookings', filters],
    queryFn: () => apiFetch(`/admin/room-bookings?${queryString(filters)}`).then(r => asArray<RoomBooking>(r)),
    enabled: options.enabled ?? true,
    // Digitar na busca (ou virar o dia) mantém a lista anterior na tela até a
    // resposta chegar, em vez de piscar o esqueleto a cada letra.
    placeholderData: previous => previous,
  })
}

export function useRoomSchedule(
  filters: { from: string; to: string; roomId?: string },
  options: { enabled?: boolean } = {},
) {
  return useQuery<RoomScheduleItem[]>({
    queryKey: ['admin', 'room-schedule', filters],
    queryFn: () => apiFetch(`/admin/room-schedule?${queryString(filters)}`).then(r => asArray<RoomScheduleItem>(r)),
    enabled: options.enabled ?? true,
    placeholderData: previous => previous,
  })
}

function useInvalidateAgenda() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'room-bookings'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'room-schedule'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
  }
}

export function useCreateRoomBooking() {
  const invalidate = useInvalidateAgenda()
  return useMutation({
    mutationFn: (body: RoomBookingBody) =>
      apiFetch('/admin/room-bookings', { method: 'POST', body: JSON.stringify(body) })
        .then(r => r.json() as Promise<CreateRoomBookingResponse>),
    onSuccess: invalidate,
  })
}

export function useUpdateRoomBooking() {
  const invalidate = useInvalidateAgenda()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<RoomBookingBody> }) =>
      apiFetch(`/admin/room-bookings/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
        .then(r => r.json() as Promise<RoomBooking>),
    onSuccess: invalidate,
  })
}

export function useDeleteRoomBooking() {
  const invalidate = useInvalidateAgenda()
  return useMutation({
    mutationFn: ({ id, scope = 'one' }: { id: string; scope?: DeleteScope }) =>
      apiFetch(`/admin/room-bookings/${id}?scope=${scope}`, { method: 'DELETE' })
        .then(r => r.json().catch(() => ({})) as Promise<{ deleted?: number }>),
    onSuccess: invalidate,
  })
}
