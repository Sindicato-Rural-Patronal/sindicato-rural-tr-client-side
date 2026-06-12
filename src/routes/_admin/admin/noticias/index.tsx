import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionButton } from '@/components/PermissionButton'
import { useTranslation } from 'react-i18next'
import {
  useAdminNews, useCreateNews, useUpdateNews, useDeleteNews,
  useUploadNewsBanner, useUploadNewsBlockImage,
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { ConfirmCloseDialog } from '@/components/confirm-close-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/EmptyState'
import { ErrorAlert } from '@/components/ErrorAlert'
import type { News, ContentBlock, ParagraphBlock, ImageBlock, ImageTextBlock } from '@/@types/news'
import { parseBlocks, serializeBlocks } from '@/@types/news'

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
}: {
  onUploaded: (url: string) => void
  newsId: string
  label?: string
}) {
  const upload = useUploadNewsBlockImage(newsId)
  const ref = useRef<HTMLInputElement>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const res = await upload.mutateAsync(file)
      const data = await res.json()
      if (data.url) onUploaded(data.url)
    } catch { /* silent */ }
    if (ref.current) ref.current.value = ''
  }

  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        disabled={upload.isPending}
        onClick={e => { e.stopPropagation(); ref.current?.click() }}
      >
        <ImageUp className="size-3.5" />
        {upload.isPending ? 'Enviando...' : label}
      </Button>
    </>
  )
}

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
      <div className="flex flex-col items-center gap-0.5 mt-1 shrink-0 w-6 opacity-0 group-hover/block:opacity-100 transition-opacity">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted touch-none"
          tabIndex={-1}
          aria-label="Arrastar bloco"
        >
          <GripVertical className="size-4 text-muted-foreground" />
        </button>
        <button
          onClick={onRemove}
          className="p-0.5 rounded hover:bg-destructive/10 text-destructive/40 hover:text-destructive transition-colors"
          aria-label="Remover bloco"
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
      className="w-full bg-transparent text-base leading-relaxed text-foreground/90 resize-none outline-none placeholder:text-muted-foreground/30 border-b-2 border-transparent hover:border-border/40 focus:border-primary/50 transition-colors py-1 whitespace-pre-line"
    />
  )
}

