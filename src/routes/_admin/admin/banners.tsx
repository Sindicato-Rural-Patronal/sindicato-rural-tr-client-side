import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { ImageCropDialog } from '@/components/ImageCropDialog'
import { requirePermission } from '@/lib/auth-guard'
import {
  useAdminBanners, useCreateBanner, useUpdateBanner,
  useDeleteBanner, useUploadBannerImage, useReorderBanners,
} from '@/hooks/useBanner'
import type { Banner, BannerButton, CreateBannerBody } from '@/hooks/useBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, ImageUp, X, ExternalLink,
} from 'lucide-react'

export const Route = createFileRoute('/_admin/admin/banners')({
  beforeLoad: () => requirePermission('READ_COURSE'),
  component: RouteComponent,
})

// ─── Button editor ────────────────────────────────────────────────────────────

type BtnDraft = { label: string; url: string; external: boolean; variant: 'primary' | 'secondary' }

function BtnsEditor({ value, onChange }: { value: BtnDraft[]; onChange: (v: BtnDraft[]) => void }) {
  function add() {
    if (value.length >= 2) return
    onChange([...value, { label: '', url: '', external: false, variant: 'primary' }])
  }
  function remove(i: number) { onChange(value.filter((_, idx) => idx !== i)) }
  function update(i: number, field: keyof BtnDraft, v: string | boolean) {
    onChange(value.map((b, idx) => idx === i ? { ...b, [field]: v } : b))
  }

  return (
    <div className="flex flex-col gap-3">
      {value.map((btn, i) => (
        <div key={i} className="rounded-lg border p-3 flex flex-col gap-2 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Botão {i + 1}</span>
            <Button type="button" variant="ghost" size="icon" className="size-6" onClick={() => remove(i)}>
              <X className="size-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Texto *</Label>
              <Input value={btn.label} onChange={e => update(i, 'label', e.target.value)} className="h-8 text-sm" placeholder="Ex: Saiba mais" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">URL *</Label>
              <Input value={btn.url} onChange={e => update(i, 'url', e.target.value)} className="h-8 text-sm" placeholder="/cursos ou https://..." />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={btn.external} onChange={e => update(i, 'external', e.target.checked)} className="accent-primary" />
              Abre em nova aba
            </label>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Estilo:</Label>
              <select
                value={btn.variant}
                onChange={e => update(i, 'variant', e.target.value)}
                className="h-7 rounded border border-input px-2 text-xs bg-background focus:outline-none"
              >
                <option value="primary">Primário (destaque)</option>
                <option value="secondary">Secundário (outline)</option>
              </select>
            </div>
          </div>
        </div>
      ))}
      {value.length < 2 && (
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5 self-start">
          <Plus className="size-3.5" /> Adicionar botão
        </Button>
      )}
    </div>
  )
}

// ─── Banner form sheet ────────────────────────────────────────────────────────

type SheetMode = { mode: 'create' } | { mode: 'edit'; banner: Banner }

type BannerFormState = {
  title: string
  subtitle: string
  active: boolean
  startDate: string
  endDate: string
  buttons: BtnDraft[]
}

function emptyForm(): BannerFormState {
  return { title: '', subtitle: '', active: true, startDate: '', endDate: '', buttons: [] }
}

function formFromBanner(b: Banner): BannerFormState {
  return {
    title: b.title,
    subtitle: b.subtitle ?? '',
    active: b.active,
    startDate: b.startDate ? b.startDate.slice(0, 10) : '',
    endDate: b.endDate ? b.endDate.slice(0, 10) : '',
    buttons: b.buttons.map(btn => ({ ...btn })),
  }
}

