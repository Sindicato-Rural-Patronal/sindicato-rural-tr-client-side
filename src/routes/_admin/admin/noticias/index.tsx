import { createFileRoute } from '@tanstack/react-router'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiUpload } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionButton } from '@/components/PermissionButton'
import { useTranslation } from 'react-i18next'
import {
  useAdminNews, useCreateNews, useUpdateNews, useDeleteNews,
  useUploadNewsBanner, useUploadNewsBlockImage, type AdminNewsStatusFilter,
} from '@/hooks/useNews'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Newspaper, Pencil, Trash2, ImageUp, GripVertical,
  AlignLeft, Image, LayoutTemplate, X, ArrowLeft, Save, Calendar,
  CalendarClock, ExternalLink, Link2, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { FilterBar, FilterField } from '@/components/FilterBar'
import { RowActions } from '@/components/RowActions'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Separator } from '@/components/ui/separator'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { ConfirmCloseDialog } from '@/components/confirm-close-dialog'
import { ImageCropDialog } from '@/components/ImageCropDialog'
import { isImageFile, NOT_AN_IMAGE_MESSAGE } from '@/utils/image-file'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/EmptyState'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Pagination } from '@/components/ui/pagination'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AjudaLink } from '@/components/ajuda/AjudaLink'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { News, ContentBlock, ParagraphBlock, ImageBlock, ImageTextBlock } from '@/@types/news'
import { parseBlocks, serializeBlocks } from '@/@types/news'
import {
  isNewsLive, isScheduled, scheduleLabel, scheduleToForm, scheduleToPublishAt,
  validateSchedule, type NewsScheduleForm,
} from '@/lib/news-schedule'
import { copyText } from '@/lib/copy-text'
import { upperNoAccents } from '@/utils/text-format'

// Revoga um object URL de blob (evita vazamento de memória em sessões longas).
function revokeBlobUrl(url: string | null) {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
}

export const Route = createFileRoute('/_admin/admin/noticias/')({
  component: RouteComponent,
})

// ─── Block item (with stable DnD id) ─────────────────────────────────────────

type BlockItem = ContentBlock & { _id: string }

function genId() { return Math.random().toString(36).slice(2, 10) }

function toBlockItems(blocks: ContentBlock[]): BlockItem[] {
  return blocks.map(b => ({ ...b, _id: genId() }))
}

function toBlocks(items: BlockItem[]): ContentBlock[] {
  return items.map(({ _id: _, ...b }) => b as ContentBlock)
}

// ─── BlockUploadButton ────────────────────────────────────────────────────────

function BlockUploadButton({
  onUploaded,
  newsId,
  label = 'Escolher imagem',
  stageFile,
}: {
  onUploaded: (url: string) => void
  newsId: string
  label?: string
  /** Modo criação: registra o arquivo localmente e devolve URL de preview — o upload real acontece após o create. */
  stageFile?: (file: File) => string
}) {
  const upload = useUploadNewsBlockImage(newsId)
  const ref = useRef<HTMLInputElement>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (stageFile) {
      onUploaded(stageFile(file))
      if (ref.current) ref.current.value = ''
      return
    }
    try {
      const res = await upload.mutateAsync(file)
      const data = await res.json().catch(() => null)
      if (data?.url) onUploaded(data.url)
      else toast.error('Erro ao enviar a imagem. Tente de novo.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao enviar a imagem. Tente de novo.'))
    }
    if (ref.current) ref.current.value = ''
  }

  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={upload.isPending}
        onClick={e => { e.stopPropagation(); ref.current?.click() }}
      >
        <ImageUp />
        {upload.isPending ? 'Enviando...' : label}
      </Button>
    </>
  )
}

// Botão "Trocar imagem" sobre a foto: com mouse, escurece e aparece ao passar por
// cima; no toque (sem hover) fica sempre visível no canto, sem cobrir a foto.
const IMAGE_OVERLAY =
  'absolute inset-0 flex items-end justify-end p-2 rounded-xl transition-opacity ' +
  '[@media(hover:hover)]:items-center [@media(hover:hover)]:justify-center [@media(hover:hover)]:bg-black/40 ' +
  '[@media(hover:hover)]:opacity-0 group-hover/img:opacity-100 focus-within:opacity-100'

