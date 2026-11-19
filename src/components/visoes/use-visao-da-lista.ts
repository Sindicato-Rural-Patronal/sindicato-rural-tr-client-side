// O estado da visão de uma lista (decisão 007): qual visão, as colunas, se está
// "(alterada)" e as ações (aplicar, mudar colunas, salvar, salvar como, renomear,
// excluir). Genérico: a tela passa os filtros dela com as chaves da API e uma
// função que muda a URL; nada aqui conhece os Lançamentos.
//
// Onde fica: na URL, `?visao=<id>` e, só quando difere da visão, `?cols=chave,chave`
// (os filtros já estão lá, então o link abre a mesma tela); no navegador, o último
// estado (`sr:visao:<fonte>`), que volta ao abrir a lista sem `?visao`.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useExportCatalog } from '@/hooks/useExportCatalog'
import { useReportTemplateMutations, useReportTemplates } from '@/hooks/useReportTemplates'
import { apiErrorMessage } from '@/lib/api-error-message'
import type { ExportDataset } from '@/lib/export'
import { camposDoCatalogo, normalizarNome, type FiltrosDaVisao } from '@/components/export/report-builder'
import {
  ID_DO_PADRAO, colunasDaTela, colunasDaUrl, colunasParaUrl, deveAplicarFiltrosAoVoltar, filtrosMudaram,
  filtrosParaGuardar, guardarUltimaVisao, idDaVisaoDaEquipe, lerUltimaVisao, mesmasColunas, patchDaVisao,
  problemaDoNomeDaVisao, rotuloDaVisao, visaoParaApi, visoesDaLista,
  type FiltrosDaLista, type Periodo, type Visao,
} from '@/components/visoes/visoes'

/** O que a tela muda na URL: a visão, as colunas (`undefined` tira) e, se vierem, filtros. */
export type MudancaDaLista = { visao: string; cols: string | undefined; filtros?: FiltrosDaLista }

type Opcoes = {
  dataset: ExportDataset
  enabled: boolean
  /** Os filtros da tela agora, com as chaves da API (inclui `from` e `to`). */
  tela: FiltrosDaLista
  /** `?visao` e `?cols` da URL. */
  url: { visao?: string; cols?: string }
  mudar: (m: MudancaDaLista) => void
  /**
   * O filtro aponta para algo que ainda existe? (categoria ou caixa excluído).
   * `false` = não existe mais; `undefined` = não se sabe (a lista não carregou).
   */
  existe?: (chave: string, valor: string | boolean) => boolean | undefined
  /** O aviso de um filtro que saiu ("A categoria guardada na visão não existe mais…"). */
  avisoDoQueSumiu?: (chave: string) => string
}

export type ResultadoDaVisao = { ok: true } | { ok: false; erro: string }

