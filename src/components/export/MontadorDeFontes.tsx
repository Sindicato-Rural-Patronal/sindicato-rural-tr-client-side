import { lazy, Suspense, useEffect, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Columns3, Loader2 } from 'lucide-react'
import {
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { EXPORT_CATALOG_STALE_TIME, exportCatalogKey, fetchExportCatalog } from '@/hooks/useExportCatalog'
import type { ExportCatalog } from '@/components/export/report-builder'
import type { ReportBuilderProps } from '@/components/export/ReportBuilder'

// O montador de relatórios (decisão 006) aberto a partir de um menu: o do
// `ExportMenu` das listas (a fonte da lista e os extras com `builder`) e o
// "Exportar" das fichas de pessoa e de empresa. Cada fonte só aparece quando o
// catálogo dela carrega; o back velho e as fontes sem montador respondem 404 e
// o menu fica como antes.

// O montador (dnd-kit e companhia) só entra no pacote de quem abre. O pedaço
// começa a carregar quando o menu abre, e a mesma promessa serve ao `lazy`.
const importarMontador = () => import('@/components/export/ReportBuilder').then(m => ({ default: m.ReportBuilder }))
let montadorCarregando: ReturnType<typeof importarMontador> | null = null
function carregarMontador() {
  // Falhou (internet caiu)? A próxima abertura do menu tenta de novo.
  montadorCarregando ??= importarMontador().catch(e => { montadorCarregando = null; throw e })
  return montadorCarregando
}
const ReportBuilder = lazy(carregarMontador)

/**
 * Enquanto o pedaço do montador carrega (primeira vez, internet lenta): um
 * "Abrindo o montador…" por cima da tela, para ninguém clicar de novo. Só
 * aparece se demorar, para não piscar quando já está carregado.
 */
function AbrindoMontador() {
  const [visivel, setVisivel] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisivel(true), 150)
    return () => clearTimeout(t)
  }, [])
  if (!visivel) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
      <p role="status" className="flex items-center gap-2 rounded-lg border border-border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-float">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Abrindo o montador…
      </p>
    </div>
  )
}

/** Uma fonte que o menu oferece no montador: o item e o que o montador recebe. */
export type FonteDoMontador = Omit<ReportBuilderProps, 'open' | 'onOpenChange' | 'catalog'> & {
  /** Texto do item no menu ("Montar relatório…", "Ficha completa…"). */
  rotulo: string
  disabled?: boolean
}

/**
 * Qual fonte está aberta (`alvo`, a posição na lista) e quantas vezes abriu
 * (cada vez começa do zero). Fechado e nunca aberto: `{ aberto: false, vez: 0, alvo: 0 }`.
 */
export type AberturaDoMontador = { aberto: boolean; vez: number; alvo: number }

/** O catálogo de cada fonte, na mesma ordem (`undefined` carregando, `null` sem montador). */
function useCatalogos(fontes: FonteDoMontador[]): (ExportCatalog | null | undefined)[] {
  return useQueries({
    queries: fontes.map(f => ({
      queryKey: exportCatalogKey(f.dataset),
      queryFn: () => fetchExportCatalog(f.dataset),
      staleTime: EXPORT_CATALOG_STALE_TIME,
      gcTime: 2 * EXPORT_CATALOG_STALE_TIME,
    })),
  }).map(q => q.data)
}

/**
 * Os itens do montador dentro de um menu (com a linha de cima e, se houver, um
 * título). Só aparecem as fontes cujo catálogo carregou; sem nenhuma, nada.
 * Montados quando o menu abre, já começam a carregar o pedaço do montador.
 */
export function ItensDoMontador({ fontes, titulo, onAbrir }: {
  fontes: FonteDoMontador[]
  titulo?: string
  /** Posição da fonte escolhida em `fontes`. */
  onAbrir: (alvo: number) => void
}) {
  const catalogos = useCatalogos(fontes)
  const disponiveis = fontes.map((fonte, alvo) => ({ fonte, alvo })).filter(({ alvo }) => !!catalogos[alvo])
  const algum = disponiveis.length > 0
  useEffect(() => {
    if (algum) void carregarMontador().catch(() => {})
  }, [algum])
  if (!algum) return null
  return (
    <>
      <DropdownMenuSeparator />
      {titulo && <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{titulo}</DropdownMenuLabel>}
      {disponiveis.map(({ fonte, alvo }) => (
        <DropdownMenuItem key={`${alvo}-${fonte.rotulo}`} disabled={fonte.disabled} onSelect={() => onAbrir(alvo)}>
          <Columns3 className="size-4" />
          {fonte.rotulo}
        </DropdownMenuItem>
      ))}
    </>
  )
}

/**
 * O montador da fonte escolhida, fora do menu (o conteúdo do menu some ao
 * fechar). Carrega sob demanda, com "Abrindo o montador…" se demorar.
 */
export function MontadorAberto({ fontes, abertura, onOpenChange }: {
  fontes: FonteDoMontador[]
  abertura: AberturaDoMontador
  onOpenChange: (aberto: boolean) => void
}) {
  const catalogos = useCatalogos(fontes)
  const fonte = fontes[abertura.alvo]
  const catalogo = catalogos[abertura.alvo]
  if (!fonte || !catalogo || abertura.vez === 0) return null
  const { rotulo, disabled, ...props } = fonte
  return (
    <Suspense fallback={abertura.aberto ? <AbrindoMontador /> : null}>
      <ReportBuilder
        key={abertura.vez}
        {...props}
        catalog={catalogo}
        open={abertura.aberto}
        onOpenChange={onOpenChange}
      />
    </Suspense>
  )
}
