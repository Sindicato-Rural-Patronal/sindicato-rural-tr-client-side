// Leitura do JWT do admin no navegador (sem validar assinatura — quem valida é
// o backend) e regras de sessão: validade, renovação e volta após o login.

export const DEFAULT_AFTER_LOGIN = '/admin/dashboard'

type TokenPayload = { exp?: number; iat?: number }

// O payload do JWT é base64url (usa - e _ e não tem padding): converte antes do atob.
export function decodeTokenPayload(token: string): TokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const payload: unknown = JSON.parse(atob(padded))
    return payload && typeof payload === 'object' ? (payload as TokenPayload) : null
  } catch {
    return null
  }
}

export function isTokenValid(token: string | null | undefined, now = Date.now()): boolean {
  if (!token) return false
  const payload = decodeTokenPayload(token)
  if (!payload) return false
  if (payload.exp === undefined) return true
  return payload.exp * 1000 > now
}

// Renova quando já passou da metade da validade e ainda não venceu.
export function shouldRenewToken(token: string | null | undefined, now = Date.now()): boolean {
  if (!token) return false
  const payload = decodeTokenPayload(token)
  if (typeof payload?.exp !== 'number' || typeof payload.iat !== 'number') return false
  const expiresAt = payload.exp * 1000
  const lifetime = expiresAt - payload.iat * 1000
  if (expiresAt <= now || lifetime <= 0) return false
  return expiresAt - now < lifetime / 2
}

// Só aceita voltar para telas do painel (caminho interno começando em /admin).
// Qualquer outra coisa (URL de outro site, //host, texto solto) é ignorada.
export function safeAdminRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  if (!/^\/admin(?:[/?#]|$)/.test(value)) return undefined
  if (/[\\\s]/.test(value) || value.includes('..') || value.includes('//')) return undefined
  return value
}

export function afterLoginPath(redirect: unknown): string {
  return safeAdminRedirect(redirect) ?? DEFAULT_AFTER_LOGIN
}

// Endereço do login guardando a tela atual para voltar depois de entrar.
export function loginHref(from: string): string {
  const redirect = safeAdminRedirect(from)
  return redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'
}
