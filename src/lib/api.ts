function handleUnauthorized(status: number) {
  if (status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token')
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    handleUnauthorized(res.status)
    const data = await res.clone().json().catch(() => null)
    throw new Error(data?.error ?? data?.message ?? `HTTP ${res.status}`)
  }
  return res
}

export async function apiUpload(path: string, file: File, field = 'file'): Promise<Response> {
  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append(field, file)
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    handleUnauthorized(res.status)
    const data = await res.clone().json().catch(() => null)
    throw new Error(data?.error ?? data?.message ?? `HTTP ${res.status}`)
  }
  return res
}
