import { createFileRoute } from '@tanstack/react-router'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { useQueryClient } from '@tanstack/react-query'
import { apiErrorMessage } from '@/lib/api-error-message'
import { apiUpload } from '@/lib/api'
import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { ImageCropDialog } from '@/components/ImageCropDialog'
import { isImageFile, NOT_AN_IMAGE_MESSAGE } from '@/utils/image-file'
import { requirePermission } from '@/lib/auth-guard'
import { upperNoAccents } from '@/utils/text-format'
import {
  bannerStartIso, bannerEndIso, brasiliaYmd, bannerPeriodLabel, bannerState, BANNER_STATE_LABEL,
  type BannerState,
} from '@/lib/banner-dates'
import {
  useAdminBanners, useCreateBanner, useUpdateBanner,
  useDeleteBanner, useUploadBannerImage, useReorderBanners,
} from '@/hooks/useBanner'
import type { Banner, BannerButton, CreateBannerBody } from '@/hooks/useBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { NativeSelect } from '@/components/ui/native-select'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { AjudaLink } from '@/components/ajuda/AjudaLink'
import { EmptyState } from '@/components/EmptyState'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { RowActions } from '@/components/RowActions'
import type { BadgeTone } from '@/components/ui/badge'
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, ImageUp, X, ExternalLink,
  Image as ImageIcon, CalendarRange,
} from 'lucide-react'

export const Route = createFileRoute('/_admin/admin/banners')({
  beforeLoad: () => requirePermission('READ_BANNER'),
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
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-border bg-muted p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Botão {i + 1}</span>
            <Button type="button" variant="ghost" size="icon-xs" onClick={() => remove(i)} aria-label={`Remover o botão ${i + 1}`}>
              <X />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Texto *</Label>
              <Input value={btn.label} onChange={e => update(i, 'label', upperNoAccents(e.target.value))} placeholder="Ex: Saiba mais" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">URL *</Label>
              <Input value={btn.url} onChange={e => update(i, 'url', e.target.value)} placeholder="/cursos ou https://..." />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground select-none">
              <input type="checkbox" checked={btn.external} onChange={e => update(i, 'external', e.target.checked)} className="accent-primary" />
              Abre em nova aba
            </label>
            <div className="flex items-center gap-1.5">
              <Label htmlFor={`bn-btn-estilo-${i}`} className="text-xs">Estilo</Label>
              <NativeSelect
                id={`bn-btn-estilo-${i}`}
                value={btn.variant}
                onChange={e => update(i, 'variant', e.target.value)}
                className="h-8 text-xs"
              >
                <option value="primary">Primário (destaque)</option>
                <option value="secondary">Secundário (outline)</option>
              </NativeSelect>
            </div>
          </div>
        </div>
      ))}
      {value.length < 2 && (
        <Button type="button" variant="outline" size="sm" onClick={add} className="self-start">
          <Plus /> Adicionar botão
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
    // Dia do calendário em Brasília (o término gravado cai no dia seguinte em UTC).
    startDate: brasiliaYmd(b.startDate),
    endDate: brasiliaYmd(b.endDate),
    buttons: b.buttons.map(btn => ({ ...btn })),
  }
}

