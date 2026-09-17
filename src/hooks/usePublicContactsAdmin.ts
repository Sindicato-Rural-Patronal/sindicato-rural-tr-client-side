import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

// Contatos públicos ("Nossa Equipe" na página Contato): qualquer pessoa do
// cadastro, com cargo e ordem. Permissões de usuários.

export type AdminPublicContact = {
  id: string
  userDataId: string
  title: string | null
  order: number
  userData: { id: string; name: string; email: string | null; phone: string; avatar: string | null }
}

const KEY = ['admin', 'public-contacts'] as const

// Devolve a promise do refetch (quem reordena espera a lista nova chegar).
function useInvalidate() {
  const qc = useQueryClient()
  return () => Promise.all([
    qc.invalidateQueries({ queryKey: KEY }),
    qc.invalidateQueries({ queryKey: ['contacts'] }),
  ])
}

export function useAdminPublicContacts() {
  return useQuery<AdminPublicContact[]>({
    queryKey: KEY,
    queryFn: () => apiFetch('/admin/public-contacts').then(r => r.json()),
  })
}

export function useAddPublicContact() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: { userDataId: string; title: string | null }) =>
      apiFetch('/admin/public-contacts', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { invalidate() },
  })
}

export function useUpdatePublicContact() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string | null }) =>
      apiFetch(`/admin/public-contacts/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
    onSuccess: () => { invalidate() },
  })
}

export function useRemovePublicContact() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/public-contacts/${id}`, { method: 'DELETE' }),
    onSuccess: () => { invalidate() },
  })
}

export function useReorderPublicContacts() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (order: string[]) =>
      apiFetch('/admin/public-contacts/reorder', { method: 'PATCH', body: JSON.stringify({ order }) }),
    // Espera o refetch: isPending segue true e os botões de mover ficam travados até a ordem nova chegar
    onSettled: () => invalidate(),
  })
}
