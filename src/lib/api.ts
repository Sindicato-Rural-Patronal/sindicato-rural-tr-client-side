// Base da API. Em produção aponta pro backend direto (VITE_API_URL, embutido
// no build). Em dev fica '/api' e o proxy do Vite encaminha pro backend local.
export const API_BASE = import.meta.env.VITE_API_URL || '/api'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function handleUnauthorized(status: number) {
  if (status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
}

async function throwApiError(res: Response): Promise<never> {
  handleUnauthorized(res.status)
  const data = await res.clone().json().catch(() => null)
  throw new ApiError(res.status, data?.error ?? data?.message ?? `HTTP ${res.status}`)
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) await throwApiError(res)
  return res
}

export async function apiUpload(path: string, file: File, field = 'file'): Promise<Response> {
  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append(field, file)
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) await throwApiError(res)
  return res
}
