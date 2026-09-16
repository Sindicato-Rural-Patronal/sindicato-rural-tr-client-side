import { cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  ArrowDown, ArrowLeft, ArrowUp, ExternalLink, Eye, ImagePlus, Loader2, Plus, Save, Trash2, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { ConvenioPageView } from '@/components/convenio/ConvenioPageView'
import { apiErrorMessage } from '@/lib/api-error-message'
import { slugify, SLUG_PATTERN } from '@/lib/convenio-utils'
import { maskMoney, moneyToCents } from '@/utils/masks'
import { usePermissions } from '@/hooks/usePermissions'
import { useUnsavedGuard, confirmLeaveIfDirty } from '@/hooks/use-unsaved-guard'
import {
  useAdminConvenio, useCreateConvenio, useUpdateConvenio, useUploadConvenioLogo,
  type Convenio, type ConvenioInput,
} from '@/hooks/useConvenios'

// ── Estado do formulário ─────────────────────────────────────────────────────
// Listas carregam uma `key` local só pra o React não embaralhar os inputs ao
// reordenar/remover; ela não vai pra API.

let keySeq = 0
const nextKey = () => `k${++keySeq}`

type PriceRowForm = { key: string; label: string; price: string } // price mascarado "R$ 1.234,56"
type ItemForm = { key: string; value: string }

type FormState = {
  name: string
  slug: string
  slugTouched: boolean
  order: string
  isActive: boolean
  title: string
  subtitle: string
  intro: string
  priceLabelHeader: string
  priceValueHeader: string
  rows: PriceRowForm[]
  priceNote: string
  documentsTitle: string
  documents: ItemForm[]
  highlightsTitle: string
  highlights: ItemForm[]
  aboutTitle: string
  aboutText: string
}

const emptyForm = (): FormState => ({
  name: '', slug: '', slugTouched: false, order: '0', isActive: true,
  title: '', subtitle: '', intro: '',
  priceLabelHeader: 'Faixa etária', priceValueHeader: 'Valor sindicato',
  rows: [{ key: nextKey(), label: '', price: '' }],
  priceNote: '',
  documentsTitle: 'Documentos para adesão', documents: [],
  highlightsTitle: '', highlights: [],
  aboutTitle: '', aboutText: '',
})

function fromConvenio(c: Convenio): FormState {
  return {
    name: c.name, slug: c.slug, slugTouched: true, order: String(c.order), isActive: c.isActive,
    title: c.title, subtitle: c.subtitle ?? '', intro: c.intro ?? '',
    priceLabelHeader: c.priceLabelHeader, priceValueHeader: c.priceValueHeader,
    rows: c.priceRows.map(r => ({ key: nextKey(), label: r.label, price: maskMoney(String(r.priceCents)) })),
    priceNote: c.priceNote ?? '',
    documentsTitle: c.documentsTitle, documents: c.documents.map(value => ({ key: nextKey(), value })),
    highlightsTitle: c.highlightsTitle ?? '', highlights: c.highlights.map(value => ({ key: nextKey(), value })),
    aboutTitle: c.aboutTitle ?? '', aboutText: c.aboutText ?? '',
  }
}

/** Formulário → corpo da API. Linhas/itens totalmente vazios são descartados. */
function toInput(f: FormState): ConvenioInput {
  const text = (v: string) => (v.trim() ? v.trim() : null)
  const list = (items: ItemForm[]) => items.map(i => i.value.trim()).filter(Boolean)
  return {
    name: f.name.trim(),
    slug: f.slug.trim(),
    order: Number.parseInt(f.order, 10) || 0,
    isActive: f.isActive,
    title: f.title.trim(),
    subtitle: text(f.subtitle),
    intro: text(f.intro),
    priceLabelHeader: f.priceLabelHeader.trim() || 'Faixa etária',
    priceValueHeader: f.priceValueHeader.trim() || 'Valor',
    priceRows: f.rows
      .filter(r => r.label.trim() || moneyToCents(r.price) > 0)
      .map(r => ({ label: r.label.trim(), priceCents: moneyToCents(r.price) })),
    priceNote: text(f.priceNote),
    documentsTitle: f.documentsTitle.trim() || 'Documentos para adesão',
    documents: list(f.documents),
    highlightsTitle: text(f.highlightsTitle),
    highlights: list(f.highlights),
    aboutTitle: text(f.aboutTitle),
    aboutText: text(f.aboutText),
  }
}

function validate(input: ConvenioInput): string | null {
  if (!input.name) return 'Informe o nome do convênio.'
  if (!input.slug) return 'Informe o endereço da página.'
  if (!SLUG_PATTERN.test(input.slug)) return 'Endereço da página: use só letras minúsculas, números e hífens.'
  if (!input.title) return 'Informe o título da página.'
  if (input.priceRows.some(r => !r.label)) return 'Há linha na tabela de valores com valor mas sem a faixa.'
  return null
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

// ── Blocos de UI ─────────────────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b px-5 py-3">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </section>
  )
}

