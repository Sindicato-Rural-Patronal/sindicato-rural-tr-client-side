import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Handshake, ImageUp, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useUpdateCompany, useUploadCompanyPartnerLogo, companyDisplayName, type Company } from '@/hooks/useCompanies'
import { apiErrorMessage } from '@/lib/api-error-message'

// Link e logo de uma empresa parceira. Montado com `key` pela lista, então o
// estado inicial vem sempre da empresa atual.
export function PartnerEditDialog({ company, onClose }: { company: Company; onClose: () => void }) {
  const updateM = useUpdateCompany(company.id)
  const uploadM = useUploadCompanyPartnerLogo(company.id)
  const fileRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(company.partnerUrl ?? '')
  const name = companyDisplayName(company)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const link = url.trim()
    if (link && !/^https?:\/\//i.test(link)) { toast.error('Link: comece com https://'); return }
    try {
      if ((link || null) !== company.partnerUrl) await updateM.mutateAsync({ partnerUrl: link || null })
      toast.success('Parceiro salvo.')
      onClose()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao salvar o parceiro.'))
    }
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await uploadM.mutateAsync(file)
      toast.success('Logo atualizado.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao enviar o logo.'))
    }
  }

  async function handleRemoveLogo() {
    try {
      await updateM.mutateAsync({ partnerLogo: null })
      toast.success('Logo removido.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao remover o logo.'))
    }
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>Logo e link que aparecem em "Parcerias com" na página inicial.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Logo</span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-14 w-28 items-center justify-center rounded-md border bg-white px-2">
                {company.partnerLogo
                  ? <img src={company.partnerLogo} alt={`Logo ${name}`} className="max-h-full max-w-full object-contain" />
                  : <Handshake className="size-5 text-muted-foreground/50" />}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                aria-label={`Enviar logo de ${name}`} onChange={handleLogo} />
              <Button type="button" size="sm" variant="outline" disabled={uploadM.isPending} onClick={() => fileRef.current?.click()}>
                {uploadM.isPending ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
                {company.partnerLogo ? 'Trocar logo' : 'Enviar logo'}
              </Button>
              {company.partnerLogo && (
                <Button type="button" size="sm" variant="ghost" disabled={updateM.isPending} onClick={handleRemoveLogo}>
                  <X className="size-4" /> Remover
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Reduzido para 300×150. Sem logo, a home mostra só o nome.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partner-url">Link do parceiro</Label>
            <Input id="partner-url" className="h-9" placeholder="https://site-da-empresa.com.br" inputMode="url"
              value={url} onChange={e => setUrl(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
            <Button type="submit" disabled={updateM.isPending}>
              {updateM.isPending && <Loader2 className="size-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
