import { redirect } from '@tanstack/react-router'
import { ApiError } from '@/lib/api'
import { queryClient } from '@/lib/query-client'
import { shouldRetryQuery } from '@/lib/query-retry'
import { meQuery } from '@/hooks/useAdmin'

/**
 * Guarda de rota do painel: sem a permissão, volta para o Painel Geral.
 *
 * As permissões vêm do mesmo cache do useMe (`meQuery`). Falha ao conferir
 * (sem rede, servidor fora do ar) NÃO é "sem permissão": antes a lista ficava
 * vazia e a pessoa caía no Painel Geral sem explicação. Agora o erro sobe e o
 * roteador mostra a tela de erro com "Tentar de novo". Sessão vencida (401)
 * leva ao login.
 */
export async function requirePermission(perm: string) {
  if (!localStorage.getItem('token')) throw redirect({ to: '/login' })

  let permissions: string[]
  try {
    const me = await queryClient.fetchQuery({ ...meQuery, retry: shouldRetryQuery })
    permissions = me.permissions ?? []
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) throw redirect({ to: '/login' })
    throw new Error('Não foi possível conferir suas permissões.', { cause: err })
  }

  if (!permissions.includes(perm)) {
    throw redirect({ to: '/admin/dashboard' })
  }
}
