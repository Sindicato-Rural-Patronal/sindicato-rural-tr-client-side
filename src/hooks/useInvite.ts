import { useQuery, useMutation } from '@tanstack/react-query'
import { API_BASE } from '@/lib/api'

export type InviteInfo = { userName: string; ruleName: string }

export function useInvite(token: string) {
  return useQuery<InviteInfo>({
    queryKey: ['invite', token],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/invites/${token}`)
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        throw new Error(d?.error ?? 'Convite inválido')
      }
      return r.json()
    },
    retry: false,
    enabled: !!token,
  })
}

export function useAcceptInvite(token: string) {
  return useMutation({
    mutationFn: async (body: { username: string; password: string }) => {
      const r = await fetch(`${API_BASE}/invites/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => null)
        throw new Error(d?.error ?? 'Falha ao ativar o acesso')
      }
      return r.json()
    },
  })
}
