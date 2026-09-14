import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, API_BASE } from '@/lib/api'

export type SocialSettings = {
  facebook: string
  instagram: string
  whatsapp: string
}

/** Público: redes sociais para o rodapé. Fetch direto (endpoint sem auth). */
export function usePublicSocial() {
  return useQuery<SocialSettings>({
    queryKey: ['site-settings', 'public'],
    queryFn: () => fetch(`${API_BASE}/site-settings`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  })
}

/** Admin: valores atuais para o formulário de Configurações. */
export function useAdminSocial() {
  return useQuery<SocialSettings>({
    queryKey: ['site-settings', 'admin'],
    queryFn: () => apiFetch('/admin/site-settings').then(r => r.json()),
  })
}

export function useUpdateSocial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<SocialSettings>) =>
      apiFetch('/admin/site-settings', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-settings'] })
    },
  })
}
