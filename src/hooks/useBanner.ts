import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiUpload, API_BASE } from '@/lib/api'

export type BannerButton = {
  label: string
  url: string
  external: boolean
  variant: 'primary' | 'secondary'
}

export type PublicBanner = {
  id: string
  title: string
  subtitle: string | null
  imageUrl: string | null
  buttons: BannerButton[]
}

export type Banner = PublicBanner & {
  active: boolean
  order: number
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
}

export type CreateBannerBody = {
  title: string
  subtitle?: string | null
  active?: boolean
  order?: number
  buttons?: BannerButton[]
  startDate?: string | null
  endDate?: string | null
}

export function useBanners() {
  return useQuery<PublicBanner[]>({
    queryKey: ['banners'],
    queryFn: () =>
      fetch(`${API_BASE}/banners`)
        .then(r => r.json())
        .then(d => Array.isArray(d) ? d : (d.data ?? [])),
  })
}

export function useAdminBanners() {
  return useQuery<Banner[]>({
    queryKey: ['admin', 'banners'],
    queryFn: () =>
      apiFetch('/admin/banners').then(r => r.json()).then(d => Array.isArray(d) ? d : (d.data ?? [])),
  })
}

export function useCreateBanner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateBannerBody) =>
      apiFetch('/admin/banners', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] })
    },
  })
}

export function useUpdateBanner(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<CreateBannerBody>) =>
      apiFetch(`/admin/banners/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] })
    },
  })
}

export function useDeleteBanner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/banners/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] })
    },
  })
}

export function useUploadBannerImage(bannerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiUpload(`/admin/banners/${bannerId}/image`, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] })
      queryClient.invalidateQueries({ queryKey: ['banners'] })
    },
  })
}

export function useReorderBanners() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (order: string[]) =>
      apiFetch('/admin/banners/reorder', { method: 'PATCH', body: JSON.stringify({ order }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] })
      queryClient.invalidateQueries({ queryKey: ['banners'] })
    },
  })
}
