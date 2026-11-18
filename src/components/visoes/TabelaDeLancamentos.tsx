// A lista de Lançamentos montada com as colunas da visão (decisão 007, seções 2 e
// 5). A visão Padrão sem mudança continua com a tabela de sempre (no arquivo da
// rota); esta é a das outras visões.
//
// O texto de cada célula vem da própria lista (`cells`, pedida com `fields`), do
// mesmo catálogo e da mesma função de célula da exportação: a tela e o arquivo
// saem iguais. Seis chaves têm realce, sempre a partir do lançamento cru: `number`
// (mono, "—" vazio), `date` (mono), `description` (ícone do tipo e os selos),
// `category` (ponto de cor), `account` (ícone na cor do caixa) e `amount` (sinal e
// cor). As larguras saem de `larguras.ts`: nenhuma palavra cortada (se não cabe,
// a tabela rola de lado).
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, Landmark, Receipt, Wallet } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/EmptyState'
import { STICKY_ACTIONS_CELL, STICKY_ACTIONS_ROW } from '@/lib/table-sticky-actions'
import { numeroValido } from '@/lib/finance-number'
import type { ColunaDaLista, FinanceTransaction } from '@/hooks/useFinance'
import { centsToBRL } from '@/utils/masks'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { cn } from '@/lib/utils'
import { sinal, textoDaCelula, textoNaTabela } from '@/components/visoes/lancamentos'
import {
  colunaInteira, larguraPedida, largurasDasColunas, medidorEstimado, palavras,
  type ColunaParaMedir, type Fonte, type Medidor,
} from '@/components/visoes/larguras'

/** "Ações": Editar e Repetir à vista e o "Mais" (3 × 32 px) com o respiro da célula. */
const LARGURA_ACOES = 108

function TipoIcone({ t }: { t: Pick<FinanceTransaction, 'type' | 'transferId'> }) {
  const Icone = t.transferId ? ArrowLeftRight : t.type === 'IN' ? ArrowUpCircle : t.type === 'OUT' ? ArrowDownCircle : Receipt
  const nome = t.transferId ? 'Transferência' : t.type === 'IN' ? 'Entrada' : t.type === 'OUT' ? 'Saída' : 'Só nota'
  return <Icone className="mt-0.5 size-4 shrink-0 text-faint-foreground" aria-label={nome} />
}
const valorClasse = (t: Pick<FinanceTransaction, 'type'>) =>
  t.type === 'IN' ? 'text-success' : t.type === 'OUT' ? 'text-destructive' : 'text-muted-foreground'

/** A coluna como a tela usa: o que a API mandou em `columns` (ou, enquanto não chega, o catálogo). */
export type ColunaDaTela = Pick<ColunaDaLista, 'key' | 'label' | 'type' | 'weight'>

function fonteDa(key: string): Fonte {
  if (key === 'number' || key === 'date') return 'mono-pequena'
  if (key === 'amount') return 'mono'
  if (key === 'description') return 'texto-forte'
  return 'texto'
}

/** O espaço do ícone do tipo, do ponto da categoria e do ícone do caixa. */
const EXTRA: Record<string, number> = { description: 24, category: 16, account: 20 }

/**
 * A largura mínima da coluna (com o respiro) de quem lê frase: a Descrição (144 px
 * de texto, ao lado do ícone) e o Nome (138 px) não ficam com uma ou duas palavras
 * por linha. Valem também quando a tabela rola.
 */
const PISO_DA_COLUNA: Record<string, number> = { description: 180, payeeName: 150 }

/**
 * A letra de verdade, pelo canvas; sem ele (testes), a estimativa. Antes de a fonte
 * da página carregar, o canvas mede com outra letra: aí a medida não fica guardada.
 */