// ─── Sortable block wrapper ───────────────────────────────────────────────────

function SortableBlockWrapper({
  item,
  onRemove,
  children,
}: {
  item: BlockItem
  onRemove: () => void
  children: React.ReactNode
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: item._id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="relative group/block flex items-start gap-2"
    >
      {/* Some só onde há mouse (aparece ao passar por cima); no toque fica sempre visível. */}
      <div className="flex flex-col items-center gap-0.5 mt-1 shrink-0 w-6 [@media(hover:hover)]:opacity-0 group-hover/block:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded-md p-0.5 hover:bg-accent active:cursor-grabbing"
          tabIndex={-1}
          aria-label="Arrastar bloco"
        >
          <GripVertical className="size-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
          aria-label="Remover bloco"
          title="Remover bloco"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}

// ─── Inline block editors (styled like public page) ──────────────────────────

function ParagraphEdit({
  block,
  onChange,
}: {
  block: ParagraphBlock
  onChange: (b: ParagraphBlock) => void
}) {
  return (
    <textarea
      value={block.text}
      onChange={e => onChange({ type: 'paragraph', text: e.target.value })}
      placeholder="Texto do parágrafo..."
      rows={3}
      className="w-full resize-none border-b-2 border-transparent bg-transparent py-1 text-base leading-relaxed whitespace-pre-line text-foreground outline-none transition-colors placeholder:text-faint-foreground hover:border-border focus:border-primary/50"
    />
  )
}

function ImageEdit({
  block,
  onChange,
  newsId,
  stageFile,
}: {
  block: ImageBlock
  onChange: (b: ImageBlock) => void
  newsId: string
  stageFile?: (file: File) => string
}) {
  const isPending = newsId === '__pending__'
  const staged = isPending ? stageFile : undefined
  return (
    <figure className="my-2">
      {block.url ? (
        <div className="relative group/img">
          <img
            src={block.url}
            alt={block.caption ?? ''}
            className="w-full rounded-xl object-cover max-h-120"
          />
          <div className={IMAGE_OVERLAY}>
            {(!isPending || staged) && (
              <BlockUploadButton
                newsId={newsId}
                stageFile={staged}
                onUploaded={url => onChange({ ...block, url })}
                label="Trocar imagem"
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-muted">
          {isPending && !staged ? (
            <p className="text-xs text-muted-foreground text-center px-6">
              Salve a notícia primeiro para fazer upload de imagens
            </p>
          ) : (
            <BlockUploadButton
              newsId={newsId}
              stageFile={staged}
              onUploaded={url => onChange({ ...block, url })}
              label="Carregar imagem"
            />
          )}
        </div>
      )}
      <input
        value={block.caption ?? ''}
        onChange={e => onChange({ ...block, caption: e.target.value })}
        placeholder="Legenda (opcional)"
        className="mt-2 w-full border-b border-transparent bg-transparent py-0.5 text-center text-sm text-muted-foreground outline-none transition-colors placeholder:text-faint-foreground hover:border-border focus:border-primary/40"
      />
    </figure>
  )
}

function ImageTextEdit({
  block,
  onChange,
  newsId,
  stageFile,
}: {
  block: ImageTextBlock
  onChange: (b: ImageTextBlock) => void
  newsId: string
  stageFile?: (file: File) => string
}) {
  const isPending = newsId === '__pending__'
  const staged = isPending ? stageFile : undefined
  return (
    <div
      className={`flex flex-col gap-4 md:flex-row md:items-start ${
        block.imagePosition === 'right' ? 'md:flex-row-reverse' : ''
      }`}
    >
      <div className="w-full md:w-2/5 flex flex-col gap-1">
        {block.url ? (
          <div className="relative group/img">
            <img src={block.url} alt="" className="w-full rounded-xl object-cover max-h-64" />
            <div className={IMAGE_OVERLAY}>
              {(!isPending || staged) && (
                <BlockUploadButton
                  newsId={newsId}
                  stageFile={staged}
                  onUploaded={url => onChange({ ...block, url })}
                  label="Trocar"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-36 items-center justify-center rounded-xl border border-border bg-muted">
            {isPending && !staged ? (
              <p className="text-xs text-muted-foreground text-center px-4">Salve primeiro</p>
            ) : (
              <BlockUploadButton
                newsId={newsId}
                stageFile={staged}
                onUploaded={url => onChange({ ...block, url })}
                label="Imagem"
              />
            )}
          </div>
        )}
        <button
          onClick={() =>
            onChange({ ...block, imagePosition: block.imagePosition === 'left' ? 'right' : 'left' })
          }
          className="text-xs text-muted-foreground hover:text-foreground self-end transition-colors"
        >
          ↔ {block.imagePosition === 'left' ? 'Mover p/ direita' : 'Mover p/ esquerda'}
        </button>
      </div>
      <textarea
        value={block.text}
        onChange={e => onChange({ ...block, text: e.target.value })}
        placeholder="Texto ao lado da imagem..."
        rows={4}
        className="flex-1 resize-none border-b-2 border-transparent bg-transparent py-1 text-base leading-relaxed text-foreground outline-none transition-colors placeholder:text-faint-foreground hover:border-border focus:border-primary/50"
      />
    </div>
  )
}

// ─── Quando publicar ─────────────────────────────────────────────────────────

/** "Publicar agora" ou "Agendar para" (data + hora de Brasília). */
function SchedulePanel({ value, onChange }: {
  value: NewsScheduleForm
  onChange: (value: NewsScheduleForm) => void
}) {
  const scheduled = value.mode === 'scheduled'

  return (
    <div className="border-b border-border bg-muted px-4 py-2.5">
      <div className="container mx-auto flex max-w-3xl flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <CalendarClock className="size-4 text-muted-foreground" aria-hidden /> Quando publicar
        </span>
        <SegmentedControl
          label="Quando publicar"
          value={value.mode}
          onChange={mode => onChange({ ...value, mode })}
          options={[
            { value: 'now', label: 'Publicar agora' },
            { value: 'scheduled', label: 'Agendar para' },
          ]}
        />

        {scheduled && (
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="news-publish-date" className="sr-only">Data da publicação</Label>
            <DatePicker
              id="news-publish-date"
              className="w-40"
              value={value.date}
              onChange={date => onChange({ ...value, date })}
            />
            <Label htmlFor="news-publish-hour" className="sr-only">Hora da publicação</Label>
            <Input
              id="news-publish-hour"
              type="time"
              className="w-28"
              value={value.hour}
              onChange={e => onChange({ ...value, hour: e.target.value })}
            />
            <span className="text-xs text-muted-foreground">Horário de Brasília</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Full-screen news editor ──────────────────────────────────────────────────

type NewsForm = {
  title: string
  summary: string
  status: 'PUBLISHED' | 'UNPUBLISHED'
  /** "Publicar agora" ou "Agendar para" (só vale com status publicado). */
  schedule: NewsScheduleForm
}

function NewsEditor({
  mode,
  news,
  onClose,
}: {
  mode: 'create' | 'edit'
  news: News | null
  onClose: () => void
}) {
  const [form, setForm] = useState<NewsForm>({
    title: news?.title ?? '',
    summary: news?.summary ?? '',
    status: news?.status ?? 'UNPUBLISHED',
    schedule: scheduleToForm(news?.publishAt),
  })
  const [blockItems, setBlockItems] = useState<BlockItem[]>(() =>
    news
      ? toBlockItems(parseBlocks(news.content))
      : [{ type: 'paragraph', text: '', _id: genId() }]
  )
  const [savedId, setSavedId] = useState<string | null>(news?.id ?? null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(news?.bannerUrl ?? null)
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null)
  // arquivos escolhidos antes da notícia existir — sobem logo após o create
  const [stagedBannerFile, setStagedBannerFile] = useState<File | null>(null)
  const stagedFilesRef = useRef<Map<string, File>>(new Map())
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [saved, setSaved] = useState(mode === 'edit')

  const createNews = useCreateNews()
  const updateNews = useUpdateNews(savedId ?? '')
  const uploadBanner = useUploadNewsBanner(savedId ?? '')
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setBlockItems(items => {
      const oldIdx = items.findIndex(i => i._id === active.id)
      const newIdx = items.findIndex(i => i._id === over.id)
      return arrayMove(items, oldIdx, newIdx)
    })
    setSaved(false)
  }

  function updateBlock(id: string, block: ContentBlock) {
    setBlockItems(items => items.map(i => (i._id === id ? { ...block, _id: id } : i)))
    setSaved(false)
  }

  // Remove na hora e oferece "Desfazer" (volta para a mesma posição).
  function removeBlock(id: string) {
    const index = blockItems.findIndex(i => i._id === id)
    if (index < 0) return
    const removed = blockItems[index]
    setBlockItems(items => items.filter(i => i._id !== id))
    setSaved(false)
    toast('Bloco removido.', {
      duration: 8000,
      action: {
        label: 'Desfazer',
        onClick: () => {
          setBlockItems(items => {
            if (items.some(i => i._id === removed._id)) return items
            const next = [...items]
            next.splice(Math.min(index, next.length), 0, removed)
            return next
          })
          setSaved(false)
        },
      },
    })
  }

  function addBlock(type: ContentBlock['type']) {
    const next: BlockItem =
      type === 'paragraph'
        ? { type: 'paragraph', text: '', _id: genId() }
        : type === 'image'
          ? { type: 'image', url: '', caption: '', _id: genId() }
          : { type: 'image-text', url: '', text: '', imagePosition: 'left', _id: genId() }
    setBlockItems(items => [...items, next])
    setSaved(false)
  }

  const newsId = savedId ?? '__pending__'
  const [uploadingStaged, setUploadingStaged] = useState(false)
  const isPending = createNews.isPending || updateNews.isPending || uploadBanner.isPending || uploadingStaged

  /** Modo criação: registra o arquivo do bloco localmente e devolve URL de preview. */
  function stageBlockFile(file: File): string {
    const url = URL.createObjectURL(file)
    stagedFilesRef.current.set(url, file)
    setSaved(false)
    return url
  }

  const isBlobUrl = (url: string) => url.startsWith('blob:')

  async function handleSave() {
    setError(null)
    if (!form.title.trim()) { setError('Título é obrigatório.'); return }
    if (form.status === 'PUBLISHED') {
      const scheduleError = validateSchedule(form.schedule)
      if (scheduleError) { setError(scheduleError); return }
    }
    const publishAt = scheduleToPublishAt(form.schedule, form.status)
    try {
      if (!savedId) {
        // nunca persiste URLs blob: — cria com url vazia e corrige via PATCH após os uploads
        const createContent = serializeBlocks(toBlocks(blockItems).map(b =>
          (b.type === 'image' || b.type === 'image-text') && isBlobUrl(b.url) ? { ...b, url: '' } : b,
        ))
        const res = await createNews.mutateAsync({
          title: form.title,
          summary: form.summary || undefined,
          status: form.status,
          publishAt,
          content: createContent,
        })
        const data = await res.json()
        const newId: string = data.id
        setSavedId(newId)

        const failed: string[] = []
        const hasStagedBlocks = blockItems.some(i => (i.type === 'image' || i.type === 'image-text') && isBlobUrl(i.url))

        if (stagedBannerFile || hasStagedBlocks) {
          setUploadingStaged(true)

          // banner escolhido antes do create
          if (stagedBannerFile) {
            try {
              const bRes = await apiUpload(`/news/${newId}/banner`, stagedBannerFile)
              const bData = await bRes.json().catch(() => null)
              if (bData?.url) setBannerUrl(bData.url)
            } catch { failed.push('banner') }
            setStagedBannerFile(null)
          }

          // imagens de bloco escolhidas antes do create
          if (hasStagedBlocks) {
            const finalItems: BlockItem[] = []
            for (const item of blockItems) {
              if ((item.type === 'image' || item.type === 'image-text') && isBlobUrl(item.url)) {
                const file = stagedFilesRef.current.get(item.url)
                let realUrl = ''
                if (file) {
                  try {
                    const uRes = await apiUpload(`/news/${newId}/image`, file)
                    const uData = await uRes.json().catch(() => null)
                    realUrl = uData?.url ?? ''
                  } catch { /* fica vazio */ }
                }
                if (!realUrl) failed.push('imagem de bloco')
                URL.revokeObjectURL(item.url)
                finalItems.push({ ...item, url: realUrl })
              } else {
                finalItems.push(item)
              }
            }
            stagedFilesRef.current.clear()
            setBlockItems(finalItems)
            await apiFetch(`/news/${newId}`, {
              method: 'PATCH',
              body: JSON.stringify({ content: serializeBlocks(toBlocks(finalItems)) }),
            })
          }

          setUploadingStaged(false)
          queryClient.invalidateQueries({ queryKey: ['news'] })
          queryClient.invalidateQueries({ queryKey: ['admin', 'news'] })
          if (failed.length) {
            // upload parcial: avisa e NÃO dispara o toast de sucesso
            toast.error(`Notícia criada, mas falhou o upload de: ${failed.join(', ')}. Tente novamente pela edição.`)
            setSaved(true)
            return
          }
        }
      } else {
        await updateNews.mutateAsync({
          title: form.title,
          summary: form.summary || undefined,
          status: form.status,
          publishAt,
          content: serializeBlocks(toBlocks(blockItems)),
        })
      }
      setSaved(true)
      toast.success(savedId ? 'Notícia atualizada.' : 'Notícia criada.')
    } catch (e: unknown) {
      setUploadingStaged(false)
      const msg = apiErrorMessage(e, 'Erro ao salvar.')
      setError(msg)
      toast.error(msg)
    }
  }

  function handleBannerSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!isImageFile(file)) {
      toast.error(NOT_AN_IMAGE_MESSAGE)
      if (bannerInputRef.current) bannerInputRef.current.value = ''
      return
    }
    setBannerCropSrc(prev => { revokeBlobUrl(prev); return URL.createObjectURL(file) })
    if (bannerInputRef.current) bannerInputRef.current.value = ''
  }

  async function handleBannerCropConfirm(file: File) {
    setBannerCropSrc(prev => { revokeBlobUrl(prev); return null })
    if (!savedId) {
      // criação: guarda localmente, mostra preview e sobe após o create
      setStagedBannerFile(file)
      setBannerUrl(prev => {
        if (prev && isBlobUrl(prev)) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
      setSaved(false)
      return
    }
    try {
      const res = await uploadBanner.mutateAsync(file)
      const data = await res.json().catch(() => null)
      if (data?.url) setBannerUrl(data.url)
      else toast.error('Erro ao enviar o banner. Tente de novo.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao enviar o banner. Tente de novo.'))
    }
  }

  function tryClose() {
    if (!saved && form.title.trim()) setConfirmClose(true)
    else onClose()
  }

  const dateLabel = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* ── Top toolbar ── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background px-4 py-2.5">
        <Button variant="ghost" size="icon-sm" onClick={tryClose} className="shrink-0" aria-label="Voltar para a lista de notícias">
          <ArrowLeft className="size-4" />
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">
          {mode === 'create' ? 'Nova notícia' : `Editando notícia`}
        </span>
        {saved && (
          <span className="hidden shrink-0 items-center gap-1.5 text-xs text-success sm:flex">
            <span className="inline-block size-1.5 rounded-full bg-success" aria-hidden /> Salvo
          </span>
        )}
        <Select
          value={form.status}
          onValueChange={v => { setForm(p => ({ ...p, status: v as typeof form.status })); setSaved(false) }}
        >
          <SelectTrigger className="h-8 w-32 shrink-0" aria-label="Situação da notícia">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UNPUBLISHED">Rascunho</SelectItem>
            <SelectItem value="PUBLISHED">Publicado</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleSave} disabled={isPending} className="shrink-0">
          <Save />
          {isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* ── Quando publicar (só faz sentido com a notícia publicada) ── */}
      {form.status === 'PUBLISHED' && (
        <SchedulePanel
          value={form.schedule}
          onChange={schedule => { setForm(p => ({ ...p, schedule })); setSaved(false) }}
        />
      )}

      {/* ── Page body (mimics /noticias/$id) ── */}
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerSelect} />

        <ImageCropDialog
          src={bannerCropSrc}
          aspect={1440 / 600}
          outputWidth={1440}
          outputHeight={600}
          onConfirm={handleBannerCropConfirm}
          onCancel={() => setBannerCropSrc(prev => { revokeBlobUrl(prev); return null })}
        />

        {/* Banner */}
        <div className="mb-6">
          {bannerUrl ? (
            <div
              className="relative group/banner overflow-hidden rounded-xl cursor-pointer"
              onClick={() => bannerInputRef.current?.click()}
            >
              <img src={bannerUrl} alt="" className="w-full max-h-80 object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/banner:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                {/* Sobre a foto: texto branco no véu escuro, nos dois temas. */}
                <span className="flex items-center gap-2 text-sm font-medium text-white">
                  <ImageUp className="size-4" /> Trocar banner
                </span>
              </div>
            </div>
          ) : (
            <div
              className="flex h-44 cursor-pointer items-center justify-center rounded-xl border border-border bg-muted transition-colors hover:bg-accent"
              onClick={() => bannerInputRef.current?.click()}
            >
              <div className="pointer-events-none text-center text-muted-foreground">
                <ImageUp className="mx-auto mb-2 size-8 text-faint-foreground" aria-hidden />
                <p className="text-sm">Clique para adicionar banner</p>
              </div>
            </div>
          )}
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            Proporção ideal: 1440 × 600 px (a imagem será recortada nessa proporção)
            {!savedId && ' — o upload acontece ao salvar'}
          </p>
        </div>

        {/* Header */}
        <header className="mb-8">
          <input
            value={form.title}
            onChange={e => { setForm(p => ({ ...p, title: upperNoAccents(e.target.value) })); setSaved(false) }}
            placeholder="Título da notícia..."
            className="w-full border-b-2 border-transparent bg-transparent pb-1 text-2xl leading-tight font-semibold text-foreground outline-none transition-colors placeholder:text-faint-foreground hover:border-border focus:border-primary/50 md:text-3xl"
          />
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="size-3.5 text-faint-foreground" aria-hidden />
            {dateLabel}
          </p>
          <textarea
            value={form.summary}
            onChange={e => { setForm(p => ({ ...p, summary: upperNoAccents(e.target.value) })); setSaved(false) }}
            placeholder="Resumo da notícia (exibido nos cards e acima do conteúdo)..."
            rows={2}
            className="mt-4 w-full resize-none border-b border-l-4 border-transparent bg-transparent pb-1 pl-4 text-base leading-relaxed text-muted-foreground outline-none transition-colors placeholder:text-faint-foreground hover:border-border focus:border-primary/30"
          />
        </header>

        <Separator className="my-6" />

        {/* Content blocks */}
        <article className="space-y-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blockItems.map(i => i._id)}
              strategy={verticalListSortingStrategy}
            >
              {blockItems.map(item => (
                <SortableBlockWrapper
                  key={item._id}
                  item={item}
                  onRemove={() => removeBlock(item._id)}
                >
                  {item.type === 'paragraph' && (
                    <ParagraphEdit
                      block={item}
                      onChange={b => updateBlock(item._id, b)}
                    />
                  )}
                  {item.type === 'image' && (
                    <ImageEdit
                      block={item}
                      onChange={b => updateBlock(item._id, b)}
                      newsId={newsId}
                      stageFile={stageBlockFile}
                    />
                  )}
                  {item.type === 'image-text' && (
                    <ImageTextEdit
                      block={item}
                      onChange={b => updateBlock(item._id, b)}
                      newsId={newsId}
                      stageFile={stageBlockFile}
                    />
                  )}
                </SortableBlockWrapper>
              ))}
            </SortableContext>
          </DndContext>

          {/* Add block buttons */}
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock('paragraph')}>
              <AlignLeft /> Parágrafo
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock('image')}>
              <Image /> Imagem
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock('image-text')}>
              <LayoutTemplate /> Imagem + Texto
            </Button>
          </div>
        </article>

        {error && <div className="mt-6"><ErrorAlert message={error} /></div>}
      </div>

      <ConfirmCloseDialog
        open={confirmClose}
        onConfirm={() => { setConfirmClose(false); onClose() }}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  )
}

// ─── Admin news card ──────────────────────────────────────────────────────────

function AdminNewsCard({
  news, onEdit, onDelete, onUploadBanner,
}: {
  news: News
  onEdit: () => void
  onDelete: () => void
  onUploadBanner: () => void
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const date = news.publishedAt
    ? new Date(news.publishedAt).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null
  const scheduled = isScheduled(news.publishAt)
  const live = isNewsLive(news)
  const publicPath = `/noticias/${news.id}`

  async function copyPublicLink() {
    const ok = await copyText(`${window.location.origin}${publicPath}`)
    if (ok) toast.success('Link copiado.')
    else toast.error('Não foi possível copiar o link.')
  }

  return (
    <Card className="group gap-0 overflow-hidden py-0">
      <div className="relative flex h-36 items-center justify-center overflow-hidden bg-muted">
        {news.bannerUrl ? (
          <img
            src={news.bannerUrl}
            alt={news.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <Newspaper className="size-10 text-faint-foreground" aria-hidden />
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge variant={news.status === 'PUBLISHED' ? 'success' : 'neutral'}>
            {news.status === 'PUBLISHED' ? t('admin.news.published') : t('admin.news.draft')}
          </Badge>
          {/* Publicada, mas ainda fora do site até a hora marcada. */}
          {scheduled && news.publishAt && (
            <Badge variant="outline" className="gap-1 bg-background/90">
              <CalendarClock className="size-3" aria-hidden />
              {scheduleLabel(news.publishAt)}
            </Badge>
          )}
        </div>
      </div>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-foreground">{news.title}</h3>
        {news.summary && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{news.summary}</p>
        )}
        {date && <p className="text-xs text-faint-foreground">{date}</p>}
        {/* Editar é a ação do cartão; o resto (site, link, banner, excluir) fica nas ações. */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <PermissionButton
            allowed={can('UPDATE_NEWS')}
            noPermissionMessage="Sem permissão para editar notícias"
            variant="outline" size="sm"
            onClick={onEdit}
          >
            <Pencil /> Editar
          </PermissionButton>
          <RowActions
            label={`Ações da notícia ${news.title}`}
            actions={[
              // A página só abre no site depois de publicada e fora do agendamento.
              { label: 'Ver no site', icon: ExternalLink, hidden: !live, onClick: () => window.open(publicPath, '_blank', 'noopener,noreferrer') },
              { label: 'Copiar link', icon: Link2, hidden: !live, onClick: () => void copyPublicLink() },
              {
                label: 'Trocar banner', icon: ImageUp, onClick: onUploadBanner,
                disabled: !can('UPDATE_NEWS'), reason: 'Sem permissão para alterar banner',
              },
              {
                label: 'Excluir', icon: Trash2, destructive: true, onClick: onDelete,
                disabled: !can('DELETE_NEWS'), reason: 'Sem permissão para excluir notícias',
              },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Route component ──────────────────────────────────────────────────────────

const NEWS_LIMIT_OPTIONS = [6, 12, 24] as const

function RouteComponent() {
  const { t } = useTranslation()
  const deleteNews = useDeleteNews()
  const { can } = usePermissions()

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState<typeof NEWS_LIMIT_OPTIONS[number]>(6)
  const [statusFilter, setStatusFilter] = useState<'ALL' | AdminNewsStatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 350).trim()

  const { data: newsData, isLoading, isError, isFetching, refetch } = useAdminNews({
    page,
    limit,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    search: debouncedSearch || undefined,
  })
  const news       = newsData?.data       ?? []
  const totalNews  = newsData?.total      ?? 0
  const totalPages = newsData?.totalPages ?? 1
  const filtering = statusFilter !== 'ALL' || !!debouncedSearch

  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null)
  const [selectedNews, setSelectedNews] = useState<News | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<News | null>(null)
  const [bannerNewsId, setBannerNewsId] = useState<string | null>(null)
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null)

  const uploadBanner = useUploadNewsBanner(bannerNewsId ?? '')
  const bannerInputRef = useRef<HTMLInputElement>(null)

  function openCreate() {
    setSelectedNews(null)
    setEditorMode('create')
  }

  function openEdit(n: News) {
    setSelectedNews(n)
    setEditorMode('edit')
  }

  function openBanner(n: News) {
    setBannerNewsId(n.id)
    setTimeout(() => bannerInputRef.current?.click(), 50)
  }

  function handleBannerSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !bannerNewsId) return
    if (!isImageFile(file)) {
      toast.error(NOT_AN_IMAGE_MESSAGE)
      if (bannerInputRef.current) bannerInputRef.current.value = ''
      return
    }
    setBannerCropSrc(prev => { revokeBlobUrl(prev); return URL.createObjectURL(file) })
    if (bannerInputRef.current) bannerInputRef.current.value = ''
  }

  async function handleBannerCropConfirm(file: File) {
    setBannerCropSrc(prev => { revokeBlobUrl(prev); return null })
    if (!bannerNewsId) return
    try {
      await uploadBanner.mutateAsync(file)
      toast.success('Banner atualizado.')
    } catch { toast.error('Erro ao atualizar banner.') }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteNews.mutateAsync(deleteTarget.id)
      toast.success('Notícia excluída.')
      setDeleteTarget(null)
    } catch { toast.error('Erro ao excluir notícia.') }
  }

  // Full-screen editor overlay
  if (editorMode) {
    return (
      <NewsEditor
        mode={editorMode}
        news={selectedNews}
        onClose={() => { setEditorMode(null); setSelectedNews(null) }}
      />
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('admin.news.title')}
        description="Gerencie as notícias publicadas no site"
        help={<AjudaLink topico="noticias" titulo="Notícias" />}
        actions={
          <PermissionButton
            allowed={can('CREATE_NEWS')}
            noPermissionMessage="Sem permissão para criar notícias"
            onClick={openCreate}
          >
            <Plus className="size-4" /> {t('admin.news.newNews')}
          </PermissionButton>
        }
      />

      <FilterBar>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por título…"
            aria-label="Buscar notícias por título"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={v => { setStatusFilter(v as typeof statusFilter); setPage(1) }}
        >
          <SelectTrigger className="sm:w-44" aria-label="Filtrar por situação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="PUBLISHED">Publicadas</SelectItem>
            <SelectItem value="SCHEDULED">Agendadas</SelectItem>
            <SelectItem value="UNPUBLISHED">Não publicadas</SelectItem>
          </SelectContent>
        </Select>
        <FilterField label="Itens por página" className="sm:flex-row sm:items-center sm:gap-2">
          <Select
            value={String(limit)}
            onValueChange={v => { setLimit(Number(v) as typeof NEWS_LIMIT_OPTIONS[number]); setPage(1) }}
          >
            <SelectTrigger className="w-full sm:w-20" aria-label="Itens por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NEWS_LIMIT_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </FilterField>
      </FilterBar>

      <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerSelect} />

      <ImageCropDialog
        src={bannerCropSrc}
        aspect={1440 / 600}
        outputWidth={1440}
        outputHeight={600}
        onConfirm={handleBannerCropConfirm}
        onCancel={() => setBannerCropSrc(prev => { revokeBlobUrl(prev); return null })}
      />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <LoadErrorRetry
          className="rounded-xl border border-border bg-card"
          message="Não foi possível carregar as notícias."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )}

      {!isLoading && !isError && news.length === 0 && (
        filtering ? (
          <EmptyState
            framed
            icon={Search}
            title="Nenhuma notícia encontrada"
            description="Mude a busca ou a situação para ver outras notícias"
            action={
              <Button variant="outline" onClick={() => { setSearch(''); setStatusFilter('ALL'); setPage(1) }}>
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            framed
            icon={Newspaper}
            title="Nenhuma notícia cadastrada"
            description="Crie a primeira notícia para exibição no site"
            topico="noticias"
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> {t('admin.news.newNews')}
              </Button>
            }
          />
        )
      )}

      {!isLoading && news.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {news.map(n => (
              <AdminNewsCard
                key={n.id}
                news={n}
                onEdit={() => openEdit(n)}
                onDelete={() => setDeleteTarget(n)}
                onUploadBanner={() => openBanner(n)}
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={totalNews}
            limit={limit}
            onPageChange={setPage}
            showLimitSelector={false}
          />
        </>
      )}

      {/* Delete confirm */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Excluir notícia"
        description={
          <>
            {t('admin.news.deleteConfirm')}
            {deleteTarget?.title && (
              <span className="mt-2 block font-medium text-foreground">{deleteTarget.title}</span>
            )}
          </>
        }
        onConfirm={handleDelete}
        pending={deleteNews.isPending}
        confirmLabel={t('common.delete')}
        pendingLabel="Excluindo..."
        cancelLabel={t('common.cancel')}
      />
    </PageContainer>
  )
}
