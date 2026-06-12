import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { authenticateUser } from '@/hooks/use-users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Leaf, Lock, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function isTokenValid(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(atob(parts[1])) as { exp?: number }
    if (payload.exp === undefined) return true
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    const token = localStorage.getItem('token')
    if (token && isTokenValid(token)) {
      throw redirect({ to: '/admin' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { login } = useAuth()
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const token = await authenticateUser(username, password)
      login(token)
      window.location.replace('/admin/cursos')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.errorDefault'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — image + branding */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-10 lg:flex">
        <img
          src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&h=900&fit=crop"
          alt="Agricultural field"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Leaf className="size-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white leading-tight">
            Sindicato Rural<br />
            <span className="text-white/80 text-sm font-normal">de Terra Roxa</span>
          </span>
        </div>

        <div className="relative z-10">
          <blockquote className="text-white">
            <p className="text-2xl font-bold leading-snug">{t('login.tagline')}</p>
            <footer className="mt-4 text-sm text-white/70">{t('login.restricted')}</footer>
          </blockquote>
        </div>

        <div className="relative z-10 flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-1 w-8 rounded-full bg-white/30" />
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary">
            <Leaf className="size-4 text-white" />
          </div>
          <span className="font-bold text-foreground">Sindicato Rural de Terra Roxa</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">{t('login.welcome')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                {t('login.username')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="seu.usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                {t('login.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-9"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5">
                <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('login.loading')}
                </span>
              ) : t('login.submit')}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            {t('login.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </div>
  )
}
