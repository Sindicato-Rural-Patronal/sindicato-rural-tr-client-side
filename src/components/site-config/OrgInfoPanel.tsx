import { useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Loader2, Save } from 'lucide-react'
import { useAdminSiteSettings, useUpdateSiteSettings, type SiteSettings } from '@/hooks/useSiteSettings'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { apiErrorMessage } from '@/lib/api-error-message'
import { maskCEP, maskPhone } from '@/utils/masks'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

type OrgFields = Pick<
  SiteSettings,
  'orgPhone' | 'orgEmail' | 'orgStreet' | 'orgDistrict' | 'orgCity' | 'orgState' | 'orgZip' | 'orgHours' | 'orgMapQuery' | 'aboutText'
>

const FIELDS: (keyof OrgFields)[] = [
  'orgPhone', 'orgEmail', 'orgStreet', 'orgDistrict', 'orgCity', 'orgState', 'orgZip', 'orgHours', 'orgMapQuery', 'aboutText',
]

function Field({ id, label, hint, children, className = '' }: {
  id: string; label: string; hint?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// Dados do sindicato mostrados no rodapé, na página Contato e nos convênios,
// e o texto da página Sobre.
export function OrgInfoPanel({ canEdit }: { canEdit: boolean }) {
  const { data, isLoading, isError } = useAdminSiteSettings()
  return (
    <div className="flex flex-col gap-4">
      {isError && <LoadErrorBanner message="Erro ao carregar os dados do sindicato." />}
      {isLoading && <Skeleton className="h-96 w-full rounded-xl" />}
      {data && <OrgInfoForm initial={data} canEdit={canEdit} />}
    </div>
  )
}

function OrgInfoForm({ initial, canEdit }: { initial: SiteSettings; canEdit: boolean }) {
  const update = useUpdateSiteSettings()
  const start = Object.fromEntries(FIELDS.map(k => [k, initial[k] ?? ''])) as OrgFields
  const [form, setForm] = useState<OrgFields>(start)
  const [saved, setSaved] = useState(start)
  const dirty = FIELDS.some(k => form[k] !== saved[k])
  useUnsavedGuard(dirty && !update.isPending)

  const set = (k: keyof OrgFields, v: string) => setForm(f => ({ ...f, [k]: v }))
  const d = !canEdit || update.isPending
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.orgMapQuery || `${form.orgStreet} ${form.orgCity} ${form.orgState}`)}`

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      const body = Object.fromEntries(FIELDS.map(k => [k, form[k].trim()])) as OrgFields
      await update.mutateAsync(body)
      setSaved(body)
      setForm(body)
      toast.success('Dados do sindicato salvos.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao salvar os dados do sindicato.'))
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Contato e endereço</CardTitle>
          <p className="text-xs text-muted-foreground">Aparecem no rodapé do site, na página Contato e nas páginas dos convênios.</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <Field id="org-phone" label="Telefone" className="md:col-span-2">
            <Input id="org-phone" className="h-9" disabled={d} inputMode="tel" value={form.orgPhone}
              onChange={e => set('orgPhone', maskPhone(e.target.value))} placeholder="(44) 0000-0000" />
          </Field>
          <Field id="org-email" label="E-mail" className="md:col-span-4">
            <Input id="org-email" type="email" className="h-9" disabled={d} value={form.orgEmail}
              onChange={e => set('orgEmail', e.target.value)} />
          </Field>
          <Field id="org-street" label="Rua e número" className="md:col-span-4">
            <Input id="org-street" className="h-9" disabled={d} value={form.orgStreet}
              onChange={e => set('orgStreet', e.target.value)} placeholder="Rua José Tondato, 80" />
          </Field>
          <Field id="org-district" label="Bairro" className="md:col-span-2">
            <Input id="org-district" className="h-9" disabled={d} value={form.orgDistrict}
              onChange={e => set('orgDistrict', e.target.value)} />
          </Field>
          <Field id="org-city" label="Cidade" className="md:col-span-3">
            <Input id="org-city" className="h-9" disabled={d} value={form.orgCity}
              onChange={e => set('orgCity', e.target.value)} />
          </Field>
          <Field id="org-state" label="UF" className="md:col-span-1">
            <Input id="org-state" className="h-9" disabled={d} maxLength={2} value={form.orgState}
              onChange={e => set('orgState', e.target.value.replace(/[^a-z]/gi, '').toUpperCase())} />
          </Field>
          <Field id="org-zip" label="CEP" className="md:col-span-2">
            <Input id="org-zip" className="h-9" disabled={d} inputMode="numeric" value={form.orgZip}
              onChange={e => set('orgZip', maskCEP(e.target.value))} placeholder="00000-000" />
          </Field>
          <Field id="org-hours" label="Horário de atendimento" hint='Uma linha por horário, no formato "Dias: horário".' className="md:col-span-3">
            <Textarea id="org-hours" rows={3} disabled={d} value={form.orgHours}
              onChange={e => set('orgHours', e.target.value)} placeholder={'Segunda a Sexta: 08h às 17h\nSábado: 08h às 12h'} />
          </Field>
          <Field id="org-map" label="Busca do mapa" hint="O que o mapa da página Contato procura no Google Maps." className="md:col-span-3">
            <Input id="org-map" className="h-9" disabled={d} value={form.orgMapQuery}
              onChange={e => set('orgMapQuery', e.target.value)} placeholder="Sindicato Rural de Terra Roxa PR" />
            <a href={mapUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLink className="size-3" /> Conferir no Google Maps
            </a>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Página Sobre</CardTitle>
          <p className="text-xs text-muted-foreground">Texto de apresentação do sindicato. Deixe uma linha em branco entre os parágrafos.</p>
        </CardHeader>
        <CardContent>
          <Label htmlFor="org-about" className="sr-only">Texto da página Sobre</Label>
          <Textarea id="org-about" rows={8} disabled={d} maxLength={5000} value={form.aboutText}
            onChange={e => set('aboutText', e.target.value)} placeholder="Conte a história do sindicato, a missão e o que ele faz pelo produtor." />
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex items-center justify-end gap-3">
          {dirty && <span className="text-sm text-muted-foreground">Alterações não salvas</span>}
          <Button type="submit" disabled={!dirty || update.isPending}>
            {update.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salvar
          </Button>
        </div>
      )}
    </form>
  )
}
