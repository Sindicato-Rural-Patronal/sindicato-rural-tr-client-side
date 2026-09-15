import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { UserCog, Shield } from 'lucide-react'
import { useMe, useUpdateMe } from '@/hooks/useAdmin'
import { apiErrorMessage } from '@/lib/api-error-message'
import { InitialsAvatar } from '@/components/InitialsAvatar'
import { PasswordInput } from '@/components/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_admin/admin/minha-conta')({
  component: MinhaContaPage,
})

function MinhaContaPage() {
  const { data: me, isLoading } = useMe()
  const update = useUpdateMe()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    if (me) { setName(me.name); setUsername(me.username) }
  }, [me?.userId])

  const passwordMismatch = password.trim() !== '' && password !== confirm

  async function handleSave() {
    if (passwordMismatch) return
    const body: { name?: string; username?: string; password?: string } = {}
    if (me && name.trim() && name !== me.name) body.name = name.trim()
    if (me && username.trim() && username !== me.username) body.username = username.trim()
    if (password.trim()) body.password = password
    if (Object.keys(body).length === 0) { toast.info('Nada para salvar.'); return }
    try {
      await update.mutateAsync(body)
      toast.success('Dados atualizados!')
      setPassword(''); setConfirm('')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao salvar seus dados.'))
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <UserCog className="size-6" /> Minha conta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Edite seus próprios dados e troque sua senha.</p>
      </div>

      <div className="max-w-xl rounded-lg border border-border bg-card p-4 md:p-6">
        {isLoading || !me ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <InitialsAvatar name={me.name} avatar={me.avatar ?? undefined} size="lg" />
              <div>
                <p className="font-medium text-foreground">{me.name}</p>
                <Badge variant="outline" className="mt-1 gap-1 text-muted-foreground">
                  <Shield className="size-3" /> {me.ruleName}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mc-name">Nome</Label>
              <Input id="mc-name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mc-username">Usuário</Label>
              <Input id="mc-username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
            </div>

            <div className="rounded-lg border border-border p-3 flex flex-col gap-3">
              <p className="text-sm font-medium">Trocar senha</p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mc-password">Nova senha</Label>
                <PasswordInput id="mc-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Deixar em branco para manter" autoComplete="new-password" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mc-confirm">Confirmar nova senha</Label>
                <PasswordInput
                  id="mc-confirm"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                  disabled={password.trim() === ''}
                  className={passwordMismatch ? 'border-destructive focus-visible:ring-destructive' : undefined}
                />
                {passwordMismatch
                  ? <p className="text-xs text-destructive">As senhas não coincidem.</p>
                  : password.trim() !== '' && confirm.trim() !== ''
                    ? <p className="text-xs text-emerald-600 dark:text-emerald-400">As senhas coincidem.</p>
                    : <p className="text-xs text-muted-foreground">Mínimo 8 caracteres. Repita para confirmar.</p>}
              </div>
            </div>

            <div className="pt-1">
              <Button onClick={handleSave} disabled={update.isPending || passwordMismatch}>
                {update.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
