import { cloneElement, isValidElement, useId, useState } from 'react'
import { toast } from 'sonner'
import { Building2, Eye, Plus, Star, Trash2, TreePine } from 'lucide-react'
import { useCEPLookup, type CreatePropertyBody, type UserProperty } from '@/hooks/useAdmin'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { maskCEP } from '@/utils/masks'
import { upperNoAccents } from '@/utils/text-format'
import { apiErrorMessage } from '@/lib/api-error-message'

// Lista + cadastro de propriedades/endereços (urbano ou rural), com "principal".
// Usado no cadastro de pessoa e no de empresa: quem chama decide de onde vêm os
// dados e para onde vão as ações (hooks diferentes para cada dono).

type PropForm = {
  name: string
  registration: string
  address: {
    type: 'URBAN' | 'RURAL'
    street: string; number: string; neighborhood: string
    city: string; state: string; zipCode: string
    complement: string; notes: string
    localityName: string; road: string; km: string; lot: string; section: string
  }
}

const emptyPropForm = (): PropForm => ({
  name: '',
  registration: '',
  address: {
    type: 'URBAN',
    street: '', number: '', neighborhood: '',
    city: '', state: '', zipCode: '',
    complement: '', notes: '',
    localityName: '', road: '', km: '', lot: '', section: '',
  },
})

