import { useMe } from './useAdmin'

export function usePermissions() {
  const { data: me, isLoading } = useMe()
  const perms = me?.permissions ?? []

  function can(perm: string): boolean {
    if (isLoading) return false
    return perms.includes(perm)
  }

  function cannot(perm: string): boolean {
    return !can(perm)
  }

  return { can, cannot, isLoading, perms }
}
