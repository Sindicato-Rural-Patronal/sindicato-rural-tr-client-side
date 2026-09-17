import { useState } from 'react'
import { toast } from 'sonner'
import { FaFacebook, FaInstagram, FaWhatsapp } from 'react-icons/fa'
import type { IconType } from 'react-icons'
import { useTranslation } from 'react-i18next'
import { useAdminSiteSettings, useUpdateSiteSettings, type SiteSettings } from '@/hooks/useSiteSettings'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { apiErrorMessage } from '@/lib/api-error-message'
import { maskWhatsappInput, whatsappFieldFromStored, whatsappStoredFromField } from '@/lib/whatsapp-field'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

type SocialSettings = Pick<SiteSettings, 'facebook' | 'instagram' | 'whatsapp'>
const KEYS: (keyof SocialSettings)[] = ['facebook', 'instagram', 'whatsapp']

// Redes sociais do rodapé do site.
export function SocialLinksPanel({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useAdminSiteSettings()

  return (
    <div className="max-w-xl rounded-lg border border-border bg-card p-4 md:p-6">
      <p className="mb-4 text-sm text-muted-foreground">Links que aparecem no rodapé do site.</p>

      {isError && <LoadErrorBanner message={t('admin.settings.loadError')} />}

      {isLoading && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      )}
      {data && <SocialForm initial={data} canEdit={canEdit} />}
    </div>
  )
}

// Montado só com os dados carregados: o estado inicial já vem do servidor.
// O WhatsApp aparece como telefone no campo e é salvo como link https://wa.me/55….
function SocialForm({ initial, canEdit }: { initial: SocialSettings; canEdit: boolean }) {
  const { t } = useTranslation()
  const update = useUpdateSiteSettings()
  const start: SocialSettings = {
    facebook: initial.facebook ?? '',
    instagram: initial.instagram ?? '',
    whatsapp: whatsappFieldFromStored(initial.whatsapp),
  }
  const [form, setForm] = useState<SocialSettings>(start)
  const [saved, setSaved] = useState<SocialSettings>(start)
  const [whatsappError, setWhatsappError] = useState<string | null>(null)
  const dirty = KEYS.some(k => form[k] !== saved[k])
  useUnsavedGuard(dirty && !update.isPending)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const whatsapp = whatsappStoredFromField(form.whatsapp)
    if ('error' in whatsapp) {
      setWhatsappError(whatsapp.error)
      return
    }
    setWhatsappError(null)
    try {
      const body = { facebook: form.facebook.trim(), instagram: form.instagram.trim(), whatsapp: whatsapp.value }
      await update.mutateAsync(body)
      const next = { ...body, whatsapp: whatsappFieldFromStored(body.whatsapp) }
      setSaved(next)
      setForm(next)
      toast.success(t('admin.settings.saved'))
    } catch (err) {
      toast.error(apiErrorMessage(err, t('admin.settings.saveError')))
    }
  }

  const disabled = !canEdit || update.isPending

  const urlField = (key: 'facebook' | 'instagram', label: string, placeholder: string, Icon: IconType) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={key} className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" /> {label}
      </Label>
      <Input
        id={key}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="url"
      />
    </div>
  )

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      {urlField('facebook', 'Facebook', 'https://facebook.com/...', FaFacebook)}
      {urlField('instagram', 'Instagram', 'https://instagram.com/...', FaInstagram)}
      <p className="-mt-2 text-xs text-muted-foreground">{t('admin.settings.hint')}</p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="whatsapp" className="flex items-center gap-2 text-sm font-medium">
          <FaWhatsapp className="size-4 text-muted-foreground" /> WhatsApp
        </Label>
        <Input
          id="whatsapp"
          value={form.whatsapp}
          onChange={e => {
            setForm(f => ({ ...f, whatsapp: maskWhatsappInput(e.target.value) }))
            setWhatsappError(null)
          }}
          placeholder="(44) 99999-9999"
          disabled={disabled}
          inputMode="tel"
          aria-invalid={!!whatsappError || undefined}
          aria-describedby="whatsapp-hint"
        />
        {whatsappError ? (
          <p id="whatsapp-hint" className="text-xs text-destructive">{whatsappError}</p>
        ) : (
          <p id="whatsapp-hint" className="text-xs text-muted-foreground">
            Número com DDD. Também aceita um link do WhatsApp colado. Deixe em branco para ocultar do rodapé.
          </p>
        )}
      </div>

      {canEdit && (
        <div className="flex items-center justify-end gap-3 pt-2">
          {dirty && <span className="text-sm text-muted-foreground">Alterações não salvas</span>}
          <Button type="submit" disabled={!dirty || update.isPending}>
            {update.isPending ? t('admin.settings.saving') : t('admin.settings.save')}
          </Button>
        </div>
      )}
    </form>
  )
}