// Liga o <Label> ao campo: usa `htmlFor` quando o controle não é o filho direto
// (ex.: input dentro de um wrapper); senão injeta um id gerado no filho.
function Field({ label, hint, children, className = '', htmlFor }: {
  label: string; hint?: string; children: React.ReactNode; className?: string; htmlFor?: string
}) {
  const autoId = useId()
  const id = htmlFor ?? autoId
  const control = !htmlFor && isValidElement<{ id?: string }>(children) && !children.props.id
    ? cloneElement(children, { id })
    : children
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function RowButtons({ index, total, onMove, onRemove, disabled }: {
  index: number; total: number; onMove: (to: number) => void; onRemove: () => void; disabled: boolean
}) {
  return (
    <div className="flex shrink-0 items-center">
      <Button type="button" size="icon" variant="ghost" className="size-8" disabled={disabled || index === 0}
        onClick={() => onMove(index - 1)} aria-label="Mover para cima" title="Mover para cima">
        <ArrowUp className="size-4" />
      </Button>
      <Button type="button" size="icon" variant="ghost" className="size-8" disabled={disabled || index === total - 1}
        onClick={() => onMove(index + 1)} aria-label="Mover para baixo" title="Mover para baixo">
        <ArrowDown className="size-4" />
      </Button>
      <Button type="button" size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive"
        disabled={disabled} onClick={onRemove} aria-label="Remover" title="Remover">
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

function ListEditor({ items, onChange, placeholder, addLabel, disabled }: {
  items: ItemForm[]
  onChange: (items: ItemForm[]) => void
  placeholder: string
  addLabel: string
  disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={item.key} className="flex items-center gap-2">
          <Input
            value={item.value}
            disabled={disabled}
            placeholder={placeholder}
            onChange={e => onChange(items.map(x => (x.key === item.key ? { ...x, value: e.target.value } : x)))}
          />
          <RowButtons
            index={i}
            total={items.length}
            disabled={disabled}
            onMove={to => onChange(moveItem(items, i, to))}
            onRemove={() => onChange(items.filter(x => x.key !== item.key))}
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="self-start" disabled={disabled}
        onClick={() => onChange([...items, { key: nextKey(), value: '' }])}>
        <Plus className="size-4" /> {addLabel}
      </Button>
    </div>
  )
}

// ── Editor ───────────────────────────────────────────────────────────────────

/** Editor de convênio. Sem `id` cria um novo; com `id` edita o existente. */
export function ConvenioEditor({ id }: { id?: string }) {
  const isNew = !id
  const navigate = useNavigate()
  const { can, isLoading: permLoading } = usePermissions()
  const canSave = isNew ? can('CREATE_CONVENIO') : can('UPDATE_CONVENIO')
  const readOnly = !permLoading && !canSave

  const { data: convenio, isLoading, isError } = useAdminConvenio(id)
  const createM = useCreateConvenio()
  const updateM = useUpdateConvenio()
  const uploadLogoM = useUploadConvenioLogo()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(toInput(emptyForm())))
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  // Logo escolhido antes de o convênio existir: sobe logo depois de criar.
  const [stagedLogo, setStagedLogo] = useState<{ file: File; preview: string } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Carrega o convênio (uma vez por id) no formulário.
  const loadedId = useRef<string | null>(null)
  useEffect(() => {
    if (!convenio || loadedId.current === convenio.id) return
    loadedId.current = convenio.id
    const f = fromConvenio(convenio)
    setForm(f)
    setSnapshot(JSON.stringify(toInput(f)))
    setLogoUrl(convenio.logoUrl)
  }, [convenio])

  useEffect(() => () => { if (stagedLogo) URL.revokeObjectURL(stagedLogo.preview) }, [stagedLogo])

  const input = useMemo(() => toInput(form), [form])
  const dirty = JSON.stringify(input) !== snapshot || !!stagedLogo
  const saving = createM.isPending || updateM.isPending
  useUnsavedGuard(dirty && !saving)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function setName(name: string) {
    setForm(f => ({ ...f, name, slug: f.slugTouched ? f.slug : slugify(name) }))
  }

  function updateRow(key: string, patch: Partial<PriceRowForm>) {
    setForm(f => ({ ...f, rows: f.rows.map(r => (r.key === key ? { ...r, ...patch } : r)) }))
  }

  async function handleLogoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Escolha um arquivo de imagem (PNG, JPG, WEBP).')
      return
    }
    if (isNew) {
      setStagedLogo({ file, preview: URL.createObjectURL(file) })
      return
    }
    try {
      const r = await uploadLogoM.mutateAsync({ id: id!, file })
      setLogoUrl(r.logoUrl)
      toast.success('Logo atualizado.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao enviar o logo.'))
    }
  }

  async function handleRemoveLogo() {
    if (isNew) { setStagedLogo(null); return }
    if (!window.confirm('Remover o logo deste convênio?')) return
    try {
      await updateM.mutateAsync({ id: id!, body: { logoUrl: null } })
      setLogoUrl(null)
      toast.success('Logo removido.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao remover o logo.'))
    }
  }

  async function handleSave() {
    const problem = validate(input)
    if (problem) { toast.error(problem); return }
    try {
      if (isNew) {
        const created = await createM.mutateAsync(input)
        if (stagedLogo) {
          try {
            await uploadLogoM.mutateAsync({ id: created.id, file: stagedLogo.file })
          } catch (err) {
            toast.error(apiErrorMessage(err, 'Convênio criado, mas o logo não foi enviado. Tente de novo na edição.'))
          }
          setStagedLogo(null)
        }
        setSnapshot(JSON.stringify(input))
        toast.success('Convênio criado.')
        navigate({ to: '/admin/convenios/$id', params: { id: created.id }, replace: true })
      } else {
        const saved = await updateM.mutateAsync({ id: id!, body: input })
        const f = fromConvenio(saved)
        setForm(f)
        setSnapshot(JSON.stringify(toInput(f)))
        toast.success('Alterações salvas.')
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao salvar o convênio.'))
    }
  }

  if (!isNew && isLoading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    )
  }
  if (!isNew && (isError || !convenio)) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <LoadErrorBanner message="Convênio não encontrado ou erro ao carregar." />
        <Button asChild variant="outline" className="self-start">
          <Link to="/admin/convenios"><ArrowLeft className="size-4" /> Voltar para convênios</Link>
        </Button>
      </div>
    )
  }

  const shownLogo = stagedLogo?.preview ?? logoUrl
  const previewData = { ...input, logoUrl: shownLogo }

  return (
    <div className="p-6 flex flex-col gap-6 pb-28">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/admin/convenios"
            onClick={e => confirmLeaveIfDirty(dirty, e)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Convênios
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground truncate">
            {isNew ? 'Novo convênio' : form.name || 'Editar convênio'}
          </h1>
          {readOnly && <p className="text-sm text-muted-foreground">Somente leitura: você não tem permissão para salvar.</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="size-4" /> Pré-visualizar
          </Button>
          {!isNew && convenio?.isActive && (
            <Button asChild variant="outline">
              <a href={`/convenios/${convenio.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> Ver no site
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Identificação */}
      <Section title="Identificação" description="Como o convênio aparece no menu Convênios do site.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nome no menu *">
            <Input value={form.name} disabled={readOnly} maxLength={60} placeholder="Ex.: Unimed"
              onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Endereço da página *" htmlFor="convenio-slug" hint="Letras minúsculas, números e hífens. Mudar quebra links antigos.">
            <div className="flex items-center rounded-lg border border-input transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
              <span className="pl-3 text-sm text-muted-foreground select-none">/convenios/</span>
              <input
                id="convenio-slug"
                className="h-8 min-w-0 flex-1 bg-transparent px-1 text-base outline-none disabled:opacity-50 md:text-sm"
                value={form.slug}
                disabled={readOnly}
                maxLength={60}
                placeholder="unimed"
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase(), slugTouched: true }))}
                onBlur={() => set('slug', slugify(form.slug))}
              />
            </div>
          </Field>
          <Field label="Ordem no menu" hint="Menor aparece primeiro.">
            <Input type="number" min={0} max={9999} value={form.order} disabled={readOnly}
              onChange={e => set('order', e.target.value)} className="w-32" />
          </Field>
          <label className="flex items-center gap-2 self-center text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={form.isActive} disabled={readOnly}
              onChange={e => set('isActive', e.target.checked)} />
            <span>
              <span className="font-medium text-foreground">Ativo</span>
              <span className="block text-xs text-muted-foreground">Desmarque para tirar do site sem apagar.</span>
            </span>
          </label>
        </div>
      </Section>

      {/* Cabeçalho da página */}
      <Section title="Cabeçalho da página">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-24 w-44 shrink-0 items-center justify-center rounded-lg border bg-white p-2">
            {shownLogo
              ? <img src={shownLogo} alt="Logo do convênio" className="max-h-full max-w-full object-contain" />
              : <span className="text-xs text-muted-foreground">Sem logo</span>}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Logo do convênio (opcional). PNG com fundo transparente fica melhor. É reduzido automaticamente.
            </p>
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelected} />
              <Button type="button" variant="outline" size="sm" disabled={readOnly || uploadLogoM.isPending}
                onClick={() => fileRef.current?.click()}>
                {uploadLogoM.isPending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                {shownLogo ? 'Trocar logo' : 'Enviar logo'}
              </Button>
              {shownLogo && (
                <Button type="button" variant="ghost" size="sm" disabled={readOnly} onClick={handleRemoveLogo}>
                  <X className="size-4" /> Remover
                </Button>
              )}
            </div>
            {isNew && stagedLogo && <p className="text-xs text-muted-foreground">O logo será enviado ao salvar.</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Título *">
            <Input value={form.title} disabled={readOnly} maxLength={120} placeholder="Ex.: Tabela de valores / Unimed"
              onChange={e => set('title', e.target.value)} />
          </Field>
          <Field label="Subtítulo">
            <Input value={form.subtitle} disabled={readOnly} maxLength={160} placeholder="Ex.: Sindicato Rural de Terra Roxa - PR"
              onChange={e => set('subtitle', e.target.value)} />
          </Field>
        </div>
        <Field label="Texto de introdução" hint="Aparece acima da tabela. Opcional.">
          <Textarea rows={3} value={form.intro} disabled={readOnly} maxLength={2000}
            onChange={e => set('intro', e.target.value)} />
        </Field>
      </Section>

      {/* Tabela de valores */}
      <Section title="Tabela de valores" description="Linhas vazias são ignoradas ao salvar.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Cabeçalho da 1ª coluna">
            <Input value={form.priceLabelHeader} disabled={readOnly} maxLength={40}
              onChange={e => set('priceLabelHeader', e.target.value)} />
          </Field>
          <Field label="Cabeçalho da 2ª coluna">
            <Input value={form.priceValueHeader} disabled={readOnly} maxLength={40}
              onChange={e => set('priceValueHeader', e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          {form.rows.map((row, i) => (
            <div key={row.key} className="flex items-center gap-2">
              <Input className="flex-1" value={row.label} disabled={readOnly} maxLength={60} placeholder="Ex.: 0 a 18 anos"
                aria-label={`Faixa da linha ${i + 1}`} onChange={e => updateRow(row.key, { label: e.target.value })} />
              <Input className="w-36 text-right tabular-nums" inputMode="numeric" value={row.price} disabled={readOnly}
                placeholder="R$ 0,00" aria-label={`Valor da linha ${i + 1}`}
                onChange={e => updateRow(row.key, { price: maskMoney(e.target.value) })} />
              <RowButtons
                index={i}
                total={form.rows.length}
                disabled={readOnly}
                onMove={to => set('rows', moveItem(form.rows, i, to))}
                onRemove={() => set('rows', form.rows.filter(r => r.key !== row.key))}
              />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="self-start" disabled={readOnly}
            onClick={() => set('rows', [...form.rows, { key: nextKey(), label: '', price: '' }])}>
            <Plus className="size-4" /> Adicionar linha
          </Button>
        </div>
        <Field label="Observação abaixo da tabela" hint='Ex.: "Valores mensais por beneficiário, vigentes a partir de 01/2026."'>
          <Textarea rows={2} value={form.priceNote} disabled={readOnly} maxLength={500}
            onChange={e => set('priceNote', e.target.value)} />
        </Field>
      </Section>

      {/* Documentos */}
      <Section title="Documentos para adesão">
        <Field label="Título da lista">
          <Input value={form.documentsTitle} disabled={readOnly} maxLength={60}
            onChange={e => set('documentsTitle', e.target.value)} className="md:max-w-md" />
        </Field>
        <ListEditor items={form.documents} onChange={v => set('documents', v)} disabled={readOnly}
          placeholder="Ex.: RG" addLabel="Adicionar documento" />
      </Section>

      {/* Destaques + texto institucional */}
      <Section title="Sobre o convênio" description="Bloco abaixo da tabela. Tudo opcional.">
        <Field label="Título dos destaques">
          <Input value={form.highlightsTitle} disabled={readOnly} maxLength={60} placeholder="Ex.: Estrutura Unimed"
            onChange={e => set('highlightsTitle', e.target.value)} className="md:max-w-md" />
        </Field>
        <ListEditor items={form.highlights} onChange={v => set('highlights', v)} disabled={readOnly}
          placeholder="Ex.: 116 mil médicos cooperados" addLabel="Adicionar destaque" />
        <Field label="Título do texto">
          <Input value={form.aboutTitle} disabled={readOnly} maxLength={160}
            onChange={e => set('aboutTitle', e.target.value)} />
        </Field>
        <Field label="Texto" hint="Deixe uma linha em branco entre os parágrafos.">
          <Textarea rows={6} value={form.aboutText} disabled={readOnly} maxLength={4000}
            onChange={e => set('aboutText', e.target.value)} />
        </Field>
      </Section>

      {/* Barra de ações fixa */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur md:left-(--sidebar-width)"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-end gap-2 px-6 py-3">
          {dirty && !readOnly && <span className="mr-auto text-sm text-muted-foreground">Alterações não salvas</span>}
          <Button asChild variant="ghost">
            <Link to="/admin/convenios" onClick={e => confirmLeaveIfDirty(dirty, e)}>Cancelar</Link>
          </Button>
          <Button type="button" onClick={handleSave} disabled={readOnly || saving || (!dirty && !isNew)}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isNew ? 'Criar convênio' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Pré-visualização */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-6xl">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Pré-visualização</DialogTitle>
            <DialogDescription>Como a página vai aparecer no site com o conteúdo atual (antes de salvar).</DialogDescription>
          </DialogHeader>
          <div className="border-t">
            <ConvenioPageView convenio={previewData} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
