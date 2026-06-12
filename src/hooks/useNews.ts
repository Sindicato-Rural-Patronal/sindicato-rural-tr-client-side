import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiUpload } from '@/lib/api'
import type { News } from '@/@types/news'

export type CreateNewsBody = {
  title: string
  content: string
  summary?: string
  status?: 'PUBLISHED' | 'UNPUBLISHED'
  publishedAt?: string
}

export type UpdateNewsBody = Partial<CreateNewsBody>

export function useNews() {
  return useQuery<News[]>({
    queryKey: ['news'],
    queryFn: () => apiFetch('/news').then(r => r.json()),
  })
}

export function useAdminNews() {
  return useQuery<News[]>({
    queryKey: ['admin', 'news'],
    queryFn: () => apiFetch('/admin/news').then(r => r.json()),
  })
}

export function useNewsDetail(id: string) {
  return useQuery<News>({
    queryKey: ['news', id],
    queryFn: () => apiFetch(`/news/${id}`).then(r => r.json()),
    enabled: !!id,
  })
}

export function useCreateNews() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateNewsBody) =>
      apiFetch('/news', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'news'] })
    },
  })
}

export function useUpdateNews(newsId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateNewsBody) =>
      apiFetch(`/news/${newsId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'news'] })
      queryClient.invalidateQueries({ queryKey: ['news', newsId] })
    },
  })
}

export function useDeleteNews() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (newsId: string) =>
      apiFetch(`/news/${newsId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'news'] })
    },
  })
}

export function useUploadNewsBanner(newsId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiUpload(`/news/${newsId}/banner`, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'news'] })
      queryClient.invalidateQueries({ queryKey: ['news', newsId] })
    },
  })
}

export function useUploadNewsBlockImage(newsId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiUpload(`/news/${newsId}/image`, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news', newsId] })
    },
  })
}
