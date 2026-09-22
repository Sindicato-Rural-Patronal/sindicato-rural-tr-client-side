import { createFileRoute, Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { CalendarDays, ExternalLink, Loader2, Minus, Repeat, Save, Sun, Sunset, TrendingDown, TrendingUp } from 'lucide-react'
import { useAdminMarketQuotes, useSaveDailyQuotes, useUpdateQuoteUnit, type MarketQuote } from '@/hooks/useMarketQuotes'
import { usePublicSiteSettings, useUpdateQuotesSource } from '@/hooks/useSiteSettings'
import { usePermissions } from '@/hooks/usePermissions'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { apiErrorMessage } from '@/lib/api-error-message'
import {
  QUOTE_PERIOD_LABEL, QUOTE_UNIT_OPTIONS, currentQuotePeriod, quoteProductLabel, trendOf, type QuotePeriod,
} from '@/lib/quote-utils'
import {
  QUOTE_DEVIATION_PERCENT, findQuoteDeviations, formatQuoteChange, type QuoteDeviation,
} from '@/lib/quote-price-check'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { centsToBRL, maskMoney, moneyToCents } from '@/utils/masks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { NoPermission } from '@/components/NoPermission'
import { AjudaLink } from '@/components/ajuda/AjudaLink'

export const Route = createFileRoute('/_admin/admin/cotacoes/')({
  component: RouteComponent,
})

const PERIOD_ICON = { MORNING: Sun, AFTERNOON: Sunset } as const

/** 1 → "1 cotação lançada"; 3 → "3 cotações lançadas". */
function countLabel(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function Variation({ value }: { value: string | null }) {
  if (!value) return null
  const trend = trendOf(value)
  const Icon = trend === 'down' ? TrendingDown : trend === 'up' ? TrendingUp : Minus
  const color = trend === 'down'
    ? 'text-red-600 dark:text-red-400'
    : trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${color}`}>
      <Icon className="size-3" /> {value}
    </span>
  )
}

function LastEntry({ q }: { q: MarketQuote }) {
  if (q.priceCents == null) return <span className="text-sm text-muted-foreground">Sem lançamento ainda</span>
  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium tabular-nums text-foreground">{q.value}</span>
      <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        {q.referenceDate && <span>{formatDateFromString(q.referenceDate)}</span>}
        {q.period && <span>· {QUOTE_PERIOD_LABEL[q.period]}</span>}
        {q.variation && <span>·</span>}
        <Variation value={q.variation} />
      </span>
    </div>
  )
}

// Fonte mostrada na faixa da home e na página pública de histórico.
function QuotesSourceCard({ canEdit }: { canEdit: boolean }) {
  const { data: settings, isLoading } = usePublicSiteSettings()
  const update = useUpdateQuotesSource()
  const [draft, setDraft] = useState<string | null>(null)
  const saved = settings?.quotesSource ?? ''
  const value = draft ?? saved
  const dirty = draft != null && draft.trim() !== saved

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      await update.mutateAsync(value.trim())
      setDraft(null)
      toast.success(value.trim() ? 'Fonte das cotações salva.' : 'Fonte removida do site.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao salvar a fonte.'))
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Fonte e histórico</CardTitle>
        <p className="text-sm text-muted-foreground">
          A fonte aparece ao lado das cotações no site. Deixe vazio para não mostrar.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="quotes-source" className="text-xs font-medium text-muted-foreground">Fonte exibida no site</label>
            <Input
              id="quotes-source"
              className="h-9"
              maxLength={80}
              placeholder="Ex.: Cvale"
              disabled={!canEdit || isLoading || update.isPending}
              value={value}
              onChange={e => setDraft(e.target.value)}
            />
          </div>
          {canEdit && (
            <Button type="submit" variant="outline" disabled={!dirty || update.isPending}>
              {update.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar fonte
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link to="/cotacoes" target="_blank">
              <ExternalLink className="size-4" /> Ver histórico no site
            </Link>
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function RouteComponent() {
  const { can, isLoading: permLoading } = usePermissions()
  const { data: quotes, isLoading, isError } = useAdminMarketQuotes({
    enabled: !permLoading && can('READ_MARKET_QUOTE'),
  })
  const save = useSaveDailyQuotes()
  const updateUnit = useUpdateQuoteUnit()
  const canEdit = can('UPDATE_MARKET_QUOTE')
  const list = quotes ?? []

  const [period, setPeriod] = useState<QuotePeriod>(() => currentQuotePeriod())
  // Preço digitado por produto (texto mascarado "R$ 1.234,56"); vazio = não muda.
  const [prices, setPrices] = useState<Record<string, string>>({})
  // Unidade escolhida por produto ('' = sem unidade). Só vai para o site no "Salvar".
  const [units, setUnits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  // Erros do último "Salvar", por produto; e o erro geral do lançamento dos preços.
  const [rowErrors, setRowErrors] = useState<Record<string, string[]>>({})
  const [priceError, setPriceError] = useState<string | null>(null)
  // Preços muito diferentes do último lançado, aguardando confirmação.
  const [deviations, setDeviations] = useState<QuoteDeviation[] | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const saveButtonRef = useRef<HTMLButtonElement>(null)
  // "Corrigir" no aviso: produto que recebe o foco quando o aviso fecha.
  const fixTargetRef = useRef<string | null>(null)

  const filled = list
    .map(q => ({ q, cents: moneyToCents(prices[q.id] ?? '') }))
    .filter(f => f.cents > 0)
  const unitChanges = list.filter(q => units[q.id] !== undefined && units[q.id] !== (q.unit ?? ''))
  const dirty = filled.length > 0 || unitChanges.length > 0
  useUnsavedGuard(dirty && !saving)

  const todayRaw = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1)
  const periodLabel = QUOTE_PERIOD_LABEL[period].toLowerCase()

  function clearRowError(id: string) {
    if (!rowErrors[id]) return
    setRowErrors(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!dirty || saving) return
    // Erro de digitação vai direto para o site: preço muito diferente do último pede confirmação.
    const found = findQuoteDeviations(filled.map(({ q, cents }) => ({
      id: q.id, label: quoteProductLabel(q.label), lastCents: q.priceCents, newCents: cents,
    })))
    if (found.length > 0) {
      setDeviations(found)
      return
    }
    void saveAll()
  }

  async function saveAll() {
    setDeviations(null)
    setSaving(true)
    setPriceError(null)
    const errors: Record<string, string[]> = {}
    const addError = (id: string, msg: string) => { errors[id] = [...(errors[id] ?? []), msg] }

    // 1) Unidades primeiro: o texto do preço lançado em seguida já sai com a unidade nova.
    let unitsSaved = 0
    const failedUnits: { q: MarketQuote; msg: string }[] = []
    for (const q of unitChanges) {
      try {
        await updateUnit.mutateAsync({ id: q.id, unit: units[q.id] || null })
        unitsSaved++
      } catch (err) {
        const msg = apiErrorMessage(err, 'Erro ao trocar a unidade.')
        failedUnits.push({ q, msg })
        addError(q.id, `Unidade não foi trocada: ${msg}`)
      }
    }
    // Tira do rascunho só as unidades já salvas; as que falharam continuam para tentar de novo.
    const failedUnitIds = new Set(failedUnits.map(f => f.q.id))
    setUnits(prev => {
      const next = { ...prev }
      for (const q of unitChanges) if (!failedUnitIds.has(q.id)) delete next[q.id]
      return next
    })

    // 2) Preços (um envio só para todos os produtos preenchidos).
    let pricesSaved = 0
    let pricesMsg: string | null = null
    if (filled.length > 0) {
      try {
        await save.mutateAsync({
          period,
          prices: filled.map(({ q, cents }) => ({ id: q.id, priceCents: cents })),
        })
        pricesSaved = filled.length
        setPrices({})
      } catch (err) {
        pricesMsg = apiErrorMessage(err, 'Erro ao lançar as cotações.')
        for (const { q } of filled) addError(q.id, 'Preço não foi lançado.')
      }
    }

    setSaving(false)
    setRowErrors(errors)
    setPriceError(pricesMsg ? `Preços não lançados: ${pricesMsg}` : null)

    const savedParts = [
      pricesSaved > 0 && `${countLabel(pricesSaved, 'cotação lançada', 'cotações lançadas')} (${periodLabel})`,
      unitsSaved > 0 && countLabel(unitsSaved, 'unidade trocada', 'unidades trocadas'),
    ].filter((p): p is string => !!p)

    if (failedUnits.length === 0 && !pricesMsg) {
      toast.success(`${capitalize(savedParts.join(' e '))}.`)
      return
    }
    const lines = [
      ...failedUnits.map(({ q, msg }) => `${quoteProductLabel(q.label)}: unidade não foi trocada (${msg})`),
      ...(pricesMsg ? [`Preços não lançados: ${pricesMsg}`] : []),
      ...(savedParts.length > 0 ? [`Salvo: ${savedParts.join(' e ')}.`] : []),
    ]
    toast.error('Nem tudo foi salvo.', {
      description: (
        <ul className="list-disc pl-4">
          {lines.map(l => <li key={l}>{l}</li>)}
        </ul>
      ),
    })
  }

  function changeUnit(q: MarketQuote, value: string) {
    setUnits(prev => ({ ...prev, [q.id]: value }))
    clearRowError(q.id)
  }

  function changePrice(q: MarketQuote, value: string) {
    setPrices(prev => ({ ...prev, [q.id]: maskMoney(value) }))
    clearRowError(q.id)
  }

  function repeatLast(q: MarketQuote) {
    if (q.priceCents == null) return
    changePrice(q, String(q.priceCents))
    inputRefs.current[q.id]?.focus()
  }

  // Enter num preço não envia: vai para o próximo produto (no último, para o botão Salvar).
  function handlePriceKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const next = list[index + 1]
    const target = next ? inputRefs.current[next.id] : saveButtonRef.current
    target?.focus()
  }

  if (!permLoading && !can('READ_MARKET_QUOTE')) {
    return <NoPermission message="Você não tem permissão para ver as cotações." />
  }

  const pendingParts = [
    filled.length > 0 && `${countLabel(filled.length, 'produto', 'produtos')} para lançar como ${periodLabel} de hoje`,
    unitChanges.length > 0 && `${countLabel(unitChanges.length, 'unidade', 'unidades')} para trocar`,
  ].filter((p): p is string => !!p)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <div className="flex items-center gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cotações</h1>
          <AjudaLink topico="cotacoes" titulo="Cotações" />
        </div>
        <p className="text-sm text-muted-foreground">
          Produtos fixos exibidos na página inicial. Lance só os preços e o período — a data é a de hoje.
        </p>
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar cotações." />}

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Lançamento de hoje</CardTitle>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="size-3.5" /> {today}
              </p>
            </div>
            <div role="radiogroup" aria-label="Período" className="inline-flex rounded-lg border border-border p-0.5">
              {(Object.keys(QUOTE_PERIOD_LABEL) as QuotePeriod[]).map(p => {
                const Icon = PERIOD_ICON[p]
                const active = period === p
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!canEdit || saving}
                    onClick={() => setPeriod(p)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="size-4" /> {QUOTE_PERIOD_LABEL[p]}
                  </button>
                )
              })}
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-0 p-0">
            <div className="hidden grid-cols-[0.8fr_1.6fr_1.4fr] gap-4 border-y border-border bg-muted/40 px-6 py-2 text-xs font-medium text-muted-foreground sm:grid">
              <span>Produto</span>
              <span>Último lançamento</span>
              <span>Novo preço e unidade</span>
            </div>

            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 border-b border-border px-6 py-4 sm:grid-cols-[0.8fr_1.6fr_1.4fr] sm:gap-4">
                <Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-40" /><Skeleton className="h-9 w-full" />
              </div>
            ))}

            {list.map((q, index) => {
              const inputId = `quote-${q.id}`
              const unitValue = units[q.id] ?? q.unit ?? ''
              const unitChanged = unitValue !== (q.unit ?? '')
              const errors = rowErrors[q.id]
              return (
                <div key={q.id} className="grid grid-cols-1 items-center gap-2 border-b border-border px-6 py-4 last:border-b-0 sm:grid-cols-[0.8fr_1.6fr_1.4fr] sm:gap-4">
                  <label htmlFor={inputId} className="text-sm font-semibold text-foreground">{quoteProductLabel(q.label)}</label>
                  <div className="flex items-center justify-between gap-3">
                    <LastEntry q={q} />
                    {canEdit && q.priceCents != null && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0"
                        disabled={saving}
                        title="Preencher o novo preço com o último lançado"
                        onClick={() => repeatLast(q)}
                      >
                        <Repeat className="size-3.5" /> Repetir último
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Input
                        ref={el => { inputRefs.current[q.id] = el }}
                        id={inputId}
                        className="h-9 tabular-nums"
                        inputMode="numeric"
                        enterKeyHint="next"
                        placeholder="R$ 0,00"
                        disabled={!canEdit || saving}
                        aria-invalid={errors ? true : undefined}
                        value={prices[q.id] ?? ''}
                        onChange={e => changePrice(q, e.target.value)}
                        onKeyDown={e => handlePriceKeyDown(e, index)}
                      />
                      <NativeSelect
                        aria-label={`Unidade de ${quoteProductLabel(q.label)}`}
                        className={`h-9 w-36 shrink-0 px-2 ${unitChanged ? 'border-amber-500 dark:border-amber-400' : ''}`}
                        disabled={!canEdit || saving}
                        value={unitValue}
                        onChange={e => changeUnit(q, e.target.value)}
                      >
                        {QUOTE_UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        {q.unit && !QUOTE_UNIT_OPTIONS.some(o => o.value === q.unit) && <option value={q.unit}>{q.unit}</option>}
                      </NativeSelect>
                    </div>
                    {unitChanged && !errors && (
                      <span className="text-xs text-amber-700 dark:text-amber-400">
                        Unidade alterada — vale no site depois de salvar.
                      </span>
                    )}
                    {errors && <span role="alert" className="text-xs text-destructive">{errors.join(' ')}</span>}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {canEdit && (
          <div className="mt-4 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            <span className="text-sm text-muted-foreground">
              {pendingParts.length === 0
                ? 'Preencha o preço dos produtos que mudaram; os outros ficam como estão.'
                : `${capitalize(pendingParts.join(' e '))}.`}
            </span>
            <Button ref={saveButtonRef} type="submit" disabled={!dirty || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar cotações
            </Button>
          </div>
        )}
        {priceError && <p role="alert" className="mt-2 text-sm text-destructive sm:text-right">{priceError}</p>}
      </form>

      <QuotesSourceCard canEdit={canEdit} />

      <AlertDialog open={deviations !== null} onOpenChange={open => { if (!open) setDeviations(null) }}>
        <AlertDialogContent
          className="sm:max-w-lg"
          onCloseAutoFocus={e => {
            const id = fixTargetRef.current
            if (!id) return
            // "Corrigir": volta para o preço do primeiro produto da lista, já selecionado.
            e.preventDefault()
            fixTargetRef.current = null
            inputRefs.current[id]?.focus()
            inputRefs.current[id]?.select()
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Conferir {deviations?.length === 1 ? 'preço' : 'preços'}</AlertDialogTitle>
            <AlertDialogDescription>
              {deviations?.length === 1 ? 'Este preço está' : 'Estes preços estão'} mais de {QUOTE_DEVIATION_PERCENT}% diferente
              {deviations?.length === 1 ? '' : 's'} do último lançamento. Confira se não houve erro de digitação — o valor vai direto para o site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Produto</th>
                  <th className="px-3 py-2 text-right font-medium">Último</th>
                  <th className="px-3 py-2 text-right font-medium">Novo</th>
                  <th className="px-3 py-2 text-right font-medium">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {(deviations ?? []).map(d => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-foreground">{d.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{centsToBRL(d.lastCents)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">{centsToBRL(d.newCents)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-amber-700 dark:text-amber-400">{formatQuoteChange(d.change)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { fixTargetRef.current = deviations?.[0]?.id ?? null }}>
              Corrigir
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void saveAll()}>Salvar mesmo assim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
