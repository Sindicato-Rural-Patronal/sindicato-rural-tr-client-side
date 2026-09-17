import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiUpload, API_BASE } from '@/lib/api'

// Galerias de imagens da página Sobre (História do Sindicato, FAEP, Patrulha Rural…).
// Conteúdo do site → mesmas permissões dos banners (*_BANNER).

export type GalleryPhoto = {
  id: string
  albumId: string
  url: string
  caption: string | null
  order: number
  createdAt: string
}

export type GalleryAlbum = {
  id: string
  title: string
  description: string | null
  linkUrl: string | null
  isActive: boolean
  order: number
  createdAt: string
  updatedAt: string
  photos: GalleryPhoto[]
}

export type GalleryAlbumInput = {
  title?: string
  description?: string | null
  linkUrl?: string | null
  isActive?: boolean
}

const ADMIN_KEY = ['admin', 'galleries'] as const

// Público: só galerias ativas com foto. Fetch cru (sem token), como as cotações.
export function usePublicGalleries() {
  return useQuery<GalleryAlbum[]>({
    queryKey: ['galleries'],
    queryFn: () => fetch(`${API_BASE}/galleries`).then(r => (r.ok ? r.json() : [])),
  })
}

export function useAdminGalleries() {
  return useQuery<GalleryAlbum[]>({
    queryKey: ADMIN_KEY,
    queryFn: () => apiFetch('/admin/galleries').then(r => r.json()),
  })
}

// Devolve a promise do refetch (quem reordena espera a lista nova chegar).
function useInvalidate() {
  const qc = useQueryClient()
  return () => Promise.all([
    qc.invalidateQueries({ queryKey: ADMIN_KEY }),
    qc.invalidateQueries({ queryKey: ['galleries'] }),
  ])
}

export function useCreateGallery() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: GalleryAlbumInput) =>
      apiFetch('/admin/galleries', { method: 'POST', body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { invalidate() },
  })
}

export function useUpdateGallery() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: GalleryAlbumInput }) =>
      apiFetch(`/admin/galleries/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { invalidate() },
  })
}

export function useDeleteGallery() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/galleries/${id}`, { method: 'DELETE' }),
    onSuccess: () => { invalidate() },
  })
}

export function useReorderGalleries() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (order: string[]) =>
      apiFetch('/admin/galleries/reorder', { method: 'PATCH', body: JSON.stringify({ order }) }),
    // Espera o refetch: isPending segue true e os botões de mover ficam travados até a ordem nova chegar
    onSettled: () => invalidate(),
  })
}

export function useUploadGalleryPhoto() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ albumId, file }: { albumId: string; file: File }) =>
      apiUpload(`/admin/galleries/${albumId}/photos`, file).then(r => r.json() as Promise<GalleryPhoto>),
    // Sem esperar: o envio de várias fotos em sequência não fica preso a cada refetch
    onSettled: () => { invalidate() },
  })
}

export function useUpdateGalleryPhoto() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ albumId, photoId, caption }: { albumId: string; photoId: string; caption: string | null }) =>
      apiFetch(`/admin/galleries/${albumId}/photos/${photoId}`, { method: 'PATCH', body: JSON.stringify({ caption }) }),
    onSuccess: () => { invalidate() },
  })
}

export function useDeleteGalleryPhoto() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ albumId, photoId }: { albumId: string; photoId: string }) =>
      apiFetch(`/admin/galleries/${albumId}/photos/${photoId}`, { method: 'DELETE' }),
    onSuccess: () => { invalidate() },
  })
}

export function useReorderGalleryPhotos() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ albumId, order }: { albumId: string; order: string[] }) =>
      apiFetch(`/admin/galleries/${albumId}/photos/reorder`, { method: 'PATCH', body: JSON.stringify({ order }) }),
    onSettled: () => invalidate(),
  })
}