export function useVisaoDaLista({ dataset, enabled, tela, url, mudar, existe, avisoDoQueSumiu }: Opcoes) {
  const catalogo = useExportCatalog(dataset, { enabled })
  const catalog = catalogo.data ?? null
  const temVisoes = !!catalog?.visoes?.length
  // As da equipe: só nas fontes com visões. `null` = sem a rota ou sem permissão.
  const equipeQuery = useReportTemplates(dataset, { enabled: enabled && temVisoes })
  const mutacoes = useReportTemplateMutations(dataset)
  const [ultima] = useState(() => lerUltimaVisao(dataset))

  const visoes = useMemo(() => visoesDaLista(catalog, equipeQuery.data ?? []), [catalog, equipeQuery.data])
  const padrao = visoes.find(v => v.id === ID_DO_PADRAO) ?? visoes[0] ?? null
  const equipeCarregando = temVisoes && equipeQuery.isPending && enabled

  // Sem `?visao`, a última que a pessoa usou neste navegador (aplicada uma vez, no efeito abaixo).
  const idPedido = url.visao ?? ultima?.visao ?? ID_DO_PADRAO
  const achada = visoes.find(v => v.id === idPedido) ?? null
  // A visão da equipe pedida pode ainda estar chegando: até lá, "Carregando a visão…".
  const esperandoEquipe = !achada && idPedido.startsWith('equipe:') && equipeCarregando
  const atual: Visao | null = achada ?? (esperandoEquipe ? null : padrao)
  const sumiu = !!url.visao && !achada && !esperandoEquipe && temVisoes

  // Algum filtro da visão aponta para algo que ainda não se sabe se existe (a lista
  // de categorias ou de caixas não chegou)? Ao voltar à última visão, espera por ela.
  const semResposta = (f: FiltrosDaVisao | null) =>
    !!f && !!existe && Object.entries(f).some(([k, x]) => k !== 'periodo' && existe(k, x) === undefined)

  // Filtro que aponta para categoria ou caixa excluído sai da visão (e avisa).
  const { filtrosEfetivos, quaisSumiram } = useMemo(() => {
    const f = atual?.filters ?? null
    if (!f || !existe) return { filtrosEfetivos: f, quaisSumiram: [] as string[] }
    const fora = Object.entries(f).filter(([k, v]) => k !== 'periodo' && existe(k, v) === false).map(([k]) => k)
    if (fora.length === 0) return { filtrosEfetivos: f, quaisSumiram: [] as string[] }
    const resto: FiltrosDaVisao = Object.fromEntries(Object.entries(f).filter(([k]) => !fora.includes(k)))
    return { filtrosEfetivos: Object.keys(resto).length ? resto : null, quaisSumiram: fora }
  }, [atual, existe])

  const mapa = useMemo(() => (catalog ? camposDoCatalogo(catalog) : null), [catalog])
  const noCatalogo = useMemo(
    () => (mapa ? (k: string) => mapa.has(k) && mapa.get(k)?.allowed !== false : undefined),
    [mapa],
  )
  const textoDasCols = url.cols ?? (!url.visao && ultima?.visao === idPedido ? ultima.cols : undefined)
  const cols = useMemo(
    () => (atual ? colunasDaTela(atual, colunasDaUrl(textoDasCols), noCatalogo) : []),
    [atual, textoDasCols, noCatalogo],
  )
  const colunasDaVisao = atual?.fields ?? []
  const colunasMudaram = !!atual && !mesmasColunas(cols, colunasDaVisao)
  const alterada = !!atual && (colunasMudaram || filtrosMudaram(filtrosEfetivos, tela))
  const ehOPadraoSemMudanca = !atual || (atual.id === ID_DO_PADRAO && !colunasMudaram)

  // Voltar à última visão (uma vez, quando as visões chegam). Enquanto não volta, a
  // tabela espera (senão a lista de sempre piscaria antes das colunas da visão).
  // Os filtros que ela devolve são os de `filtrosDe`, como no `aplicar`: categoria
  // ou caixa excluído fica de fora (SR-153; antes voltava e a lista saía vazia).
  const voltou = useRef(false)
  const ultimaVolta = !!ultima && !url.visao && (ultima.visao !== ID_DO_PADRAO || !!ultima.cols)
  const restaurando = ultimaVolta && (
    (catalogo.isPending && enabled)
    || (temVisoes && (visoes.some(v => v.id === ultima?.visao) || (ultima?.visao.startsWith('equipe:') && equipeCarregando)))
  )
  useEffect(() => {
    if (voltou.current || url.visao || !ultima || !temVisoes) return
    if (ultima.visao.startsWith('equipe:') && equipeCarregando) return
    const v = visoes.find(x => x.id === ultima.visao)
    // Ainda não se sabe se a categoria ou o caixa da visão existe: espera a lista.
    if (v && semResposta(v.filters)) return
    voltou.current = true
    if (!v || v.id === ID_DO_PADRAO && !ultima.cols) return
    const filtros = filtrosDe(v)
    const aplicaFiltros = deveAplicarFiltrosAoVoltar(filtros, tela)
    mudar({
      visao: v.id,
      cols: ultima.cols && colunasDaUrl(ultima.cols) ? ultima.cols : undefined,
      ...(aplicaFiltros ? { filtros: patchDaVisao(filtros) } : {}),
    })
  })

  // Lembrar o estado (só depois que a URL tem a visão: a primeira tela não apaga a última).
  useEffect(() => {
    if (!url.visao || !achada) return
    guardarUltimaVisao(dataset, { visao: achada.id, ...(url.cols ? { cols: url.cols } : {}) })
  }, [dataset, url.visao, url.cols, achada])

  function filtrosDe(v: Visao): FiltrosDaVisao | null {
    if (v.id !== atual?.id) {
      if (!v.filters || !existe) return v.filters
      const resto = Object.fromEntries(Object.entries(v.filters).filter(([k, x]) => k === 'periodo' || existe(k, x) !== false))
      return Object.keys(resto).length ? resto : null
    }
    return filtrosEfetivos
  }

  /** Troca as colunas e, nos filtros que a visão guarda, troca o valor da tela. */
  function aplicar(id: string) {
    const v = visoes.find(x => x.id === id)
    if (!v) return
    mudar({ visao: v.id, cols: undefined, filtros: patchDaVisao(filtrosDe(v)) })
  }

  /** O painel Colunas: a tabela muda na hora; mexer marca a visão como "(alterada)". */
  function mudarColunas(novas: string[]) {
    if (!atual || novas.length === 0) return
    mudar({ visao: atual.id, cols: colunasParaUrl(novas, atual.fields) })
  }

  /** "Voltar ao padrão da visão": as colunas e os filtros que ela guarda. */
  function voltarAoPadrao() {
    if (atual) aplicar(atual.id)
  }

  const podeSalvar = equipeQuery.data != null && temVisoes

  async function salvarComo({ nome, guardarFiltros, periodo }: {
    nome: string; guardarFiltros: boolean; periodo: Periodo | null
  }): Promise<ResultadoDaVisao> {
    const problema = problemaDoNomeDaVisao(nome)
    if (problema) return { ok: false, erro: problema }
    const filters = guardarFiltros ? filtrosParaGuardar(tela, periodo) : (periodo ? { periodo } : null)
    try {
      const modelo = await mutacoes.salvar.mutateAsync({ name: normalizarNome(nome), fields: cols, filters })
      // A tela fica igual à visão nova (com o período, as datas dele).
      mudar({ visao: idDaVisaoDaEquipe(modelo.id), cols: undefined, filtros: patchDaVisao(modelo.filters) })
      return { ok: true }
    } catch (e) {
      return { ok: false, erro: apiErrorMessage(e, 'Não foi possível salvar a visão. Tente de novo.') }
    }
  }

  async function salvarAlteracoes({ guardarFiltros, periodo }: {
    guardarFiltros: boolean; periodo: Periodo | null
  }): Promise<ResultadoDaVisao> {
    if (!atual?.modelo) return { ok: false, erro: 'Só as visões da equipe podem ser mudadas.' }
    const filters = guardarFiltros ? filtrosParaGuardar(tela, periodo) : (periodo ? { periodo } : null)
    try {
      const modelo = await mutacoes.mudar.mutateAsync({ id: atual.modelo.id, body: { fields: cols, filters } })
      mudar({ visao: idDaVisaoDaEquipe(modelo.id), cols: undefined, filtros: patchDaVisao(modelo.filters) })
      return { ok: true }
    } catch (e) {
      return { ok: false, erro: apiErrorMessage(e, 'Não foi possível salvar as alterações. Tente de novo.') }
    }
  }

  async function renomear(nome: string): Promise<ResultadoDaVisao> {
    if (!atual?.modelo) return { ok: false, erro: 'Só as visões da equipe podem ser renomeadas.' }
    const problema = problemaDoNomeDaVisao(nome)
    if (problema) return { ok: false, erro: problema }
    const limpo = normalizarNome(nome)
    if (limpo === atual.name) return { ok: true }
    try {
      await mutacoes.mudar.mutateAsync({ id: atual.modelo.id, body: { name: limpo } })
      return { ok: true }
    } catch (e) {
      return { ok: false, erro: apiErrorMessage(e, 'Não foi possível renomear a visão. Tente de novo.') }
    }
  }

  /** Exclui (soft-delete na API) e volta à Padrão com as colunas de agora: a lista não muda. */
  async function excluir(): Promise<ResultadoDaVisao> {
    if (!atual?.modelo || !padrao) return { ok: false, erro: 'Só as visões da equipe podem ser excluídas.' }
    try {
      await mutacoes.excluir.mutateAsync(atual.modelo.id)
      mudar({ visao: padrao.id, cols: colunasParaUrl(cols, padrao.fields) })
      return { ok: true }
    } catch (e) {
      return { ok: false, erro: apiErrorMessage(e, 'Não foi possível excluir a visão. Tente de novo.') }
    }
  }

  const avisos: string[] = []
  if (sumiu) avisos.push('A visão do link não existe mais: a lista abriu na Padrão.')
  if (atual?.missingFields.length) {
    const n = atual.missingFields.length
    avisos.push(n === 1 ? '1 coluna da visão não existe mais e saiu.' : `${n} colunas da visão não existem mais e saíram.`)
  }
  for (const k of quaisSumiram) avisos.push(avisoDoQueSumiu?.(k) ?? 'Um filtro da visão não existe mais e saiu dela.')

  return {
    catalog,
    catalogoCarregando: catalogo.isPending && enabled,
    catalogoFalhou: catalogo.isError && !catalogo.data,
    tentarCatalogoDeNovo: () => void catalogo.refetch(),
    temVisoes,
    visoes,
    atual,
    cols,
    /** Os filtros que a visão liga (sem os que apontam para algo excluído). */
    filtrosDaVisao: filtrosEfetivos,
    colunasMudaram,
    alterada,
    rotulo: atual ? rotuloDaVisao(atual.name, alterada) : 'Carregando a visão…',
    /** O nome que vai na exportação (`visao`). */
    nomeApi: atual ? visaoParaApi(atual.name, alterada) : undefined,
    /** A visão Padrão sem mudança nas colunas: a tabela de sempre, igual à de antes (sem `fields`). */
    ehOPadraoSemMudanca,
    /** Ainda não dá para saber as colunas (o catálogo, a visão da equipe ou a última visão estão chegando). */
    carregando: (catalogo.isPending && enabled && !!url.visao) || esperandoEquipe || !!restaurando,
    avisos,
    equipe: {
      podeSalvar,
      carregando: equipeCarregando,
      falhou: temVisoes && equipeQuery.isError,
      tentarDeNovo: () => void equipeQuery.refetch(),
      salvando: mutacoes.salvar.isPending || mutacoes.mudar.isPending || mutacoes.excluir.isPending,
    },
    aplicar, mudarColunas, voltarAoPadrao, salvarComo, salvarAlteracoes, renomear, excluir,
  }
}

export type VisaoDaLista = ReturnType<typeof useVisaoDaLista>
