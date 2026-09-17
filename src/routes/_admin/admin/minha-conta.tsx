import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { UserCog, Shield, Languages, Palette, Camera } from 'lucide-react'
import { useMe, useUpdateMe, useUploadMyAvatar, type AdminMe } from '@/hooks/useAdmin'
import { apiErrorMessage } from '@/lib/api-error-message'
import { resizeToSquare } from '@/utils/resize-image'
import { upperNoAccents } from '@/utils/text-format'
import { InitialsAvatar } from '@/components/InitialsAvatar'
import { PasswordInput } from '@/components/PasswordInput'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeSetting } from '@/components/ThemeSetting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export const Route = createFileRoute('/_admin/admin/minha-conta')({
  component: MinhaContaPage,
})

function PerfilTab() {
  const { data: me, isLoading } = useMe()

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

  const [name, setName] = useState(me.name)
  const [username, setUsername] = useState(me.username)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

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

  const passwordMismatch = password.trim() !== '' && password !== confirm

  async function handleSave() {
    if (passwordMismatch) return
    const body: { name?: string; username?: string; password?: string } = {}
    if (name.trim() && name !== me.name) body.name = name.trim()
    if (username.trim() && username !== me.username) body.username = username.trim()
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
  )
}

function PreferenciasTab() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label className="flex items-center gap-2"><Languages className="size-4 text-muted-foreground" /> Idioma</Label>
        <LanguageToggle variant="outline" />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="flex items-center gap-2"><Palette className="size-4 text-muted-foreground" /> Tema</Label>
        <ThemeSetting />
        <p className="text-xs text-muted-foreground">"Sistema" acompanha o tema do seu dispositivo.</p>
      </div>
    </div>
  )
}

function MinhaContaPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <UserCog className="size-6" /> Minha conta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Seus dados, senha e preferências.</p>
      </div>

      <div className="max-w-xl">
        <Tabs defaultValue="perfil">
          <TabsList>
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="preferencias">Preferências</TabsTrigger>
          </TabsList>
          <TabsContent value="perfil" className="mt-4 rounded-lg border border-border bg-card p-4 md:p-6">
            <PerfilTab />
          </TabsContent>
          <TabsContent value="preferencias" className="mt-4 rounded-lg border border-border bg-card p-4 md:p-6">
            <PreferenciasTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
