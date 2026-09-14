import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'
import { FaFacebook, FaInstagram, FaWhatsapp } from 'react-icons/fa'
import type { IconType } from 'react-icons'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/hooks/usePermissions'
import { useAdminSocial, useUpdateSocial, type SocialSettings } from '@/hooks/useSiteSettings'
import { apiErrorMessage } from '@/lib/api-error-message'
import { NoPermission } from '@/components/NoPermission'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_admin/admin/configuracoes')({
  component: ConfiguracoesPage,
})

const EMPTY: SocialSettings = { facebook: '', instagram: '', whatsapp: '' }

function ConfiguracoesPage() {
  const { t } = useTranslation()
  const { can, isLoading: permLoading } = usePermissions()
  const { data, isLoading, isError } = useAdminSocial()
  const update = useUpdateSocial()

  const [form, setForm] = useState<SocialSettings>(EMPTY)
  useEffect(() => {
    if (data) setForm({ facebook: data.facebook ?? '', instagram: data.instagram ?? '', whatsapp: data.whatsapp ?? '' })
  }, [data])

  if (!permLoading && !can('READ_BANNER')) {
    return <NoPermission message={t('admin.settings.noPermission')} />
  }

  const canEdit = can('UPDATE_BANNER')

  async function handleSave() {
    try {
      await update.mutateAsync(form)
      toast.success(t('admin.settings.saved'))
    } catch (e) {
      toast.error(apiErrorMessage(e, t('admin.settings.saveError')))
    }
  }

  const field = (
    key: keyof SocialSettings,
    label: string,
    placeholder: string,
    Icon: IconType,
  ) => (
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
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Settings className="size-6" /> {t('admin.settings.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.settings.subtitle')}</p>
      </div>

      <div className="max-w-xl rounded-lg border border-border bg-card p-4 md:p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('admin.settings.socialTitle')}
        </h2>

        {isError && <LoadErrorBanner message={t('admin.settings.loadError')} />}

        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
