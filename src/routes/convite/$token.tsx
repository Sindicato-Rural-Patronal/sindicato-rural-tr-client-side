import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { useInvite, useAcceptInvite } from '@/hooks/useInvite'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Leaf, ShieldCheck, XCircle, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/convite/$token')({
  component: Convite,
})

function Convite() {
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const { data: invite, isLoading, isError, error } = useInvite(token)
  const accept = useAcceptInvite(token)
  const [form, setForm] = useState({ username: '', password: '', confirm: '' })
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (form.username.trim().length < 3) { setErr('Usuário: mínimo 3 caracteres.'); return }
    if (form.password.length < 8) { setErr('Senha: mínimo 8 caracteres.'); return }
    if (form.password !== form.confirm) { setErr('As senhas não coincidem.'); return }
    try {
      await accept.mutateAsync({ username: form.username.trim(), password: form.password })
      toast.success('Acesso criado! Faça login.')
      navigate({ to: '/login' })
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Falha ao ativar o acesso'
      setErr(m)
      toast.error(m)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-brand">
            <Leaf className="size-4 text-white" />
          </div>
          <span className="font-bold text-foreground">Sindicato Rural de Terra Roxa</span>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <span className="text-sm">Verificando convite…</span>
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <XCircle className="mx-auto mb-3 size-8 text-destructive" />
            <p className="text-sm font-medium text-foreground">Convite inválido</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : 'Este convite não é válido, expirou ou já foi usado.'}
            </p>
            <Link to="/login" className="mt-4 inline-block text-xs text-primary hover:underline">
              Ir para o login
            </Link>
          </div>
        )}

        {invite && (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-foreground">Ativar seu acesso</p>
                <p className="text-xs text-muted-foreground">
                  {invite.userName} — regra <strong>{invite.ruleName}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inv-user">Usuário (login) *</Label>
                <Input
                  id="inv-user"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  autoComplete="username"
                  placeholder="ex: joao.silva"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inv-pass">Senha *</Label>
                <Input
                  id="inv-pass"
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  autoComplete="new-password"
                  placeholder="mínimo 8 caracteres"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inv-confirm">Confirmar senha *</Label>
                <Input
                  id="inv-confirm"
                  type="password"
                  value={form.confirm}
                  onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button type="submit" disabled={accept.isPending}>
                {accept.isPending ? 'Ativando…' : 'Criar meu acesso'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
