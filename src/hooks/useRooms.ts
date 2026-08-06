import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export type Room = {
  id: string
  name: string
  description: string
  maxCapacity: number
  createdAt: string
  updatedAt: string
}

export type CreateRoomBody = {
  name: string
  description: string
  maxCapacity: number
}

export function useRooms() {
  return useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: () => apiFetch('/rooms?limit=1000').then(r => r.json()).then(d => Array.isArray(d) ? d : (d.data ?? [])),
  })
}

export function useCreateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateRoomBody) =>
      apiFetch('/rooms', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
  })
}

export function useUpdateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CreateRoomBody }) =>
      apiFetch(`/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
  })
}

export function useDeleteRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/rooms/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
  })
}
