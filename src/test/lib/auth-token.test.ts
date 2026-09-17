import { describe, it, expect } from 'vitest'
import {
  afterLoginPath,
  decodeTokenPayload,
  isTokenValid,
  loginHref,
  safeAdminRedirect,
  shouldRenewToken,
} from '@/lib/auth-token'

// Monta um JWT falso (a assinatura não importa no navegador) em base64url.
function fakeToken(payload: Record<string, unknown>): string {
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.assinatura`
}

const HOUR = 60 * 60 * 1000
const NOW = Date.UTC(2026, 8, 17, 12, 0, 0)
const sec = (ms: number) => Math.floor(ms / 1000)

describe('decodeTokenPayload', () => {
  it('lê payload base64url (com - e _ e sem padding)', () => {
    const token = fakeToken({ userId: 'a', username: '?>?>?~~~', exp: 123 })
    expect(token.split('.')[1]).toMatch(/[-_]/)
    expect(decodeTokenPayload(token)).toMatchObject({ username: '?>?>?~~~', exp: 123 })
  })

  it('devolve null para texto que não é JWT', () => {
    expect(decodeTokenPayload('abc')).toBeNull()
    expect(decodeTokenPayload('a.%%%.c')).toBeNull()
  })
})

describe('isTokenValid', () => {
  it('válido antes de exp e inválido depois', () => {
    const token = fakeToken({ exp: sec(NOW + HOUR) })
    expect(isTokenValid(token, NOW)).toBe(true)
    expect(isTokenValid(token, NOW + 2 * HOUR)).toBe(false)
  })

  it('sem token ou malformado → inválido', () => {
    expect(isTokenValid(null, NOW)).toBe(false)
    expect(isTokenValid('', NOW)).toBe(false)
    expect(isTokenValid('x.y', NOW)).toBe(false)
  })
})

describe('shouldRenewToken', () => {
  const iat = sec(NOW)
  const token = fakeToken({ iat, exp: iat + 8 * 60 * 60 })

  it('não renova na primeira metade da validade', () => {
    expect(shouldRenewToken(token, NOW + 1 * HOUR)).toBe(false)
    expect(shouldRenewToken(token, NOW + 3.9 * HOUR)).toBe(false)
  })

  it('renova depois da metade, enquanto não venceu', () => {
    expect(shouldRenewToken(token, NOW + 4.1 * HOUR)).toBe(true)
    expect(shouldRenewToken(token, NOW + 7.9 * HOUR)).toBe(true)
  })

  it('não renova token vencido nem sem iat/exp', () => {
    expect(shouldRenewToken(token, NOW + 9 * HOUR)).toBe(false)
    expect(shouldRenewToken(fakeToken({ exp: iat + 100 }), NOW)).toBe(false)
    expect(shouldRenewToken(null, NOW)).toBe(false)
  })
})

describe('safeAdminRedirect / afterLoginPath', () => {
  it('aceita telas do painel com filtros', () => {
    expect(safeAdminRedirect('/admin')).toBe('/admin')
    expect(safeAdminRedirect('/admin/usuarios?tab=empresas&page=2')).toBe('/admin/usuarios?tab=empresas&page=2')
    expect(safeAdminRedirect('/admin?x=1')).toBe('/admin?x=1')
  })

  it('recusa .. e // dentro do caminho do painel', () => {
    expect(safeAdminRedirect('/admin/..//evil.com')).toBeUndefined()
    expect(safeAdminRedirect('/admin//evil.com')).toBeUndefined()
    expect(safeAdminRedirect('/admin/../login')).toBeUndefined()
  })

  it('recusa endereços externos, // e caminhos fora do painel', () => {
    const bad: unknown[] = [
      'https://evil.com/admin',
      '//evil.com/admin',
      '/\\evil.com',
      '/admin\\@evil.com',
      'javascript:alert(1)',
      '/login',
      '/',
      '/administrador',
      '/cursos',
      'admin/cursos',
      ' /admin',
      undefined,
      123,
    ]
    for (const value of bad) {
      expect(safeAdminRedirect(value)).toBeUndefined()
    }
  })

  it('sem destino seguro vai para o painel geral', () => {
    expect(afterLoginPath('/admin/cursos')).toBe('/admin/cursos')
    expect(afterLoginPath('https://evil.com')).toBe('/admin/dashboard')
    expect(afterLoginPath(undefined)).toBe('/admin/dashboard')
  })
})

describe('loginHref', () => {
  it('guarda a tela do painel no ?redirect', () => {
    expect(loginHref('/admin/usuarios?tab=empresas')).toBe('/login?redirect=%2Fadmin%2Fusuarios%3Ftab%3Dempresas')
  })

  it('fora do painel vai para o login sem redirect', () => {
    expect(loginHref('/cursos/123')).toBe('/login')
  })
})
