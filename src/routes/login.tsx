import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { loginErrorMessage } from '@/lib/login-error'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { authenticateUser } from '@/hooks/use-users'
import { afterLoginPath, isTokenValid, safeAdminRedirect } from '@/lib/auth-token'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Lock, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/login')({
  // ?redirect=/admin/... → tela para onde voltar depois de entrar (só telas do painel).
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: safeAdminRedirect(search.redirect),
  }),
  beforeLoad: ({ search }) => {
    if (isTokenValid(localStorage.getItem('token'))) {
      throw redirect({ href: afterLoginPath(search.redirect) })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { login } = useAuth()
  const { redirect: redirectTo } = Route.useSearch()
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
      window.location.replace(afterLoginPath(redirectTo))
    } catch (err) {
      setError(loginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Esquerda: a foto da lavoura com as cores dela (antes ia sob um véu verde
          forte e tinha três tracinhos decorativos). O texto fica todo no pé, que
          escurece em preto neutro para ele ler sobre qualquer foto; o resto da foto
          leva só um tom leve, para o céu claro não se confundir com o papel. */}
      <div className="relative hidden w-1/2 flex-col justify-end overflow-hidden bg-brand p-10 lg:flex">
        <img
          src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&h=900&fit=crop"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/25 via-45% to-black/10" aria-hidden />
        <div className="relative z-10 max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white p-1">
              <img src="/logo-full.png" alt="" width={44} height={44} className="object-contain" />
            </span>
            <span className="text-base font-semibold leading-tight text-white">
              Sindicato Rural<br />de Terra Roxa
            </span>
          </div>
          <p className="text-2xl font-semibold leading-snug text-white">{t('login.tagline')}</p>
          <p className="mt-3 text-sm text-white/85">{t('login.restricted')}</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <Link
          to="/"
          className="absolute left-6 top-6 flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0"
        >
          <ArrowLeft className="size-4" />
          {t('login.backToHome')}
        </Link>
        {/* Celular: a assinatura do Sindicato no lugar da foto */}
        <img
          src="/logo-icon.png"
          alt="Sindicato Rural de Terra Roxa – Paraná"
          width={130}
          height={48}
          className="mb-10 h-12 w-auto object-contain lg:hidden dark:brightness-0 dark:invert"
        />

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('login.welcome')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                {t('login.username')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint-foreground" aria-hidden />
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
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint-foreground" aria-hidden />
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
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2.5">
                <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" className="h-11 w-full" disabled={loading}>
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
