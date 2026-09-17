import { useState } from 'react'
import { toast } from 'sonner'
import { FaFacebook, FaInstagram, FaWhatsapp } from 'react-icons/fa'
import type { IconType } from 'react-icons'
import { useTranslation } from 'react-i18next'
import { useAdminSocial, useUpdateSocial, type SocialSettings } from '@/hooks/useSiteSettings'
import { apiErrorMessage } from '@/lib/api-error-message'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

// Redes sociais do rodapé do site.
export function SocialLinksPanel({ canEdit }: { canEdit: boolean }) {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useAdminSocial()

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
function SocialForm({ initial, canEdit }: { initial: SocialSettings; canEdit: boolean }) {
  const { t } = useTranslation()
  const update = useUpdateSocial()
  const [form, setForm] = useState<SocialSettings>({
    facebook: initial.facebook ?? '', instagram: initial.instagram ?? '', whatsapp: initial.whatsapp ?? '',
  })

  async function handleSave() {
    try {
      await update.mutateAsync(form)
      toast.success(t('admin.settings.saved'))
    } catch (e) {
      toast.error(apiErrorMessage(e, t('admin.settings.saveError')))
    }
  }

  const field = (key: keyof SocialSettings, label: string, placeholder: string, Icon: IconType) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={key} className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" /> {label}
      </Label>
      <Input
        id={key}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        disabled={!canEdit}
        inputMode="url"
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {field('facebook', 'Facebook', 'https://facebook.com/...', FaFacebook)}
      {field('instagram', 'Instagram', 'https://instagram.com/...', FaInstagram)}
      {field('whatsapp', 'WhatsApp', 'https://wa.me/55...', FaWhatsapp)}
      <p className="text-xs text-muted-foreground">{t('admin.settings.hint')}</p>
      {canEdit && (
        <div className="pt-2">
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? t('admin.settings.saving') : t('admin.settings.save')}
          </Button>
        </div>
      )}
    </div>
  )
}
