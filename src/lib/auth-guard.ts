import { redirect } from '@tanstack/react-router'

export async function requirePermission(perm: string) {
  const token = localStorage.getItem('token')
  if (!token) throw redirect({ to: '/login' })

  let permitions: string[] = []
  try {
    const res = await fetch('/api/admin/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const me = await res.json() as { permitions: string[] }
      permitions = me.permitions ?? []
    }
  } catch {
    // network error → deixa permitions vazio → vai redirecionar abaixo
  }

  if (!permitions.includes(perm)) {
    throw redirect({ to: '/admin/dashboard' })
  }
}