function ImageEdit({
  block,
  onChange,
  newsId,
}: {
  block: ImageBlock
  onChange: (b: ImageBlock) => void
  newsId: string
}) {
  const isPending = newsId === '__pending__'
  return (
    <figure className="my-2">
      {block.url ? (
        <div className="relative group/img">
          <img
            src={block.url}
            alt={block.caption ?? ''}
            className="w-full rounded-xl object-cover max-h-[480px]"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
            {!isPending && (
              <BlockUploadButton
                newsId={newsId}
                onUploaded={url => onChange({ ...block, url })}
                label="Trocar imagem"
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed bg-muted">
          {isPending ? (
            <p className="text-xs text-muted-foreground text-center px-6">
              Salve a notícia primeiro para fazer upload de imagens
            </p>
          ) : (
            <BlockUploadButton
              newsId={newsId}
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
        className="mt-2 w-full bg-transparent text-center text-sm text-muted-foreground italic outline-none border-b border-transparent hover:border-border/40 focus:border-primary/40 transition-colors py-0.5"
      />
    </figure>
  )
}

function ImageTextEdit({
  block,
  onChange,
  newsId,
}: {
  block: ImageTextBlock
  onChange: (b: ImageTextBlock) => void
  newsId: string
}) {
  const isPending = newsId === '__pending__'
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
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
              {!isPending && (
                <BlockUploadButton
                  newsId={newsId}
                  onUploaded={url => onChange({ ...block, url })}
                  label="Trocar"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-36 items-center justify-center rounded-xl border-2 border-dashed bg-muted">
            {isPending ? (
              <p className="text-xs text-muted-foreground text-center px-4">Salve primeiro</p>
            ) : (
              <BlockUploadButton
                newsId={newsId}
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
        className="flex-1 bg-transparent text-base leading-relaxed text-foreground/90 resize-none outline-none placeholder:text-muted-foreground/30 border-b-2 border-transparent hover:border-border/40 focus:border-primary/50 transition-colors py-1"
      />
    </div>
  )
}

// ─── Full-screen news editor ──────────────────────────────────────────────────

type NewsForm = {
  title: string
  summary: string
  status: 'PUBLISHED' | 'UNPUBLISHED'
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
  })
  const [blockItems, setBlockItems] = useState<BlockItem[]>(() =>
    news
      ? toBlockItems(parseBlocks(news.content))
      : [{ type: 'paragraph', text: '', _id: genId() }]
  )
  const [savedId, setSavedId] = useState<string | null>(news?.id ?? null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(news?.bannerUrl ?? null)
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

  function removeBlock(id: string) {
    setBlockItems(items => items.filter(i => i._id !== id))
    setSaved(false)
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
  const isPending = createNews.isPending || updateNews.isPending || uploadBanner.isPending

  async function handleSave() {
    setError(null)
    if (!form.title.trim()) { setError('Título é obrigatório.'); return }
    const content = serializeBlocks(toBlocks(blockItems))
    try {
      if (!savedId) {
        const res = await createNews.mutateAsync({
          title: form.title,
          summary: form.summary || undefined,
          status: form.status,
          content,
        })
        const data = await res.json()
        setSavedId(data.id)
      } else {
        await updateNews.mutateAsync({
          title: form.title,
          summary: form.summary || undefined,
          status: form.status,
          content,
        })
      }
      setSaved(true)
      toast.success(savedId ? 'Notícia atualizada!' : 'Notícia criada!')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar.'
      setError(msg)
      toast.error(msg)
    }
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!savedId) { setError('Salve a notícia antes de adicionar banner.'); return }
    try {
      const res = await uploadBanner.mutateAsync(file)
      const data = await res.json()
      if (data?.url) setBannerUrl(data.url)
    } catch { /* silent */ }
    if (bannerInputRef.current) bannerInputRef.current.value = ''
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
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b px-4 py-2.5 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={tryClose} className="shrink-0 size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground truncate flex-1 min-w-0">
          {mode === 'create' ? 'Nova notícia' : `Editando notícia`}
        </span>
        {saved && (
          <span className="text-xs text-emerald-600 shrink-0 hidden sm:flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500 inline-block" /> Salvo
          </span>
        )}
        <Select
          value={form.status}
          onValueChange={v => { setForm(p => ({ ...p, status: v as typeof form.status })); setSaved(false) }}
        >
          <SelectTrigger className="h-8 w-32 text-xs shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UNPUBLISHED">Rascunho</SelectItem>
            <SelectItem value="PUBLISHED">Publicado</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleSave} disabled={isPending} className="shrink-0 h-8 gap-1.5">
          <Save className="size-3.5" />
          {isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* ── Page body (mimics /noticias/$id) ── */}
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />

        {/* Banner */}
        <div className="mb-6">
          {bannerUrl ? (
            <div
              className="relative group/banner overflow-hidden rounded-xl cursor-pointer"
              onClick={() => savedId && bannerInputRef.current?.click()}
            >
              <img src={bannerUrl} alt="" className="w-full max-h-80 object-cover" />
              {savedId && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/banner:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                  <span className="text-white text-sm font-medium flex items-center gap-2">
                    <ImageUp className="size-4" /> Trocar banner
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`flex h-44 items-center justify-center border-2 border-dashed rounded-xl bg-muted transition-colors ${savedId ? 'cursor-pointer hover:bg-muted/70' : ''}`}
              onClick={() => savedId && bannerInputRef.current?.click()}
            >
              <div className="text-center text-muted-foreground pointer-events-none">
                <ImageUp className="size-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">
                  {savedId ? 'Clique para adicionar banner' : 'Salve a notícia para adicionar banner'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Header */}
        <header className="mb-8">
          <input
            value={form.title}
            onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setSaved(false) }}
            placeholder="Título da notícia..."
            className="w-full bg-transparent border-none outline-none text-2xl font-bold leading-tight md:text-3xl placeholder:text-muted-foreground/30 border-b-2 border-transparent hover:border-border/40 focus:border-primary/50 transition-colors pb-1"
          />
          <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {dateLabel}
          </p>
          <textarea
            value={form.summary}
            onChange={e => { setForm(p => ({ ...p, summary: e.target.value })); setSaved(false) }}
            placeholder="Resumo da notícia (exibido nos cards e acima do conteúdo)..."
            rows={2}
            className="mt-4 w-full bg-transparent border-l-4 border-primary pl-4 italic text-base text-muted-foreground leading-relaxed resize-none outline-none placeholder:text-muted-foreground/30 border-b border-transparent hover:border-border/30 focus:border-primary/30 transition-colors pb-1"
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
                    />
                  )}
                  {item.type === 'image-text' && (
                    <ImageTextEdit
                      block={item}
                      onChange={b => updateBlock(item._id, b)}
                      newsId={newsId}
                    />
                  )}
                </SortableBlockWrapper>
              ))}
            </SortableContext>
          </DndContext>

          {/* Add block buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-dashed border-border/50">
            <Button
              type="button" variant="outline" size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => addBlock('paragraph')}
            >
              <AlignLeft className="size-3.5" /> Parágrafo
            </Button>
            <Button
              type="button" variant="outline" size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => addBlock('image')}
            >
              <Image className="size-3.5" /> Imagem
            </Button>
            <Button
              type="button" variant="outline" size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => addBlock('image-text')}
            >
              <LayoutTemplate className="size-3.5" /> Imagem + Texto
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

  return (
    <Card className="group overflow-hidden hover:shadow-md transition-all duration-200">
      <div className="relative h-36 bg-muted flex items-center justify-center overflow-hidden">
        {news.bannerUrl ? (
          <img
            src={news.bannerUrl}
            alt={news.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Newspaper className="size-10 text-muted-foreground/30" />
        )}
        <div className="absolute top-2 left-2">
          <Badge variant={news.status === 'PUBLISHED' ? 'default' : 'secondary'}>
            {news.status === 'PUBLISHED' ? t('admin.news.published') : t('admin.news.draft')}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4 flex flex-col gap-2">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2">{news.title}</h3>
        {news.summary && (
          <p className="text-xs text-muted-foreground line-clamp-2">{news.summary}</p>
        )}
        {date && <p className="text-xs text-muted-foreground">{date}</p>}
        <Separator className="my-1" />
        <div className="flex items-center gap-2 flex-wrap">
          <PermissionButton
            allowed={can('UPDATE_NEWS')}
            noPermissionMessage="Sem permissão para editar notícias"
            variant="outline" size="sm" className="h-7 text-xs gap-1"
            onClick={onEdit}
          >
            <Pencil className="size-3" /> Editar
          </PermissionButton>
          <PermissionButton
            allowed={can('UPDATE_NEWS')}
            noPermissionMessage="Sem permissão para alterar banner"
            variant="outline" size="sm" className="h-7 text-xs gap-1"
            onClick={onUploadBanner}
          >
            <ImageUp className="size-3" /> Banner
          </PermissionButton>
          <PermissionButton
            allowed={can('DELETE_NEWS')}
            noPermissionMessage="Sem permissão para excluir notícias"
            variant="ghost" size="sm"
            className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-3" /> Excluir
          </PermissionButton>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Route component ──────────────────────────────────────────────────────────

function RouteComponent() {
  const { t } = useTranslation()
  const { data: news = [], isLoading } = useAdminNews()
  const deleteNews = useDeleteNews()
  const { can } = usePermissions()

  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null)
  const [selectedNews, setSelectedNews] = useState<News | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<News | null>(null)
  const [bannerNewsId, setBannerNewsId] = useState<string | null>(null)

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

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !bannerNewsId) return
    try {
      await uploadBanner.mutateAsync(file)
      toast.success('Banner atualizado!')
    } catch { toast.error('Erro ao atualizar banner.') }
    if (bannerInputRef.current) bannerInputRef.current.value = ''
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
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('admin.news.title')}</h1>
          <p className="text-sm text-muted-foreground">Gerencie as notícias publicadas no site</p>
        </div>
        <PermissionButton
          allowed={can('CREATE_NEWS')}
          noPermissionMessage="Sem permissão para criar notícias"
          onClick={openCreate}
          className="shrink-0"
        >
          <Plus className="size-4" /> {t('admin.news.newNews')}
        </PermissionButton>
      </div>

      <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && news.length === 0 && (
        <EmptyState
          icon={Newspaper}
          title="Nenhuma notícia cadastrada"
          description="Crie a primeira notícia para exibição no site"
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" /> {t('admin.news.newNews')}
            </Button>
          }
        />
      )}

      {!isLoading && news.length > 0 && (
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
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir notícia</DialogTitle>
            <DialogDescription>{t('admin.news.deleteConfirm')}</DialogDescription>
          </DialogHeader>
          <p className="text-sm font-medium">{deleteTarget?.title}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteNews.isPending}
            >
              {deleteNews.isPending ? 'Excluindo...' : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
