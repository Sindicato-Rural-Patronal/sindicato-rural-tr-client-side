import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Handshake, ImageUp, Loader2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUpdateCompany, useUploadCompanyPartnerLogo, type Company } from '@/hooks/useCompanies'
import { apiErrorMessage } from '@/lib/api-error-message'

// Parceria pública: empresa marcada aparece em "Parcerias com" na home, com logo
// e link. Antes isso ficava no cadastro da pessoa.

export function CompanyPartnerPanel({ company, readOnly = false }: { company: Company; readOnly?: boolean }) {
  const updateM = useUpdateCompany(company.id)
  const uploadM = useUploadCompanyPartnerLogo(company.id)
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPartner, setIsPartner] = useState(company.isPartner)
  const [url, setUrl] = useState(company.partnerUrl ?? '')
  const [order, setOrder] = useState(company.partnerOrder != null ? String(company.partnerOrder) : '')

  const dirty =
    isPartner !== company.isPartner ||
    (url.trim() || null) !== company.partnerUrl ||
    (order === '' ? null : Number(order)) !== company.partnerOrder

  async function handleSave() {
    if (url.trim() && !/^https?:\/\//i.test(url.trim())) { toast.error('Link do parceiro: comece com https://'); return }
    try {
      await updateM.mutateAsync({
        isPartner,
        partnerUrl: url.trim() || null,
        partnerOrder: order === '' ? null : Math.max(0, Number.parseInt(order, 10) || 0),
      })
      toast.success(isPartner ? 'Parceria salva. A empresa aparece na página inicial.' : 'Empresa não aparece mais como parceira.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao salvar parceria.'))
    }
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await uploadM.mutateAsync(file)
      toast.success('Logo do parceiro atualizado.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao enviar o logo.'))
    }
  }

  async function handleRemoveLogo() {
    if (!window.confirm('Remover o logo do parceiro?')) return
    try {
      await updateM.mutateAsync({ partnerLogo: null })
      toast.success('Logo removido.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao remover o logo.'))
    }
  }

  const d = readOnly || updateM.isPending

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm"><Handshake className="size-4" /> Parceria</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" checked={isPartner} disabled={d}
            onChange={e => setIsPartner(e.target.checked)} />
          <span>Exibir como parceira na página inicial</span>
        </label>

        {isPartner && (
          <div className="flex flex-col gap-4 pl-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="partner-url" className="text-xs font-medium text-muted-foreground">Link do parceiro</Label>
                <Input id="partner-url" className="h-9" disabled={d} placeholder="https://site-da-empresa.com.br"
                  value={url} onChange={e => setUrl(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partner-order" className="text-xs font-medium text-muted-foreground">Ordem de exibição</Label>
                <Input id="partner-order" className="h-9" type="number" min={0} disabled={d} placeholder="0"
                  value={order} onChange={e => setOrder(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Logo (reduzido para 300×150)</span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-12 w-24 items-center justify-center rounded border bg-muted">
                  {company.partnerLogo
                    ? <img src={company.partnerLogo} alt={`Logo ${company.name}`} className="max-h-full max-w-full object-contain" />
                    : <Handshake className="size-4 text-muted-foreground/50" />}
                </div>
                {!readOnly && (
                  <>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogo} />
                    <Button type="button" size="sm" variant="outline" disabled={uploadM.isPending} onClick={() => fileRef.current?.click()}>
                      {uploadM.isPending ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
                      {company.partnerLogo ? 'Trocar logo' : 'Enviar logo'}
                    </Button>
                    {company.partnerLogo && (
                      <Button type="button" size="sm" variant="ghost" disabled={d} onClick={handleRemoveLogo}>
                        <X className="size-4" /> Remover
                      </Button>
                    )}
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Sem logo, a home mostra só o nome.</p>
            </div>
          </div>
        )}

        {!readOnly && (
          <div className="flex justify-end">
            <Button type="button" onClick={handleSave} disabled={!dirty || updateM.isPending}>
              {updateM.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar parceria
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
