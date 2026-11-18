// A barra da visão (decisão 007, seção 1), entre os filtros e os totais:
//   Visão [ Contabilidade (alterada) ▾ ]  [ Colunas (9) ]  Salvar alterações · Salvar como… ⋯   [ Exportar ]
// "Salvar alterações", "Renomear…" e "Excluir…" só aparecem nas visões da equipe
// (as de fábrica não mudam: lá só há "Salvar como…").
// No celular, duas linhas: a visão na largura toda; "Colunas" e "Exportar" meio a
// meio, com 44 px. Salvar, renomear e excluir vão para o menu do seletor.
// Salvar como, salvar alterações, renomear e excluir abrem um painel embaixo da
// barra (sem diálogo); o erro da API aparece nele, como veio.
import { useId, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Check, ChevronDown, Layers, Loader2, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NOME_DO_MODELO_MAX, normalizarNome, type FiltrosDaVisao } from '@/components/export/report-builder'
import {
  PERIODOS, autoriaDaVisao, ehPeriodo, filtrosParaGuardar, periodoDasDatas,
  type FiltrosDaLista, type Periodo, type Visao,
} from '@/components/visoes/visoes'
import type { ResultadoDaVisao, VisaoDaLista } from '@/components/visoes/use-visao-da-lista'
import { cn } from '@/lib/utils'

type Painel = 'salvar-como' | 'salvar-alteracoes' | 'renomear' | 'excluir'

type Props = {
  v: VisaoDaLista
  /** Os filtros da tela agora (as chaves da API), para dizer o que "Salvar como…" guarda. */
  tela: FiltrosDaLista
  /** Os filtros de uma visão em palavras ("Tipo: Entrada · Período: mês passado"). */
  descrever: (f: FiltrosDaVisao | null) => string[]
  celular: boolean
  /** O botão "Colunas" (com o painel). */
  colunas: ReactNode
  /** O botão "Exportar" (com o popover). */
  exportar: ReactNode
}

function ItemDaVisao({ visao, atual, descricao, onEscolher }: {
  visao: Visao; atual: boolean; descricao: string | null; onEscolher: () => void
}) {
  return (
    <DropdownMenuItem onSelect={onEscolher} className="min-h-10 items-start gap-2 py-2">
      <Check className={cn('mt-0.5 size-4 shrink-0', !atual && 'invisible')} aria-hidden />
      <span className="flex min-w-0 flex-col">
        <span className="break-words">{visao.name}</span>
        {descricao && <span className="text-xs text-muted-foreground">{descricao}</span>}
      </span>
    </DropdownMenuItem>
  )
}

