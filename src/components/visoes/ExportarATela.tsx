// "Exportar o que está na tela" (decisão 007, seção 4). Sem escolha de campos: leva
// as colunas da tela, na ordem da tela, com os filtros e a ordem da tela. Um clique
// baixa. É a exportação de sempre (`POST /admin/export/:dataset`) com `fields` = as
// colunas e `visao` = o nome da visão ("Contabilidade (alterada)"): o PDF e o Excel
// dizem "Visão: …", e a auditoria guarda o nome.
//
// Computador: Popover com o resumo e 4 botões iguais lado a lado (CSV, Excel, PDF,
// Imprimir). Celular: folha de baixo com CSV, Excel e PDF (sem Imprimir, como no
// montador). Genérico (fonte, catálogo e filtros por props) para as próximas listas.
import { useState } from 'react'
import { toast } from 'sonner'
import { FileDown, FileSpreadsheet, FileText, Info, Loader2, Printer, Sheet as SheetIcon, ShieldAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import {
  RelatorioVazioError, exportErrorMessage, exportarRelatorio, type ExportDataset, type ExportParams,
} from '@/lib/export'
import {
  AVISO_COLUNAS_PDF, avisoDadosPessoais, textoDoBaixado, type ExportCatalog, type ReportState,
} from '@/components/export/report-builder'
import { pdfDesligado } from '@/components/visoes/visoes'
import { cn } from '@/lib/utils'

type Formato = 'csv' | 'xlsx' | 'pdf' | 'print'

type Props = {
  dataset: ExportDataset
  catalog: ExportCatalog | null
  cols: string[]
  /** Os filtros e a ordem da tela, sem página nem limite (os do "Todos" de sempre). */
  filtros: ExportParams
  /** Os filtros em palavras ("Período: 01/10/2026 a 31/10/2026 · Tipo: Entrada"). */
  filtrosTexto: string[]
  total: number | undefined
  /** "Contabilidade (alterada)", para o resumo. */
  visaoRotulo: string
  /** O nome da visão para a API (`visao`, até 64). */
  visao: string | undefined
  /** "lançamento"/"lançamentos" no resumo. */
  nomes: { um: string; varios: string }
  /** O que a tela sabe dos totais do arquivo ("O Excel e o PDF trazem o total de entradas no fim."). */
  textoDosTotais?: string | null
  celular: boolean
  disabled?: boolean
  className?: string
}

const milhar = (n: number) => n.toLocaleString('pt-BR')

export function ExportarATela({
  dataset, catalog, cols, filtros, filtrosTexto, total, visaoRotulo, visao, nomes, textoDosTotais, celular,
  disabled = false, className,
}: Props) {
  const [aberto, setAberto] = useState(false)
  const [baixando, setBaixando] = useState<Formato | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const motivoDoPdf = pdfDesligado(total, catalog)
  const pessoais = catalog ? avisoDadosPessoais({ fields: cols } as ReportState, catalog) : null
  const nenhum = total === 0

  async function baixar(formato: Formato) {
    if (baixando) return
    setErro(null)
    const imprimir = formato === 'print'
    let aba: Window | null = null
    if (imprimir) {
      // Aberta no clique: depois de esperar a API, o navegador a bloquearia.
      aba = window.open('', '_blank')
      if (aba) {
        aba.opener = null
        try { aba.document.body.textContent = 'Gerando o relatório… O PDF abre nesta aba quando ficar pronto.' } catch { /* só o texto */ }
      }
    }
    setBaixando(formato)
    try {
      const { count, abriuAba } = await exportarRelatorio(dataset, filtros, imprimir ? 'pdf' : formato, {
        fields: cols,
        visao,
        print: imprimir,
        printWindow: aba,
        recusarVazio: true,
      })
      toast.success(imprimir
        ? abriuAba ? 'Relatório aberto em outra aba para imprimir.' : 'O navegador não abriu outra aba: o relatório foi baixado. Abra o arquivo para imprimir.'
        : textoDoBaixado(formato as 'csv' | 'xlsx' | 'pdf', count))
      setAberto(false)
    } catch (e) {
      aba?.close()
      setErro(e instanceof RelatorioVazioError
        ? `Nenhum ${nomes.um} para exportar.`
        : exportErrorMessage(e, 'Não foi possível exportar. Tente de novo.'))
    } finally {
      setBaixando(null)
    }
  }

  const formatos: { valor: Formato; rotulo: string; icone: typeof FileText; pdf?: boolean }[] = [
    { valor: 'csv', rotulo: 'Planilha CSV', icone: SheetIcon },
    { valor: 'xlsx', rotulo: 'Excel (.xlsx)', icone: FileSpreadsheet },
    { valor: 'pdf', rotulo: 'PDF', icone: FileText, pdf: true },
    ...(celular ? [] : [{ valor: 'print' as const, rotulo: 'Imprimir', icone: Printer, pdf: true }]),
  ]

  const conteudo = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-foreground">
          {total == null ? '…' : `${milhar(total)} ${total === 1 ? nomes.um : nomes.varios}`}
          {' · '}{cols.length} {cols.length === 1 ? 'coluna' : 'colunas'}
          {' · '}Visão: <span className="font-medium">{visaoRotulo}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {filtrosTexto.length ? <>Filtros: {filtrosTexto.join(' · ')}</> : 'Sem filtros.'}
        </p>
      </div>

      <div className={cn('grid gap-2', celular ? 'grid-cols-3' : 'grid-cols-4')}>
        {formatos.map(f => (
          <Button
            key={f.valor}
            type="button"
            variant="outline"
            className={cn('h-auto flex-col gap-1.5 px-2 py-3 text-xs font-medium whitespace-normal', celular && 'min-h-16')}
            disabled={(f.pdf && !!motivoDoPdf) || !!baixando || nenhum || !catalog}
            title={f.pdf && motivoDoPdf ? motivoDoPdf : undefined}
            onClick={() => void baixar(f.valor)}
          >
            {baixando === f.valor ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <f.icone className="size-5" aria-hidden />}
            {f.rotulo}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 text-xs">
        {nenhum && <p className="text-muted-foreground">Nenhum {nomes.um} com esses filtros.</p>}
        {motivoDoPdf && !nenhum && (
          <p className="flex items-start gap-2 text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {motivoDoPdf}
          </p>
        )}
        {!motivoDoPdf && cols.length >= AVISO_COLUNAS_PDF && (
          <p className="flex items-start gap-2 text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Com {cols.length} colunas o PDF sai deitado e com letra menor.
          </p>
        )}
        {pessoais && (
          <p className="flex items-start gap-2 text-foreground">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden /> {pessoais}
          </p>
        )}
        {textoDosTotais && <p className="text-muted-foreground">{textoDosTotais}</p>}
        {erro && <p role="alert" className="text-destructive">{erro}</p>}
      </div>
    </div>
  )

  const botao = (
    <Button
      type="button"
      variant="outline"
      className={cn('gap-2', celular && 'h-11 w-full', className)}
      disabled={disabled}
      onClick={celular ? () => { setErro(null); setAberto(true) } : undefined}
    >
      <FileDown className="size-4" aria-hidden /> Exportar
    </Button>
  )

  if (celular) {
    return (
      <>
        {botao}
        <Sheet open={aberto} onOpenChange={setAberto}>
          <SheetContent side="bottom" showCloseButton={false} className="gap-0 p-0">
            <div className="flex items-center gap-1 border-b border-border px-1 py-1">
              <SheetTitle className="min-w-0 flex-1 truncate px-3">Exportar o que está na tela</SheetTitle>
              <SheetClose asChild>
                <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Fechar"><X /></Button>
              </SheetClose>
            </div>
            <SheetDescription className="sr-only">Baixa a lista com as colunas, os filtros e a ordem da tela.</SheetDescription>
            <div className="px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{conteudo}</div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <Popover open={aberto} onOpenChange={o => { setAberto(o); if (o) setErro(null) }}>
      <PopoverTrigger asChild>{botao}</PopoverTrigger>
      <PopoverContent align="end" collisionPadding={12} className="w-[min(520px,calc(100vw-2rem))] gap-3 p-4">
        <p className="font-medium text-foreground">Exportar o que está na tela</p>
        {conteudo}
      </PopoverContent>
    </Popover>
  )
}
