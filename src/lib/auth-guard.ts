import { redirect } from '@tanstack/react-router'
import { API_BASE } from '@/lib/api'

export async function requirePermission(perm: string) {
  const token = localStorage.getItem('token')
  if (!token) throw redirect({ to: '/login' })

  let permissions: string[] = []
  try {
    const res = await fetch(`${API_BASE}/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const me = await res.json() as { permissions: string[] }
      permissions = me.permissions ?? []
    }
  } catch {
    // network error → deixa permissions vazio → vai redirecionar abaixo
  }

  if (!permissions.includes(perm)) {
    throw redirect({ to: '/admin/dashboard' })
  }
}