function criarMedidor(fontesProntas: boolean): Medidor {
  const ctx = typeof document !== 'undefined' && !/jsdom/i.test(navigator.userAgent)
    ? document.createElement('canvas').getContext('2d')
    : null
  if (!ctx) return medidorEstimado
  const css = getComputedStyle(document.documentElement)
  const sans = css.getPropertyValue('--font-sans').trim() || 'sans-serif'
  const mono = css.getPropertyValue('--font-mono').trim() || 'monospace'
  const fontes: Record<Fonte, string> = {
    texto: `400 13px ${sans}`,
    'texto-forte': `500 13px ${sans}`,
    'mono-pequena': `500 12px ${mono}`,
    mono: `500 13px ${mono}`,
    cabecalho: `500 12px ${sans}`,
  }
  const cache = new Map<string, number>()
  return (texto, fonte) => {
    const chave = `${fonte}|${texto}`
    const pronto = cache.get(chave)
    if (pronto != null) return pronto
    ctx.font = fontes[fonte]
    const w = ctx.measureText(texto).width
    if (fontesProntas) cache.set(chave, w)
    return w
  }
}

/**
 * Texto de célula que quebra só entre palavras, em até duas linhas (como a Descrição
 * da lista de sempre; o resto some entre palavras, com "…"). Cada palavra é um bloco:
 * a coluna nunca é mais estreita que a maior palavra, e só um "token" muito longo
 * (e-mail, URL) termina em reticências. O texto inteiro fica no `title`.
 */
function TextoInteiro({ texto, className }: { texto: string; className?: string }) {
  const lista = palavras(texto)
  return (
    <span className={cn('line-clamp-2 [overflow-wrap:normal] break-normal', className)} title={texto}>
      {lista.map((p, i) => (
        <span key={i}>
          {i > 0 && ' '}
          <span className="inline-block max-w-full truncate align-top">{p}</span>
        </span>
      ))}
    </span>
  )
}

function Conteudo({ coluna, t, celula, selos, inteira }: {
  coluna: ColunaDaTela; t: FinanceTransaction; celula: string | undefined; selos: ReactNode; inteira: boolean
}) {
  const k = coluna.key
  switch (k) {
    case 'number':
      return numeroValido(t.number)
        ? <span className="num whitespace-nowrap text-xs font-medium text-foreground">{t.number}</span>
        : <span className="text-faint-foreground">—</span>
    case 'date':
      return <span className="num whitespace-nowrap text-xs text-muted-foreground">{formatDateFromString(t.date.slice(0, 10))}</span>
    case 'description':
      return (
        <span className="flex min-w-0 items-start gap-2 font-medium text-foreground">
          <TipoIcone t={t} />
          <span className="min-w-0 flex-1">
            <TextoInteiro texto={t.description} />
            {selos}
          </span>
        </span>
      )
    case 'category':
      return t.category ? (
        <span className="flex min-w-0 items-start gap-2 text-foreground">
          <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ backgroundColor: t.category.color }} aria-hidden />
          <TextoInteiro texto={t.category.name} className="min-w-0 flex-1" />
        </span>
      ) : <span className="text-faint-foreground">—</span>
    case 'account':
      return t.account ? (
        <span className="flex min-w-0 items-start gap-1.5 text-foreground">
          <Landmark className="mt-0.5 size-3.5 shrink-0" style={{ color: t.account.color }} aria-hidden />
          <TextoInteiro texto={t.account.name} className="min-w-0 flex-1" />
        </span>
      ) : <span className="text-faint-foreground">—</span>
    case 'amount':
      // O cabeçalho já diz "Valor (R$)": o valor vai sem o "R$", com sinal e cor.
      return <span className={cn('num whitespace-nowrap font-medium', valorClasse(t))}>{textoNaTabela('amount', t, celula)}</span>
    default:
      if (celula === undefined) return <Skeleton className="h-4 w-3/4" />
      if (!celula) return <span className="text-faint-foreground">—</span>
      return inteira
        ? <span className="block truncate whitespace-nowrap text-foreground" title={celula}>{celula}</span>
        : <TextoInteiro texto={celula} className="text-foreground" />
  }
}