export function BarraDaVisao({ v, tela, descrever, celular, colunas, exportar }: Props) {
  const ids = useId()
  const [painel, setPainel] = useState<Painel | null>(null)
  const [nome, setNome] = useState('')
  const [guardarFiltros, setGuardarFiltros] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo | ''>('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const seletorRef = useRef<HTMLButtonElement>(null)
  // Escolher no menu um item que abre o painel: o menu não devolve o foco ao botão
  // (o campo do painel fica com ele).
  const abrindoPainel = useRef(false)
  const aoFecharMenu = (e: Event) => {
    if (abrindoPainel.current) e.preventDefault()
    abrindoPainel.current = false
  }

  const atual = v.atual
  const daEquipe = atual?.origem === 'equipe'
  const deFabrica = v.visoes.filter(x => x.origem === 'fabrica')
  const equipe = v.visoes.filter(x => x.origem === 'equipe')
  const descricaoDe = (x: Visao) => {
    const partes = descrever(x.filters)
    return partes.length ? `Liga: ${partes.join(' · ')}` : null
  }

  function abrir(qual: Painel) {
    // Só vale para o fechamento do menu que vem logo em seguida (o botão à vista não fecha menu nenhum).
    abrindoPainel.current = true
    window.setTimeout(() => { abrindoPainel.current = false }, 600)
    setErro(null)
    if (qual === 'salvar-como') {
      setNome('')
      setGuardarFiltros(true)
      setPeriodo(periodoDasDatas(tela.from as string | undefined, tela.to as string | undefined) ?? '')
    } else if (qual === 'salvar-alteracoes' && atual) {
      const f = atual.filters
      setGuardarFiltros(!!f && Object.keys(f).some(k => k !== 'periodo'))
      const doPeriodo = ehPeriodo(f?.periodo) ? f.periodo : null
      setPeriodo(periodoDasDatas(tela.from as string | undefined, tela.to as string | undefined) ?? doPeriodo ?? '')
    } else if (qual === 'renomear' && atual) {
      setNome(atual.name)
    }
    setPainel(qual)
  }

  function fechar() {
    setPainel(null)
    setErro(null)
    seletorRef.current?.focus()
  }

  async function confirmar() {
    if (!painel || enviando) return
    setEnviando(true)
    let r: ResultadoDaVisao
    const nomeLimpo = normalizarNome(nome)
    const nomeAtual = atual?.name ?? ''
    try {
      if (painel === 'salvar-como') r = await v.salvarComo({ nome, guardarFiltros, periodo: periodo || null })
      else if (painel === 'salvar-alteracoes') r = await v.salvarAlteracoes({ guardarFiltros, periodo: periodo || null })
      else if (painel === 'renomear') r = await v.renomear(nome)
      else r = await v.excluir()
    } finally {
      setEnviando(false)
    }
    if (!r.ok) { setErro(r.erro); return }
    toast.success(
      painel === 'salvar-como' ? `Visão "${nomeLimpo}" salva para a equipe.`
        : painel === 'salvar-alteracoes' ? `Visão "${nomeAtual}" atualizada.`
          : painel === 'renomear' ? `Visão renomeada para "${nomeLimpo}".`
            : `Visão "${nomeAtual}" excluída.`,
    )
    fechar()
  }

  // O que "Guardar os filtros" vai guardar, em palavras (só os ligados; nunca busca nem datas).
  const guardados = filtrosParaGuardar(guardarFiltros ? tela : {}, periodo || null)
  const textoDosGuardados = descrever(guardados)
  const resumoDoQueGuarda = textoDosGuardados.length
    ? `A visão guarda as ${v.cols.length} colunas e liga: ${textoDosGuardados.join(' · ')}.`
    : `A visão guarda só as ${v.cols.length} colunas: os filtros da tela ficam como estiverem.`

  const camposDoPainel = (painel === 'salvar-como' || painel === 'salvar-alteracoes') && (
    <>
      {painel === 'salvar-como' && (
        <label className="flex min-w-0 flex-col gap-1.5 sm:w-72">
          <span className="text-xs font-medium text-muted-foreground">Nome da visão</span>
          <Input
            value={nome}
            autoFocus
            maxLength={NOME_DO_MODELO_MAX}
            placeholder="Ex.: Contabilidade março"
            className={cn(celular && 'h-11')}
            onChange={e => { setNome(e.target.value); setErro(null) }}
            onKeyDown={e => { if (e.key === 'Enter') void confirmar() }}
          />
        </label>
      )}
      <label className={cn('flex cursor-pointer items-center gap-2 text-sm', celular ? 'min-h-11' : 'h-9')}>
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={guardarFiltros}
          onChange={e => setGuardarFiltros(e.target.checked)}
        />
        Guardar os filtros ligados agora
      </label>
      <label className="flex min-w-0 flex-col gap-1.5 sm:w-48">
        <span className="text-xs font-medium text-muted-foreground">Período</span>
        <NativeSelect value={periodo} onChange={e => setPeriodo(e.target.value as Periodo | '')} className={cn(celular && 'h-11')}>
          <option value="">não guardar</option>
          {PERIODOS.map(p => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
        </NativeSelect>
      </label>
    </>
  )

  const painelAberto = painel && atual && (
    <div
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:p-4"
      role="group"
      aria-labelledby={`${ids}-painel`}
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); fechar() } }}
    >
      {painel === 'salvar-como' && (
        <p id={`${ids}-painel`} className="text-sm font-medium text-foreground">Salvar como uma visão nova da equipe</p>
      )}
      {painel === 'salvar-alteracoes' && (
        <p id={`${ids}-painel`} className="text-sm text-foreground">
          Salvar na visão <span className="font-medium">"{atual.name}"</span> o que está na tela agora? Ela muda para toda a equipe.
        </p>
      )}
      {painel === 'renomear' && (
        <>
          <p id={`${ids}-painel`} className="text-sm font-medium text-foreground">Renomear a visão "{atual.name}"</p>
          <label className="flex min-w-0 flex-col gap-1.5 sm:w-72">
            <span className="text-xs font-medium text-muted-foreground">Nome da visão</span>
            <Input
              value={nome}
              autoFocus
              maxLength={NOME_DO_MODELO_MAX}
              className={cn(celular && 'h-11')}
              onChange={e => { setNome(e.target.value); setErro(null) }}
              onKeyDown={e => { if (e.key === 'Enter') void confirmar() }}
            />
          </label>
        </>
      )}
      {painel === 'excluir' && (
        <p id={`${ids}-painel`} className="text-sm text-foreground">
          Excluir a visão <span className="font-medium">"{atual.name}"</span>? Ela sai da lista de visões para toda a equipe; a lista na tela continua como está.
        </p>
      )}
      {camposDoPainel && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">{camposDoPainel}</div>
          <p className="text-xs text-muted-foreground">
            {resumoDoQueGuarda} A busca e as datas fixas nunca são guardadas. A visão é da equipe toda.
          </p>
        </>
      )}
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <div className={cn('flex gap-2', celular ? 'flex-col-reverse' : 'justify-end')}>
        <Button type="button" variant="outline" className={cn(celular && 'h-11')} onClick={fechar} autoFocus={painel === 'excluir'}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant={painel === 'excluir' ? 'destructive-solid' : 'default'}
          className={cn('gap-2', celular && 'h-11')}
          disabled={enviando}
          onClick={() => void confirmar()}
        >
          {enviando && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {painel === 'salvar-como' ? 'Salvar visão'
            : painel === 'salvar-alteracoes' ? 'Salvar alterações'
              : painel === 'renomear' ? 'Renomear' : 'Excluir'}
        </Button>
      </div>
    </div>
  )

  const podeSalvar = v.equipe.podeSalvar && !!atual
  const itensDeSalvar = (
    <>
      {daEquipe && (
        <DropdownMenuItem className="min-h-11" disabled={!v.alterada} onSelect={() => abrir('salvar-alteracoes')}>
          Salvar alterações
        </DropdownMenuItem>
      )}
      <DropdownMenuItem className="min-h-11" onSelect={() => abrir('salvar-como')}>Salvar como…</DropdownMenuItem>
      {daEquipe && (
        <>
          <DropdownMenuItem className="min-h-11" onSelect={() => abrir('renomear')}>Renomear…</DropdownMenuItem>
          <DropdownMenuItem className="min-h-11 text-destructive" onSelect={() => abrir('excluir')}>Excluir…</DropdownMenuItem>
        </>
      )}
    </>
  )

  const seletor = (
    <DropdownMenu onOpenChange={o => { if (o) setPainel(null) }}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={seletorRef}
          type="button"
          variant="outline"
          className={cn('min-w-0 justify-between gap-2 font-normal', celular ? 'h-11 flex-1' : 'w-72')}
          aria-label={`Visão: ${v.rotulo}`}
          disabled={!atual}
        >
          <span className="truncate">
            {atual ? atual.name : v.catalogoFalhou || (!v.catalogoCarregando && !v.temVisoes) ? 'Padrão' : 'Carregando a visão…'}
            {v.alterada && <span className="text-muted-foreground"> (alterada)</span>}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      {/* No celular o menu não encosta na borda da tela (16 px de cada lado). */}
      <DropdownMenuContent
        align="start"
        collisionPadding={16}
        onCloseAutoFocus={aoFecharMenu}
        className="w-[min(360px,calc(100vw-2rem))] min-w-(--radix-dropdown-menu-trigger-width)"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">De fábrica</DropdownMenuLabel>
          {deFabrica.map(x => (
            <ItemDaVisao key={x.id} visao={x} atual={x.id === atual?.id} descricao={descricaoDe(x)} onEscolher={() => v.aplicar(x.id)} />
          ))}
        </DropdownMenuGroup>
        {v.equipe.podeSalvar && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Da equipe</DropdownMenuLabel>
              {equipe.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma ainda. Monte a lista e use "Salvar como…".</p>
              )}
              {equipe.map(x => (
                <ItemDaVisao key={x.id} visao={x} atual={x.id === atual?.id} descricao={descricaoDe(x)} onEscolher={() => v.aplicar(x.id)} />
              ))}
            </DropdownMenuGroup>
          </>
        )}
        {celular && podeSalvar && (
          <>
            <DropdownMenuSeparator />
            {itensDeSalvar}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const linhasDeBaixo = (
    <>
      {daEquipe && atual?.modelo && (
        <p className="px-1 text-xs text-muted-foreground">{autoriaDaVisao(atual.modelo)}</p>
      )}
      {v.avisos.map(a => (
        <p key={a} role="status" className="px-1 text-xs text-warning">{a}</p>
      ))}
      {v.catalogoFalhou && (
        <LoadErrorRetry variant="inline" message="As visões e as colunas não carregaram: a lista ficou na de sempre." onRetry={v.tentarCatalogoDeNovo} />
      )}
      {v.equipe.falhou && (
        <LoadErrorRetry variant="inline" message="As visões da equipe não carregaram." onRetry={v.equipe.tentarDeNovo} />
      )}
      {painelAberto}
    </>
  )

  if (celular) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-foreground">
            <Layers className="size-4 text-muted-foreground" aria-hidden /> Visão
          </span>
          {seletor}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {colunas}
          {exportar}
        </div>
        {linhasDeBaixo}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-card px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Layers className="size-4 text-muted-foreground" aria-hidden /> Visão
        </span>
        {seletor}
        {colunas}
        {podeSalvar && (
          <div className="flex items-center gap-1">
            {/* Só nas visões da equipe: as de fábrica não mudam. Desligado, fica cinza (não parece link). */}
            {daEquipe && (
              <Button
                type="button" variant="ghost" size="sm"
                className="text-foreground disabled:text-faint-foreground"
                disabled={!v.alterada || v.equipe.salvando}
                title={!v.alterada ? 'Nada mudou nesta visão.' : undefined}
                onClick={() => abrir('salvar-alteracoes')}
              >
                Salvar alterações
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" className="text-foreground" onClick={() => abrir('salvar-como')}>
              Salvar como…
            </Button>
            {daEquipe && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Mais ações da visão" title="Renomear ou excluir">
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44" onCloseAutoFocus={aoFecharMenu}>
                  <DropdownMenuItem onSelect={() => abrir('renomear')}>Renomear…</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onSelect={() => abrir('excluir')}>Excluir…</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
        <div className="ml-auto">{exportar}</div>
      </div>
      {linhasDeBaixo}
    </div>
  )
}