function BannerSheet({
  mode,
  onClose,
  onCreatedWithoutImage,
}: {
  mode: SheetMode | null
  onClose: () => void
  /** Banner criado mas a imagem falhou: o pai reabre o painel na edição desse banner. */
  onCreatedWithoutImage: (banner: Banner) => void
}) {
  const isEdit = mode?.mode === 'edit'
  const banner = isEdit ? mode.banner : null

  const createBanner = useCreateBanner()
  const updateBanner = useUpdateBanner(banner?.id ?? '')
  const uploadImage = useUploadBannerImage(banner?.id ?? '')
  const imageInputRef = useRef<HTMLInputElement>(null)

  // O pai remonta o sheet a cada abertura (key), então o estado já nasce certo.
  const [form, setForm] = useState<BannerFormState>(() => (banner ? formFromBanner(banner) : emptyForm()))
  const [error, setError] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  // imagem recortada antes do banner existir (modo criação) — sobe após o create
  const [stagedImage, setStagedImage] = useState<{ file: File; url: string } | null>(null)
  // Prévia na edição: troca assim que a nova imagem sobe.
  const [imageUrl, setImageUrl] = useState<string | null>(banner?.imageUrl ?? null)
  const queryClient = useQueryClient()

  // Libera as URLs de prévia ao trocá-las ou ao desmontar (na reabertura).
  useEffect(() => () => { if (cropSrc) URL.revokeObjectURL(cropSrc) }, [cropSrc])
  useEffect(() => () => { if (stagedImage) URL.revokeObjectURL(stagedImage.url) }, [stagedImage])

  function set<K extends keyof BannerFormState>(k: K, v: BannerFormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!isImageFile(file)) {
      toast.error(NOT_AN_IMAGE_MESSAGE)
      if (imageInputRef.current) imageInputRef.current.value = ''
      return
    }
    setCropSrc(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file) })
    if (imageInputRef.current) imageInputRef.current.value = ''
  }, [])

  const handleCropConfirm = useCallback(async (file: File) => {
    setCropSrc(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    if (!banner) {
      // criação: guarda localmente e sobe depois do create
      setStagedImage(prev => {
        if (prev) URL.revokeObjectURL(prev.url)
        return { file, url: URL.createObjectURL(file) }
      })
      return
    }
    try {
      const res = await uploadImage.mutateAsync(file)
      const data = await res.json().catch(() => null) as { imageUrl?: string } | null
      if (data?.imageUrl) setImageUrl(data.imageUrl)
      toast.success('Imagem atualizada.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao enviar a imagem.'))
    }
  }, [banner, uploadImage])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.title.trim()) { setError('Título é obrigatório.'); return }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError('O término não pode ser antes do início.')
      return
    }
    const validBtns = form.buttons.filter(b => b.label.trim() && b.url.trim())

    const body: CreateBannerBody = {
      title: form.title,
      subtitle: form.subtitle || null,
      active: form.active,
      buttons: validBtns as BannerButton[],
      // Dias no horário de Brasília: entra no ar à 0h do início e sai às 23h59 do término.
      startDate: bannerStartIso(form.startDate),
      endDate: bannerEndIso(form.endDate),
    }

    try {
      if (isEdit && banner) {
        await updateBanner.mutateAsync(body)
        toast.success('Banner atualizado.')
      } else {
        const res = await createBanner.mutateAsync(body)
        if (stagedImage) {
          const created = await res.json().catch(() => null) as Banner | null
          try {
            if (!created?.id) throw new Error('Banner criado sem id na resposta')
            await apiUpload(`/admin/banners/${created.id}/image`, stagedImage.file)
            queryClient.invalidateQueries({ queryKey: ['banners'] })
            queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] })
          } catch {
            // Um aviso só; o painel continua aberto, já na edição do banner criado.
            toast.warning('Banner criado, mas a imagem não foi enviada. Tente enviar de novo.')
            if (created?.id) onCreatedWithoutImage(created)
            else onClose()
            return
          }
        }
        toast.success('Banner criado.')
      }
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'Erro ao salvar.'))
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
              <Label>Imagem</Label>
              {imageUrl && (
                <img src={imageUrl} alt={banner.title} className="aspect-[12/5] w-full rounded-lg border border-border object-cover" />
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                <Button
                  type="button" variant="outline" size="sm"
                  disabled={uploadImage.isPending}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageUp />
                  {uploadImage.isPending ? 'Enviando...' : imageUrl ? 'Trocar imagem' : 'Adicionar imagem'}
                </Button>
                <span className="text-xs text-muted-foreground">Proporção ideal: 1440 × 600 px</span>
              </div>
            </div>
          )}
          {!isEdit && (
            <div className="flex flex-col gap-2">
              <Label>Imagem</Label>
              {stagedImage ? (
                <img src={stagedImage.url} alt="Prévia do banner" className="aspect-[12/5] w-full rounded-lg border border-border object-cover" />
              ) : (
                <div className="flex aspect-[12/5] w-full items-center justify-center rounded-lg border border-border bg-muted">
                  <ImageUp className="size-8 text-faint-foreground" aria-hidden />
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageUp />
                  {stagedImage ? 'Trocar imagem' : 'Adicionar imagem'}
                </Button>
                <span className="text-xs text-muted-foreground">Proporção ideal: 1440 × 600 px — sobe junto com a criação</span>
              </div>
            </div>
          )}

          <ImageCropDialog
            src={cropSrc}
            aspect={1440 / 600}
            outputWidth={1440}
            outputHeight={600}
            onConfirm={handleCropConfirm}
            onCancel={() => { setCropSrc(prev => { if (prev) URL.revokeObjectURL(prev); return null }); if (imageInputRef.current) imageInputRef.current.value = '' }}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bn-title">Título *</Label>
            <Input id="bn-title" value={form.title} onChange={e => set('title', upperNoAccents(e.target.value))} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bn-subtitle">Subtítulo</Label>
            <Input id="bn-subtitle" value={form.subtitle} onChange={e => set('subtitle', upperNoAccents(e.target.value))} placeholder="Texto de apoio abaixo do título" />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bn-start">Início (opcional)</Label>
                <DatePicker id="bn-start" value={form.startDate} onChange={v => set('startDate', v)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bn-end">Término (opcional)</Label>
                <DatePicker id="bn-end" value={form.endDate} onChange={v => set('endDate', v)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Horário de Brasília: entra no ar à 0h do início e sai às 23h59 do término.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="accent-primary" />
            <span className="text-sm font-medium text-foreground">Banner ativo (visível no site)</span>
          </label>

          <div className="flex flex-col gap-2">
            <Label>Botões (máx. 2)</Label>
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

// ─── Situação no site ─────────────────────────────────────────────────────────

// No ar em verde; expirado pede atenção (âmbar); agendado e inativo ficam neutros.
const STATE_TONE: Record<BannerState, BadgeTone | 'outline'> = {
  live: 'success',
  scheduled: 'outline',
  expired: 'warning',
  inactive: 'neutral',
}

// Mesma regra do site (GET /banners): ativo e dentro do período.
function BannerStateBadge({ state }: { state: BannerState }) {
  return <Badge variant={STATE_TONE[state]}>{BANNER_STATE_LABEL[state]}</Badge>
}

// ─── Route component ──────────────────────────────────────────────────────────

function RouteComponent() {
  const { data: banners, isLoading, isError, isFetching, refetch } = useAdminBanners()
  const deleteBanner = useDeleteBanner()
  const reorder = useReorderBanners()

  const [sheet, setSheet] = useState<SheetMode | null>(null)
  // Muda a cada abertura: o sheet remonta com o formulário vazio (novo) ou do banner (edição).
  const [sheetKey, setSheetKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null)

  function openSheet(next: SheetMode) {
    setSheet(next)
    setSheetKey(k => k + 1)
  }

  const sorted = [...(banners ?? [])].sort((a, b) => a.order - b.order)
  const now = new Date()

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
    <PageContainer>
      <PageHeader
        title="Banners"
        description="Gerencie os banners exibidos na página inicial"
        help={<AjudaLink topico="banners" titulo="Banners" />}
        actions={
          <Button onClick={() => openSheet({ mode: 'create' })}>
            <Plus className="size-4" /> Novo banner
          </Button>
        }
      />

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      )}

      {!isLoading && isError && (
        <LoadErrorRetry
          className="rounded-xl border border-border bg-card"
          message="Não foi possível carregar os banners."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )}

      {!isLoading && !isError && sorted.length === 0 && (
        <EmptyState
          framed
          icon={ImageIcon}
          title="Nenhum banner cadastrado"
          description='Clique em "Novo banner" para começar.'
        />
      )}

      {sorted.length > 0 && (
        <div className="flex flex-col gap-3">
          {sorted.map((banner, idx) => (
            // No celular os botões descem para uma linha própria: ao lado, o título sumia.
            <div key={banner.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
              {/* Miniatura na proporção do banner (1440 × 600): o cartaz aparece inteiro. */}
              <div className="flex aspect-[12/5] w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted sm:w-36">
                {banner.imageUrl ? (
                  <img src={banner.imageUrl} alt={banner.title} className="size-full object-cover" />
                ) : (
                  <span className="px-1 text-center text-xs text-faint-foreground">Sem imagem</span>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-foreground">{banner.title}</p>
                  <BannerStateBadge state={bannerState(banner, now)} />
                </div>
                {banner.subtitle && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{banner.subtitle}</p>
                )}
                {bannerPeriodLabel(banner) && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarRange className="size-3 shrink-0 text-faint-foreground" aria-hidden />
                    <span className="tabular-nums">{bannerPeriodLabel(banner)}</span>
                  </p>
                )}
                {banner.buttons.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {banner.buttons.map((btn, i) => (
                      <Badge key={i} variant="outline" className="text-muted-foreground">
                        {btn.label}
                        {btn.external && <ExternalLink aria-label="abre em nova aba" />}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-1 border-t border-border pt-2 sm:border-t-0 sm:pt-0">
              {/* Ordem: subir e descer ficam juntos, à parte das ações. */}
              <div className="flex shrink-0 gap-0.5 sm:flex-col">
                <Button
                  variant="ghost" size="icon-sm" className="size-11 text-muted-foreground sm:size-8"
                  disabled={idx === 0 || reorder.isPending}
                  onClick={() => move(banner.id, 'up')}
                  aria-label="Mover banner para cima"
                  title="Mover banner para cima"
                >
                  <ChevronUp />
                </Button>
                <Button
                  variant="ghost" size="icon-sm" className="size-11 text-muted-foreground sm:size-8"
                  disabled={idx === sorted.length - 1 || reorder.isPending}
                  onClick={() => move(banner.id, 'down')}
                  aria-label="Mover banner para baixo"
                  title="Mover banner para baixo"
                >
                  <ChevronDown />
                </Button>
              </div>
              <RowActions
                className="shrink-0"
                label={`Ações do banner ${banner.title}`}
                actions={[
                  { label: 'Editar banner', icon: Pencil, onClick: () => openSheet({ mode: 'edit', banner }) },
                  { label: 'Excluir banner', icon: Trash2, destructive: true, onClick: () => setDeleteTarget(banner) },
                ]}
              />
              </div>
            </div>
          ))}
        </div>
      )}

      <BannerSheet
        key={sheetKey}
        mode={sheet}
        onClose={() => setSheet(null)}
        onCreatedWithoutImage={created => openSheet({ mode: 'edit', banner: created })}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Excluir banner"
        description={
          <>
            Esta ação não pode ser desfeita.
            {deleteTarget?.title && (
              <span className="mt-2 block font-medium text-foreground">{deleteTarget.title}</span>
            )}
          </>
        }
        onConfirm={handleDelete}
        pending={deleteBanner.isPending}
        confirmLabel="Excluir"
        pendingLabel="Excluindo..."
      />
    </PageContainer>
  )
}
