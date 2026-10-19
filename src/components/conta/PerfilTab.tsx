// Aba "Perfil" de Minha conta (/admin/minha-conta): foto, nome, usuário e senha.
// Fica fora do arquivo de rota, que só exporta `Route`.
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Camera, Shield } from 'lucide-react'
import { useMe, useUpdateMe, useUploadMyAvatar, type AdminMe } from '@/hooks/useAdmin'
import { ApiError } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error-message'
import { resizeToSquare } from '@/utils/resize-image'
import { upperNoAccents } from '@/utils/text-format'
import { InitialsAvatar } from '@/components/InitialsAvatar'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { PasswordInput } from '@/components/PasswordInput'
import { PasswordStrengthHint } from '@/components/PasswordStrengthHint'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

/** Mesmo mínimo do backend (PATCH /admin/me). */
export const MIN_PASSWORD_LENGTH = 8

// Respostas 400 do PATCH /admin/me sobre a senha atual (textos do backend, já
// em português). Vão para baixo do campo "Senha atual", não só para o toast.
const CURRENT_PASSWORD_ERRORS = new Set([
  'Informe a senha atual para trocar a senha.',
  'Senha atual incorreta.',
])

export function PerfilTab() {
  const { data: me, isLoading, isError, isFetching, refetch } = useMe()

  if (!me && isError) {
    return (
      <LoadErrorRetry
        message="Não foi possível carregar os seus dados."
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    )
  }

  if (isLoading || !me) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
      </div>
    )
  }

  // Só monta com os dados carregados; o refetch após salvar não reinicia os campos.
  return <PerfilForm key={me.userId} me={me} />
}

function PerfilForm({ me }: { me: AdminMe }) {
  const update = useUpdateMe()
  const uploadAvatar = useUploadMyAvatar()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const currentRef = useRef<HTMLInputElement>(null)
  const newRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(me.name)
  const [username, setUsername] = useState(me.username)
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [currentError, setCurrentError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const resized = await resizeToSquare(file)
      await uploadAvatar.mutateAsync(resized)
      toast.success('Foto atualizada!')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao enviar a foto.'))
    }
  }

  const changingPassword = password.trim() !== ''
  const passwordMismatch = changingPassword && password !== confirm

  async function handleSave() {
    setCurrentError(null)
    setPasswordError(null)
    if (changingPassword) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setPasswordError(`A senha nova precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
        newRef.current?.focus()
        return
      }
      if (passwordMismatch) return
      // Trocar a senha pede a atual (o backend recusa sem ela): confere aqui
      // antes, para não gastar uma das tentativas do limite.
      if (!currentPassword) {
        setCurrentError('Informe a senha atual para trocar a senha.')
        currentRef.current?.focus()
        return
      }
    }

    const body: { name?: string; username?: string; password?: string; currentPassword?: string } = {}
    if (name.trim() && name !== me.name) body.name = name.trim()
    if (username.trim() && username !== me.username) body.username = username.trim()
    if (changingPassword) {
      body.password = password
      body.currentPassword = currentPassword
    }
    if (Object.keys(body).length === 0) { toast.info('Nada para salvar.'); return }
    try {
      await update.mutateAsync(body)
      toast.success(changingPassword ? 'Senha trocada e dados atualizados!' : 'Dados atualizados!')
      setCurrentPassword(''); setPassword(''); setConfirm('')
    } catch (e) {
      const msg = apiErrorMessage(e, 'Erro ao salvar seus dados.')
      if (e instanceof ApiError && e.status === 400 && CURRENT_PASSWORD_ERRORS.has(msg)) {
        setCurrentError(msg)
        currentRef.current?.focus()
      }
      toast.error(msg)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={uploadAvatar.isPending}
          className="group relative rounded-full disabled:opacity-60"
          aria-label="Alterar foto"
          title="Alterar foto"
        >
          <InitialsAvatar name={me.name} avatar={me.avatar ?? undefined} size="lg" />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-4" />
          </span>
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
        <div>
          <p className="font-medium text-foreground">{me.name}</p>
          <Badge variant="outline" className="mt-1 gap-1 text-muted-foreground">
            <Shield className="size-3" /> {me.ruleName}
          </Badge>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadAvatar.isPending}
            className="mt-1 block text-xs text-primary hover:underline disabled:opacity-60"
          >
            {uploadAvatar.isPending ? 'Enviando...' : 'Alterar foto'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mc-name">Nome</Label>
        <Input id="mc-name" value={name} onChange={e => setName(upperNoAccents(e.target.value))} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mc-username">Usuário</Label>
        <Input id="mc-username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
      </div>

      <div className="rounded-lg border border-border p-3 flex flex-col gap-3">
        <p className="text-sm font-medium">Trocar senha</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mc-current-password">Senha atual</Label>
          <PasswordInput
            id="mc-current-password"
            ref={currentRef}
            value={currentPassword}
            onChange={e => { setCurrentPassword(e.target.value); setCurrentError(null) }}
            autoComplete="current-password"
            aria-invalid={!!currentError}
            aria-describedby="mc-current-password-hint"
            className={currentError ? 'border-destructive focus-visible:ring-destructive' : undefined}
          />
          <p id="mc-current-password-hint" className={currentError ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
            {currentError ?? 'Só é pedida para trocar a senha.'}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mc-password">Nova senha</Label>
          <PasswordInput
            id="mc-password"
            ref={newRef}
            value={password}
            onChange={e => { setPassword(e.target.value); setPasswordError(null) }}
            placeholder="Deixar em branco para manter"
            autoComplete="new-password"
            aria-invalid={!!passwordError}
            className={passwordError ? 'border-destructive focus-visible:ring-destructive' : undefined}
          />
          {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
          {/* Só orientação: senha fraca continua podendo ser salva. */}
          <PasswordStrengthHint password={password} context={{ username, name }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mc-confirm">Confirmar nova senha</Label>
          <PasswordInput
            id="mc-confirm"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repita a nova senha"
            autoComplete="new-password"
            disabled={!changingPassword}
            className={passwordMismatch ? 'border-destructive focus-visible:ring-destructive' : undefined}
          />
          {passwordMismatch
            ? <p className="text-xs text-destructive">As senhas não coincidem.</p>
            : changingPassword && confirm.trim() !== ''
              ? <p className="text-xs text-emerald-600 dark:text-emerald-400">As senhas coincidem.</p>
              : <p className="text-xs text-muted-foreground">Mínimo {MIN_PASSWORD_LENGTH} caracteres. Repita para confirmar.</p>}
        </div>
      </div>

      <div className="pt-1">
        <Button onClick={handleSave} disabled={update.isPending || passwordMismatch}>
          {update.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  )
}