// Liga o rótulo ao campo (leitor de tela e clique no rótulo): injeta um id no
// filho, ou usa `htmlFor` quando o campo está dentro de um wrapper.
function FieldRow({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
  const autoId = useId()
  const id = htmlFor ?? autoId
  const control = !htmlFor && isValidElement<{ id?: string }>(children) && !children.props.id
    ? cloneElement(children, { id })
    : children
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</Label>
      {control}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

export type PropertiesManagerProps = {
  properties: UserProperty[]
  total: number
  loading: boolean
  primaryId: string | null
  onCreate: (body: CreatePropertyBody) => Promise<unknown>
  creating: boolean
  onDelete: (id: string) => Promise<unknown>
  deleting: boolean
  onSetPrimary: (id: string) => Promise<unknown>
  settingPrimary: boolean
  /** Ex.: paginação (a pessoa pagina; a empresa recebe tudo no detalhe). */
  footer?: React.ReactNode
  readOnly?: boolean
  /** Rótulo do nome no formulário. */
  nameLabel?: string
}

export function PropertiesManager({
  properties, total, loading, primaryId,
  onCreate, creating, onDelete, deleting, onSetPrimary, settingPrimary,
  footer, readOnly = false, nameLabel = 'Nome da propriedade *',
}: PropertiesManagerProps) {
  const cepLookup = useCEPLookup()
  const cepId = useId()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<PropForm>(emptyPropForm)
  const [deleteTarget, setDeleteTarget] = useState<UserProperty | null>(null)
  const [detailProp, setDetailProp] = useState<UserProperty | null>(null)

  async function setPrimary(propId: string) {
    try {
      await onSetPrimary(propId)
      toast.success('Propriedade principal definida.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao definir propriedade principal.'))
    }
  }

  function setAddr(k: keyof PropForm['address'], v: string) {
    setForm(prev => ({ ...prev, address: { ...prev.address, [k]: v } }))
  }

  async function handleCEP() {
    if (!form.address.zipCode) return
    try {
      const result = await cepLookup.mutateAsync(form.address.zipCode)
      setForm(prev => ({
        ...prev,
        address: {
          ...prev.address,
          street: result.street ?? prev.address.street,
          neighborhood: result.neighborhood ?? prev.address.neighborhood,
          city: result.city ?? prev.address.city,
          state: result.state ?? prev.address.state,
        },
      }))
    } catch {
      toast.error('CEP não encontrado.')
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      await onCreate({
        name: form.name,
        registration: form.registration || undefined,
        address: form.address,
      })
      setForm(emptyPropForm())
      setAdding(false)
      toast.success('Propriedade adicionada!')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao adicionar propriedade.'))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await onDelete(deleteTarget.id)
      setDeleteTarget(null)
      toast.success('Propriedade removida.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover propriedade.'))
    }
  }

  const inp = 'h-9'
  const isUrban = form.address.type === 'URBAN'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} propriedade(s) cadastrada(s)</p>
        {!readOnly && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Adicionar
          </Button>
        )}
      </div>

      {!loading && total === 0 && !adding && (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg text-center">
          <TreePine className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">Nenhuma propriedade cadastrada</p>
        </div>
      )}

      {adding && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldRow label={nameLabel}>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: upperNoAccents(e.target.value) }))} className={inp} autoFocus />
                </FieldRow>
                <FieldRow label="Matrícula">
                  <Input value={form.registration} onChange={e => setForm(p => ({ ...p, registration: e.target.value }))} className={inp} />
                </FieldRow>
              </div>

              <Separator />

              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Endereço da propriedade</p>
              <div className="flex gap-2">
                <Button type="button" variant={isUrban ? 'default' : 'outline'} size="sm" onClick={() => setAddr('type', 'URBAN')}>
                  <Building2 className="size-3.5 mr-1.5" /> Urbano
                </Button>
                <Button type="button" variant={!isUrban ? 'default' : 'outline'} size="sm" onClick={() => setAddr('type', 'RURAL')}>
                  <TreePine className="size-3.5 mr-1.5" /> Rural
                </Button>
              </div>

              {isUrban ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <FieldRow label="CEP" htmlFor={cepId}>
                    <div className="flex gap-2">
                      <Input id={cepId} className={inp} value={form.address.zipCode} onChange={e => setAddr('zipCode', maskCEP(e.target.value))} placeholder="00000-000" />
                      <Button type="button" size="sm" variant="outline" disabled={!form.address.zipCode || cepLookup.isPending} onClick={handleCEP} className="shrink-0">
                        {cepLookup.isPending ? '...' : 'Buscar'}
                      </Button>
                    </div>
                  </FieldRow>
                  <div className="sm:col-span-2">
                    <FieldRow label="Logradouro">
                      <Input className={inp} value={form.address.street} onChange={e => setAddr('street', upperNoAccents(e.target.value))} />
                    </FieldRow>
                  </div>
                  <FieldRow label="Número"><Input className={inp} value={form.address.number} onChange={e => setAddr('number', e.target.value)} /></FieldRow>
                  <FieldRow label="Bairro"><Input className={inp} value={form.address.neighborhood} onChange={e => setAddr('neighborhood', upperNoAccents(e.target.value))} /></FieldRow>
                  <FieldRow label="Cidade"><Input className={inp} value={form.address.city} onChange={e => setAddr('city', upperNoAccents(e.target.value))} /></FieldRow>
                  <FieldRow label="Estado"><Input className={inp} value={form.address.state} onChange={e => setAddr('state', upperNoAccents(e.target.value))} maxLength={2} placeholder="PR" /></FieldRow>
                  <FieldRow label="Complemento"><Input className={inp} value={form.address.complement} onChange={e => setAddr('complement', upperNoAccents(e.target.value))} /></FieldRow>
                  <FieldRow label="Observações"><Input className={inp} value={form.address.notes} onChange={e => setAddr('notes', upperNoAccents(e.target.value))} /></FieldRow>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <FieldRow label="Nome da localidade"><Input className={inp} value={form.address.localityName} onChange={e => setAddr('localityName', upperNoAccents(e.target.value))} /></FieldRow>
                  <FieldRow label="Estrada / Via"><Input className={inp} value={form.address.road} onChange={e => setAddr('road', upperNoAccents(e.target.value))} /></FieldRow>
                  <FieldRow label="KM"><Input className={inp} value={form.address.km} onChange={e => setAddr('km', e.target.value)} /></FieldRow>
                  <FieldRow label="Lote"><Input className={inp} value={form.address.lot} onChange={e => setAddr('lot', e.target.value)} /></FieldRow>
                  <FieldRow label="Seção"><Input className={inp} value={form.address.section} onChange={e => setAddr('section', e.target.value)} /></FieldRow>
                  <FieldRow label="Cidade"><Input className={inp} value={form.address.city} onChange={e => setAddr('city', upperNoAccents(e.target.value))} /></FieldRow>
                  <FieldRow label="Estado"><Input className={inp} value={form.address.state} onChange={e => setAddr('state', upperNoAccents(e.target.value))} maxLength={2} placeholder="PR" /></FieldRow>
                  <FieldRow label="Observações"><Input className={inp} value={form.address.notes} onChange={e => setAddr('notes', upperNoAccents(e.target.value))} /></FieldRow>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => { setAdding(false); setForm(emptyPropForm()) }}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={creating}>
                  {creating ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {loading && properties.length === 0 && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Carregando...</div>
        )}
        {properties.map(prop => {
          const isPrimary = prop.id === primaryId
          return (
            <div key={prop.id} className={`flex items-center justify-between rounded-lg border p-3 bg-card ${isPrimary ? 'border-primary/50 ring-1 ring-primary/20' : ''}`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{prop.name}</p>
                  {isPrimary && (
                    <Badge variant="secondary" className="gap-1 text-[10px]"><Star className="size-2.5 fill-current" /> Principal</Badge>
                  )}
                </div>
                {prop.registration && <p className="text-xs text-muted-foreground">Matrícula: {prop.registration}</p>}
                {prop.address && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {prop.address.type === 'URBAN'
                      ? [prop.address.street, prop.address.city, prop.address.state].filter(Boolean).join(', ')
                      : [prop.address.localityName, prop.address.road, prop.address.city].filter(Boolean).join(' — ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!isPrimary && !readOnly && (
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                    disabled={settingPrimary}
                    onClick={() => setPrimary(prop.id)}
                  >
                    <Star className="size-3.5" />
                    <span className="hidden sm:inline">Definir principal</span>
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="size-7" onClick={() => setDetailProp(prop)} aria-label="Ver detalhes">
                  <Eye className="size-3.5" />
                </Button>
                {!readOnly && (
                  <Button variant="ghost" size="icon" className="size-7 text-destructive/60 hover:text-destructive" onClick={() => setDeleteTarget(prop)} aria-label="Remover">
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {footer}

      {/* Dialog: Detalhes da Propriedade */}
      <Dialog open={!!detailProp} onOpenChange={open => !open && setDetailProp(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TreePine className="size-4" /> {detailProp?.name}
            </DialogTitle>
            {detailProp?.registration && (
              <DialogDescription>Matrícula: {detailProp.registration}</DialogDescription>
            )}
          </DialogHeader>
          {detailProp?.address ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {detailProp.address.type === 'URBAN'
                  ? <Badge variant="secondary" className="gap-1"><Building2 className="size-3" /> Urbano</Badge>
                  : <Badge variant="secondary" className="gap-1"><TreePine className="size-3" /> Rural</Badge>}
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {detailProp.address.type === 'URBAN' ? (
                  <>
                    {detailProp.address.zipCode && <InfoRow label="CEP" value={detailProp.address.zipCode} />}
                    {detailProp.address.street && <InfoRow label="Logradouro" value={`${detailProp.address.street}${detailProp.address.number ? `, ${detailProp.address.number}` : ''}`} />}
                    {detailProp.address.neighborhood && <InfoRow label="Bairro" value={detailProp.address.neighborhood} />}
                    {detailProp.address.city && <InfoRow label="Cidade" value={detailProp.address.city} />}
                    {detailProp.address.state && <InfoRow label="Estado" value={detailProp.address.state} />}
                    {detailProp.address.complement && <InfoRow label="Complemento" value={detailProp.address.complement} />}
                  </>
                ) : (
                  <>
                    {detailProp.address.localityName && <InfoRow label="Localidade" value={detailProp.address.localityName} />}
                    {detailProp.address.road && <InfoRow label="Estrada / Via" value={detailProp.address.road} />}
                    {detailProp.address.km && <InfoRow label="KM" value={detailProp.address.km} />}
                    {detailProp.address.lot && <InfoRow label="Lote" value={detailProp.address.lot} />}
                    {detailProp.address.section && <InfoRow label="Seção" value={detailProp.address.section} />}
                    {detailProp.address.city && <InfoRow label="Cidade" value={detailProp.address.city} />}
                    {detailProp.address.state && <InfoRow label="Estado" value={detailProp.address.state} />}
                  </>
                )}
                {detailProp.address.notes && <InfoRow label="Observações" value={detailProp.address.notes} />}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailProp(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar remoção */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Remover propriedade"
        description={<>
          <span className="font-medium text-foreground">{deleteTarget?.name}</span>
          <br />Esta ação não pode ser desfeita.
        </>}
        onConfirm={handleDelete}
        pending={deleting}
        confirmLabel="Remover"
        pendingLabel="Removendo..."
      />
    </div>
  )
}