type Props = {
  rows: FinanceTransaction[]
  /** As colunas da resposta (`columns`); null = ainda não chegou (usa `reserva`). */
  colunas: ColunaDaTela[] | null
  /** Enquanto a resposta não chega: as colunas pedidas, com os rótulos do catálogo. */
  reserva: ColunaDaTela[]
  isLoading: boolean
  vazio: { titulo: string; descricao: string }
  /** Nota, Recorrente, Mês fechado e comprovantes; null = nenhum. */
  selos: (t: FinanceTransaction) => ReactNode
  acoes: (t: FinanceTransaction) => ReactNode
}

/** A célula do lançamento na coluna `key` (as `cells` vêm na ordem de `columns`). */
function celulaDe(t: FinanceTransaction, indice: number): string | undefined {
  return t.cells?.[indice]
}

/** Computador (md+): a tabela com as colunas da visão. */
export function TabelaDeLancamentos({ rows, colunas, reserva, isLoading, vazio, selos, acoes }: Props) {
  const cols = colunas ?? reserva
  const caixa = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(0)
  // A fonte da página pode chegar depois da primeira medida: aí mede de novo.
  const [fontesProntas, setFontesProntas] = useState(
    () => typeof document === 'undefined' || !document.fonts || document.fonts.status === 'loaded',
  )
  useEffect(() => {
    if (fontesProntas || typeof document === 'undefined' || !document.fonts) return
    let vivo = true
    void document.fonts.ready.then(() => { if (vivo) setFontesProntas(true) })
    return () => { vivo = false }
  }, [fontesProntas])
  const medir = useMemo(() => criarMedidor(fontesProntas), [fontesProntas])

  useLayoutEffect(() => {
    const el = caixa.current
    if (!el) return
    const ler = () => setLargura(el.clientWidth)
    ler()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(ler)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { larguras, rola, total, inteiras } = useMemo(() => {
    const textos = cols.map((c, j) => rows.map(t => textoNaTabela(c.key, t, colunas ? celulaDe(t, j) : undefined)))
    const medidas = cols.map((c, j): ColunaParaMedir & { inteira: boolean } => ({
      ...c, fonte: fonteDa(c.key), extra: EXTRA[c.key], piso: PISO_DA_COLUNA[c.key], inteira: colunaInteira(c.type, textos[j]),
    }))
    const pisos = medidas.map((c, j) => larguraPedida(c, textos[j], medir))
    const disponivel = Math.max(0, (largura || 960) - LARGURA_ACOES - 2)
    return { ...largurasDasColunas(medidas, pisos, disponivel), inteiras: medidas.map(c => c.inteira) }
  }, [cols, colunas, rows, largura, medir])

  // Os selos vão na Descrição; sem ela, na primeira coluna.
  const colunaDosSelos = cols.some(c => c.key === 'description') ? 'description' : cols[0]?.key
  const sombra = rola ? 'shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.25)]' : ''

  return (
    <div ref={caixa} className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
      <Table className="table-fixed" style={rola ? { width: total + LARGURA_ACOES, minWidth: '100%' } : undefined}>
        <colgroup>
          {cols.map((c, i) => <col key={c.key} style={{ width: larguras[i] }} />)}
          <col style={{ width: LARGURA_ACOES }} />
        </colgroup>
        <TableHeader>
          <TableRow>
            {cols.map(c => (
              <TableHead key={c.key} className={cn('px-1.5 whitespace-normal align-bottom', c.key === 'amount' && 'text-right')}>
                {/* Sem corte: a coluna tem a largura do rótulo em duas linhas, quebrando entre palavras. */}
                <span className="block break-normal">{c.label}</span>
              </TableHead>
            ))}
            <TableHead className={cn('text-right', STICKY_ACTIONS_CELL, sombra)}>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              {cols.map(c => <TableCell key={c.key}><Skeleton className="h-4 w-3/4" /></TableCell>)}
              <TableCell><Skeleton className="ml-auto h-7 w-16" /></TableCell>
            </TableRow>
          ))}
          {!isLoading && rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={cols.length + 1} className="p-0 whitespace-normal">
                <EmptyState icon={Wallet} title={vazio.titulo} description={vazio.descricao} />
              </TableCell>
            </TableRow>
          )}
          {!isLoading && rows.map(t => {
            const s = selos(t)
            const blocoDeSelos = s ? <div className="mt-1 flex flex-wrap items-center gap-1 font-normal">{s}</div> : null
            return (
              <TableRow key={t.id} className={STICKY_ACTIONS_ROW}>
                {cols.map((c, j) => (
                  <TableCell key={c.key} className={cn('min-w-0 overflow-hidden px-1.5 align-top whitespace-normal pt-3 text-[13px]', c.key === 'amount' && 'text-right')}>
                    <Conteudo
                      inteira={inteiras[j]}
                      coluna={c}
                      t={t}
                      celula={colunas ? celulaDe(t, j) : undefined}
                      selos={c.key === 'description' ? blocoDeSelos : null}
                    />
                    {c.key !== 'description' && c.key === colunaDosSelos && blocoDeSelos}
                  </TableCell>
                ))}
                <TableCell className={cn('text-right align-top pt-1.5', STICKY_ACTIONS_CELL, sombra)}>
                  {acoes(t)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * Celular: o cartão montado com as colunas da visão. No topo, a Descrição (ou a
 * primeira coluna) e o Valor; embaixo, as outras como "Rótulo: valor", na ordem da
 * visão, com as ações no canto de baixo, ao lado das últimas linhas (sem linha em
 * branco antes delas).
 */
export function CartoesDeLancamentos({ rows, colunas, reserva, isLoading, vazio, selos, acoes }: Props) {
  const cols = colunas ?? reserva
  const topo = cols.some(c => c.key === 'description') ? 'description' : (cols.find(c => c.key !== 'amount') ?? cols[0])?.key
  const comValor = cols.some(c => c.key === 'amount')
  const resto = cols.map((c, j) => ({ c, j })).filter(({ c }) => c.key !== topo && c.key !== 'amount')
  const indiceDoTopo = cols.findIndex(c => c.key === topo)

  return (
    <div className="flex flex-col gap-2 md:hidden">
      {isLoading && Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-3"><Skeleton className="mb-2 h-4 w-40" /><Skeleton className="h-4 w-24" /></div>
      ))}
      {!isLoading && rows.length === 0 && <EmptyState framed icon={Wallet} title={vazio.titulo} description={vazio.descricao} />}
      {!isLoading && rows.map(t => {
        const s = selos(t)
        const textoDoTopo = topo ? textoDaCelula(topo, t, colunas ? celulaDe(t, indiceDoTopo) : undefined) : ''
        return (
          <div key={t.id} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex min-w-0 items-start gap-2 font-medium text-foreground">
                <TipoIcone t={t} />
                <span className="min-w-0 break-words">{textoDoTopo || '—'}</span>
              </span>
              {comValor && (
                <span className={cn('num whitespace-nowrap font-semibold', valorClasse(t))}>{sinal(t)}{centsToBRL(t.amountCents)}</span>
              )}
            </div>
            {s && <div className="flex flex-wrap items-center gap-1 text-xs">{s}</div>}
            {/* As linhas ocupam a largura toda; as ações flutuam à direita da última
                (o texto dela contorna os botões), sem uma linha só para elas. */}
            <dl className="flow-root text-xs leading-5">
              {resto.map(({ c, j }, n) => {
                const texto = textoDaCelula(c.key, t, colunas ? celulaDe(t, j) : undefined)
                return (
                  <div key={c.key} className="break-words">
                    {n === resto.length - 1 && <div className="float-right -mt-3 -mr-2 -mb-2 ml-2">{acoes(t)}</div>}
                    <dt className="inline text-muted-foreground">{c.label}: </dt>
                    <dd className="inline text-foreground">
                      {texto && texto !== '—' ? texto : <span className="text-faint-foreground">—</span>}
                    </dd>
                  </div>
                )
              })}
              {resto.length === 0 && <div className="-mt-1 -mr-2 -mb-2 flex justify-end">{acoes(t)}</div>}
            </dl>
          </div>
        )
      })}
    </div>
  )
}
