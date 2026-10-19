import { useMe } from './useAdmin'

export function usePermissions() {
  const { data: me, isLoading, isError, isFetching, refetch } = useMe()
  const perms = me?.permissions ?? []

  function can(perm: string): boolean {
    if (isLoading) return false
    return perms.includes(perm)
  }

  function cannot(perm: string): boolean {
    return !can(perm)
  }

  return {
    can,
    cannot,
    isLoading,
    perms,
    /**
     * Não foi possível saber as permissões (o /admin/me falhou e não há dado
     * guardado). `can` responde false, mas isso NÃO é "sem permissão": a tela
     * avisa e oferece `retry` (ver NoPermission).
     */
    isError: isError && !me,
    retrying: isFetching,
    retry: () => void refetch(),
  }
}