function BannerSheet({
  mode,
  onClose,
}: {
  mode: SheetMode | null
  onClose: () => void
}) {
  const isEdit = mode?.mode === 'edit'
  const banner = isEdit ? mode.banner : null

  const createBanner = useCreateBanner()
  const updateBanner = useUpdateBanner(banner?.id ?? '')
  const uploadImage = useUploadBannerImage(banner?.id ?? '')
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<BannerFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!mode) return
    setForm(banner ? formFromBanner(banner) : emptyForm())
    setError(null)
    setCropSrc(null)
  }, [mode?.mode, banner?.id])

  function set<K extends keyof BannerFormState>(k: K, v: BannerFormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }, [])

  const handleCropConfirm = useCallback(async (file: File) => {
    setCropSrc(null)
    if (!banner) return
    try {
      const res = await uploadImage.mutateAsync(file)
      if (!res.ok) { toast.error('Erro ao fazer upload.'); return }
      toast.success('Imagem atualizada!')
    } catch {
      toast.error('Erro ao fazer upload da imagem.')
    }
  }, [banner, uploadImage])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.title.trim()) { setError('Título é obrigatório.'); return }
    const validBtns = form.buttons.filter(b => b.label.trim() && b.url.trim())

    const body: CreateBannerBody = {
      title: form.title,
      subtitle: form.subtitle || null,
      active: form.active,
      buttons: validBtns as BannerButton[],
      startDate: form.startDate ? `${form.startDate}T00:00:00.000Z` : null,
      endDate: form.endDate ? `${form.endDate}T23:59:59.999Z` : null,
    }

    try {
      if (isEdit && banner) {
        const res = await updateBanner.mutateAsync(body)
        if (!res.ok) { const d = await res.json().catch(() => null); setError(d?.error ?? 'Erro ao salvar.'); return }
        toast.success('Banner atualizado!')
      } else {
        const res = await createBanner.mutateAsync(body)
        if (!res.ok) { const d = await res.json().catch(() => null); setError(d?.error ?? 'Erro ao criar.'); return }
        toast.success('Banner criado!')
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    }
  }

  const isPending = createBanner.isPending || updateBanner.isPending

  return (
    <Sheet open={!!mode} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Editar banner' : 'Novo banner'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
          {/* Image upload (edit only) */}
          {isEdit && banner && (
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-semibold">Imagem</Label>
              {banner.imageUrl && (
                <img src={banner.imageUrl} alt={banner.title} className="w-full h-32 object-cover rounded-lg border" />
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                <Button
                  type="button" variant="outline" size="sm" className="gap-1.5"
                  disabled={uploadImage.isPending}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageUp className="size-3.5" />
                  {uploadImage.isPending ? 'Enviando...' : banner.imageUrl ? 'Trocar imagem' : 'Adicionar imagem'}
                </Button>
                <span className="text-[11px] text-muted-foreground">Proporção ideal: 1440 × 600 px</span>
              </div>
            </div>
          )}
          {!isEdit && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              Após criar o banner, volte para editar e adicionar a imagem.
            </p>
          )}

          <ImageCropDialog
            src={cropSrc}
            aspect={1440 / 600}
            outputWidth={1440}
            outputHeight={600}
            onConfirm={handleCropConfirm}
            onCancel={() => { setCropSrc(null); if (imageInputRef.current) imageInputRef.current.value = '' }}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bn-title">Título *</Label>
            <Input id="bn-title" value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bn-subtitle">Subtítulo</Label>
            <Input id="bn-subtitle" value={form.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="Texto de apoio abaixo do título" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bn-start">Início (opcional)</Label>
              <Input id="bn-start" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className="h-9" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bn-end">Término (opcional)</Label>
              <Input id="bn-end" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className="h-9" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="accent-primary" />
            <span className="text-sm font-medium">Banner ativo (visível no site)</span>
          </label>

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold">Botões (máx. 2)</Label>
            <BtnsEditor value={form.buttons} onChange={v => set('buttons', v)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar banner'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Route component ──────────────────────────────────────────────────────────

function RouteComponent() {
  const { data: banners, isLoading } = useAdminBanners()
  const deleteBanner = useDeleteBanner()
  const reorder = useReorderBanners()

  const [sheet, setSheet] = useState<SheetMode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null)

  const sorted = [...(banners ?? [])].sort((a, b) => a.order - b.order)

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteBanner.mutateAsync(deleteTarget.id)
      toast.success('Banner excluído.')
      setDeleteTarget(null)
    } catch {
      toast.error('Erro ao excluir banner.')
    }
  }

  async function move(id: string, dir: 'up' | 'down') {
    const ids = sorted.map(b => b.id)
    const idx = ids.indexOf(id)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === ids.length - 1) return
    const newIds = [...ids]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[newIds[idx], newIds[swap]] = [newIds[swap], newIds[idx]]
    try {
      await reorder.mutateAsync(newIds)
    } catch {
      toast.error('Erro ao reordenar.')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Banners</h1>
          <p className="text-sm text-muted-foreground">Gerencie os banners exibidos na página inicial</p>
        </div>
        <Button onClick={() => setSheet({ mode: 'create' })} className="gap-1.5">
          <Plus className="size-4" /> Novo banner
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-center">
          <p className="text-sm font-medium text-foreground">Nenhum banner cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Novo banner" para começar.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sorted.map((banner, idx) => (
          <div key={banner.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
            {/* Thumbnail */}
            <div className="shrink-0 size-16 rounded-lg border overflow-hidden bg-muted flex items-center justify-center">
              {banner.imageUrl ? (
                <img src={banner.imageUrl} alt={banner.title} className="size-full object-cover" />
              ) : (
                <span className="text-[10px] text-muted-foreground text-center px-1">Sem imagem</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm truncate">{banner.title}</p>
                <Badge variant={banner.active ? 'default' : 'secondary'} className="text-[10px] py-0 shrink-0">
                  {banner.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              {banner.subtitle && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{banner.subtitle}</p>
              )}
              {banner.buttons.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {banner.buttons.map((btn, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5 text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                      {btn.label}
                      {btn.external && <ExternalLink className="size-2.5" />}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost" size="icon" className="size-6"
                  disabled={idx === 0 || reorder.isPending}
                  onClick={() => move(banner.id, 'up')}
                >
                  <ChevronUp className="size-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="size-6"
                  disabled={idx === sorted.length - 1 || reorder.isPending}
                  onClick={() => move(banner.id, 'down')}
                >
                  <ChevronDown className="size-3.5" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setSheet({ mode: 'edit', banner })}>
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon"
                className="size-8 text-destructive/60 hover:text-destructive"
                onClick={() => setDeleteTarget(banner)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <BannerSheet mode={sheet} onClose={() => setSheet(null)} />

      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir banner</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <p className="text-sm font-medium">{deleteTarget?.title}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteBanner.isPending}>
              {deleteBanner.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
