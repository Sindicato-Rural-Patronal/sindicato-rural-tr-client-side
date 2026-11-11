// Montador de relatórios (decisão 006, SR-089): o estado, puro e testado.
//
// O back é o único lugar que define campos, modelos e permissões: o front só
// lê o catálogo (`GET /admin/export/:dataset/catalog`) e guarda as chaves que a
// pessoa escolheu, NA ORDEM das colunas. Nada aqui conhece os campos de uma
// fonte: tudo vem do catálogo.

// ---------------------------------------------------------------------------
// Contrato do catálogo (decisão 006, seção 3)
// ---------------------------------------------------------------------------

export type ExportFieldType =
  | 'text' | 'number' | 'money' | 'boolean' | 'list'
  | 'date' | 'datetime' | 'wallclock'
  | 'cpf' | 'cnpj' | 'cep' | 'phone' | 'cns'
  | 'blank'

/** Etiqueta no montador e texto da auditoria. Não bloqueia nada. */
export type ExportPrivacy = 'comum' | 'pessoal' | 'sensivel'

export type CatalogField = {
  /** Estável: modelo salvo e último usado dependem dela. */
  key: string
  label: string
  type: ExportFieldType | string
  privacy: ExportPrivacy
  /** false = quem pede não tem a permissão do campo (aparece desligado). */
  allowed: boolean
  /** Por que está desligado ("Pede a permissão Visualizar usuários"). */
  reason: string | null
}

export type CatalogGroup = { name: string; fields: CatalogField[] }

export type CatalogModelo = {
  id: string
  name: string
  fields: string[]
  /** Liga "Só confirmadas" (Inscrições › Lista de presença). */
  confirmed?: boolean
}

export type ExportCatalog = {
  dataset: string
  title: string
  groups: CatalogGroup[]
  /** O modelo padrão: as colunas de hoje, na ordem de hoje. */
  padrao: string[]
  modelos: CatalogModelo[]
  /** Nome em palavras de cada filtro da lista ("search" → "Busca"). */
  filterLabels: Record<string, string>
  limits: { rows: number; pdfRows: number; fields: number }
}

const LIMITES_PADRAO = { rows: 20_000, pdfRows: 2_000, fields: 80 }

function ehTexto(v: unknown): v is string {
  return typeof v === 'string'
}

function listaDeTextos(v: unknown): string[] {
  return Array.isArray(v) ? v.filter(ehTexto) : []
}

function numeroPositivo(v: unknown, padrao: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : padrao
}

/**
 * Confere a resposta do catálogo e completa o que for opcional. Resposta fora do
 * formato (back velho, proxy devolvendo HTML, mock de teste) vira `null`: aí o
 * item "Montar relatório…" simplesmente não aparece.
 */
export function lerCatalogo(data: unknown): ExportCatalog | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.groups)) return null

  const groups: CatalogGroup[] = []
  for (const g of d.groups as unknown[]) {
    if (!g || typeof g !== 'object') continue
    const grupo = g as Record<string, unknown>
    if (!ehTexto(grupo.name) || !Array.isArray(grupo.fields)) continue
    const fields: CatalogField[] = []
    for (const f of grupo.fields as unknown[]) {
      if (!f || typeof f !== 'object') continue
      const campo = f as Record<string, unknown>
      if (!ehTexto(campo.key) || !ehTexto(campo.label)) continue
      fields.push({
        key: campo.key,
        label: campo.label,
        type: ehTexto(campo.type) ? campo.type : 'text',
        privacy: campo.privacy === 'pessoal' || campo.privacy === 'sensivel' ? campo.privacy : 'comum',
        allowed: campo.allowed !== false,
        reason: ehTexto(campo.reason) ? campo.reason : null,
      })
    }
    if (fields.length) groups.push({ name: grupo.name, fields })
  }
  if (groups.length === 0) return null

  const modelos: CatalogModelo[] = []
  if (Array.isArray(d.modelos)) {
    for (const m of d.modelos as unknown[]) {
      if (!m || typeof m !== 'object') continue
      const modelo = m as Record<string, unknown>
      if (!ehTexto(modelo.id) || !ehTexto(modelo.name)) continue
      const filtros = modelo.filters && typeof modelo.filters === 'object'
        ? modelo.filters as Record<string, unknown>
        : {}
      modelos.push({
        id: modelo.id,
        name: modelo.name,
        fields: listaDeTextos(modelo.fields),
        confirmed: modelo.confirmed === true || filtros.confirmed === true,
      })
    }
  }

  const filterLabels: Record<string, string> = {}
  if (d.filterLabels && typeof d.filterLabels === 'object') {
    for (const [k, v] of Object.entries(d.filterLabels as Record<string, unknown>)) {
      if (ehTexto(v)) filterLabels[k] = v
    }
  }

  const limites = d.limits && typeof d.limits === 'object' ? d.limits as Record<string, unknown> : {}
  return {
    dataset: ehTexto(d.dataset) ? d.dataset : '',
    title: ehTexto(d.title) ? d.title : '',
    groups,
    padrao: listaDeTextos(d.padrao),
    modelos,
    filterLabels,
    limits: {
      rows: numeroPositivo(limites.rows, LIMITES_PADRAO.rows),
      pdfRows: numeroPositivo(limites.pdfRows, LIMITES_PADRAO.pdfRows),
      fields: numeroPositivo(limites.fields, LIMITES_PADRAO.fields),
    },
  }
}

// ---------------------------------------------------------------------------
// Campos e modelos
// ---------------------------------------------------------------------------

export type CampoComGrupo = CatalogField & { group: string }

export function camposDoCatalogo(catalog: ExportCatalog): Map<string, CampoComGrupo> {
  const mapa = new Map<string, CampoComGrupo>()
  for (const g of catalog.groups) {
    for (const f of g.fields) if (!mapa.has(f.key)) mapa.set(f.key, { ...f, group: g.name })
  }
  return mapa
}

export const PADRAO_ID = 'padrao'
export const PADRAO_NOME = 'Padrão (como hoje)'

/** Os modelos do seletor: o Padrão sempre em primeiro, depois os de fábrica. */
export function modelosDe(catalog: ExportCatalog): CatalogModelo[] {
  const deFabrica = catalog.modelos.filter(m => m.id !== PADRAO_ID)
  const padraoDoCatalogo = catalog.modelos.find(m => m.id === PADRAO_ID)
  return [
    { id: PADRAO_ID, name: PADRAO_NOME, fields: catalog.padrao, ...(padraoDoCatalogo?.confirmed ? { confirmed: true } : {}) },
    ...deFabrica,
  ]
}

export type CamposLimpos = {
  campos: string[]
  /** Rótulos dos campos que pedem uma permissão que a pessoa não tem. */
  semPermissao: string[]
  /** Chaves que não existem mais no catálogo. */
  sumiram: string[]
  /** Quantos passaram do limite de campos. */
  cortados: number
}

/**
 * Tira de uma lista de chaves (modelo, último usado) o que não pode ir:
 * campo que sumiu do catálogo, campo sem permissão e repetido. Corta no limite.
 */
export function limparCampos(catalog: ExportCatalog, chaves: string[]): CamposLimpos {
  const mapa = camposDoCatalogo(catalog)
  const campos: string[] = []
  const semPermissao: string[] = []
  const sumiram: string[] = []
  let cortados = 0
  for (const chave of chaves) {
    if (campos.includes(chave)) continue
    const campo = mapa.get(chave)
    if (!campo) { if (!sumiram.includes(chave)) sumiram.push(chave); continue }
    if (!campo.allowed) { if (!semPermissao.includes(campo.label)) semPermissao.push(campo.label); continue }
    if (campos.length >= catalog.limits.fields) { cortados++; continue }
    campos.push(chave)
  }
  return { campos, semPermissao, sumiram, cortados }
}

function avisosDaLimpeza(limpos: CamposLimpos, origem: 'modelo' | 'ultimo'): string[] {
  const avisos: string[] = []
  if (limpos.semPermissao.length) {
    avisos.push(
      origem === 'modelo'
        ? `Ficaram de fora campos do modelo que você não pode exportar: ${limpos.semPermissao.join(', ')}.`
        : `Saíram campos que você não pode mais exportar: ${limpos.semPermissao.join(', ')}.`,
    )
  }
  if (limpos.sumiram.length) {
    const n = limpos.sumiram.length
    avisos.push(
      n === 1
        ? `1 campo ${origem === 'modelo' ? 'do modelo' : 'do último relatório'} não existe mais e saiu.`
        : `${n} campos ${origem === 'modelo' ? 'do modelo' : 'do último relatório'} não existem mais e saíram.`,
    )
  }
  if (limpos.cortados) avisos.push(`Só cabem ${limpos.campos.length} campos por relatório; o resto ficou de fora.`)
  return avisos
}

// ---------------------------------------------------------------------------
// O estado do montador
// ---------------------------------------------------------------------------

/** "print" é o mesmo PDF, aberto numa aba nova para imprimir. */
export type ReportFormat = 'csv' | 'pdf' | 'print'
export type ReportScope = 'all' | 'selected'

export type ReportState = {
  /** Chaves escolhidas, na ordem das colunas. */
  fields: string[]
  /** Modelo aplicado por último (null = montado à mão). */
  modeloId: string | null
  format: ReportFormat
  scope: ReportScope
  /** "Só confirmadas" (Inscrições). */
  confirmed: boolean
  /** O que saiu ao aplicar o modelo ou abrir o último usado. */
  avisos: string[]
}

export type UltimoRelatorio = { fields: string[]; format: ReportFormat }

function mesmaLista(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((k, i) => k === b[i])
}

/** O modelo cujas colunas são exatamente estas (para reabrir com o nome dele). */
export function modeloQueBate(catalog: ExportCatalog, campos: string[]): CatalogModelo | null {
  return modelosDe(catalog).find(m => mesmaLista(limparCampos(catalog, m.fields).campos, campos)) ?? null
}

/**
 * Como o montador abre: na primeira vez, no Padrão (para ninguém se perder);
 * depois, no último relatório montado nesta fonte. Com registros marcados na
 * lista, "O que entra" começa em "Selecionados".
 */
export function estadoInicial(
  catalog: ExportCatalog,
  { ultimo, selecionados = 0 }: { ultimo?: UltimoRelatorio | null; selecionados?: number } = {},
): ReportState {
  const scope: ReportScope = selecionados > 0 ? 'selected' : 'all'
  if (ultimo && ultimo.fields.length) {
    const limpos = limparCampos(catalog, ultimo.fields)
    if (limpos.campos.length) {
      const modelo = modeloQueBate(catalog, limpos.campos)
      return {
        fields: limpos.campos,
        modeloId: modelo?.id ?? null,
        format: ultimo.format,
        scope,
        confirmed: modelo?.confirmed === true,
        avisos: avisosDaLimpeza(limpos, 'ultimo'),
      }
    }
  }
  const limpos = limparCampos(catalog, catalog.padrao)
  return {
    fields: limpos.campos,
    modeloId: PADRAO_ID,
    format: ultimo?.format ?? 'csv',
    scope,
    confirmed: false,
    avisos: avisosDaLimpeza(limpos, 'modelo'),
  }
}

/** O modelo escolhido preenche as colunas (e liga "Só confirmadas" se ele pedir). */
export function aplicarModelo(state: ReportState, catalog: ExportCatalog, modeloId: string): ReportState {
  const modelo = modelosDe(catalog).find(m => m.id === modeloId)
  if (!modelo) return state
  const limpos = limparCampos(catalog, modelo.fields)
  return {
    ...state,
    fields: limpos.campos,
    modeloId: modelo.id,
    confirmed: modelo.confirmed ? true : state.confirmed,
    avisos: avisosDaLimpeza(limpos, 'modelo'),
  }
}

/** Marcar põe o campo no fim das colunas; desmarcar o tira. */
export function marcarCampo(state: ReportState, catalog: ExportCatalog, chave: string): ReportState {
  if (state.fields.includes(chave)) return tirarCampo(state, chave)
  const campo = camposDoCatalogo(catalog).get(chave)
  if (!campo || !campo.allowed) return state
  if (state.fields.length >= catalog.limits.fields) return state
  return { ...state, fields: [...state.fields, chave], avisos: [] }
}

export function tirarCampo(state: ReportState, chave: string): ReportState {
  if (!state.fields.includes(chave)) return state
  return { ...state, fields: state.fields.filter(k => k !== chave), avisos: [] }
}

/** ↑ (-1) e ↓ (+1). Na ponta, não faz nada. */
export function moverCampo(state: ReportState, chave: string, passo: -1 | 1): ReportState {
  const de = state.fields.indexOf(chave)
  if (de < 0) return state
  return moverPara(state, de, de + passo)
}

/** Arrastar: tira da posição `de` e põe na `para`. */
export function moverPara(state: ReportState, de: number, para: number): ReportState {
  const n = state.fields.length
  if (de === para || de < 0 || de >= n || para < 0 || para >= n) return state
  const fields = [...state.fields]
  const [campo] = fields.splice(de, 1)
  fields.splice(para, 0, campo)
  return { ...state, fields }
}

/**
 * Nome do modelo para a tela, o cabeçalho do PDF e a auditoria: "Nome e CPF",
 * "Nome e CPF (alterado)" depois de mexer, ou null quando foi montado à mão.
 */
export function nomeDoModelo(state: ReportState, catalog: ExportCatalog): string | null {
  if (!state.modeloId) return null
  const modelo = modelosDe(catalog).find(m => m.id === state.modeloId)
  if (!modelo) return null
  const alterado = !mesmaLista(limparCampos(catalog, modelo.fields).campos, state.fields)
  return alterado ? `${modelo.name} (alterado)` : modelo.name
}

// ---------------------------------------------------------------------------
// Busca de campos
// ---------------------------------------------------------------------------

export function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/**
 * Grupos com os campos que batem com a busca (ignora acento e maiúscula; todas
 * as palavras precisam aparecer). O nome do grupo também conta: "endereco"
 * traz o grupo Endereço inteiro.
 */
export function filtrarGrupos(groups: CatalogGroup[], busca: string): CatalogGroup[] {
  const palavras = semAcento(busca).split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return groups
  const bate = (texto: string) => {
    const t = semAcento(texto)
    return palavras.every(p => t.includes(p))
  }
  const resultado: CatalogGroup[] = []
  for (const g of groups) {
    const fields = bate(g.name) ? g.fields : g.fields.filter(f => bate(f.label) || bate(`${g.name} ${f.label}`))
    if (fields.length) resultado.push({ name: g.name, fields })
  }
  return resultado
}

// ---------------------------------------------------------------------------
// O que vai sair
// ---------------------------------------------------------------------------

/** Campos pessoais e sensíveis escolhidos, na ordem das colunas. */
export function camposPessoais(state: ReportState, catalog: ExportCatalog): CampoComGrupo[] {
  const mapa = camposDoCatalogo(catalog)
  return state.fields.map(k => mapa.get(k)).filter((f): f is CampoComGrupo => !!f && f.privacy !== 'comum')
}

/** Quantos campos o aviso de dados pessoais cita pelo nome (o Padrão de pessoas tem mais de 40). */
export const AVISO_PESSOAIS_MAX = 8

/**
 * "Leva dados pessoais: CPF, Nascimento." — aviso, não pede confirmação. Os
 * sensíveis vêm primeiro; passando de 8, "e mais N".
 */
export function avisoDadosPessoais(state: ReportState, catalog: ExportCatalog): string | null {
  const pessoais = camposPessoais(state, catalog)
  if (pessoais.length === 0) return null
  const ordem = [...pessoais.filter(f => f.privacy === 'sensivel'), ...pessoais.filter(f => f.privacy !== 'sensivel')]
  const citados = ordem.slice(0, AVISO_PESSOAIS_MAX).map(f => f.label).join(', ')
  const resto = ordem.length - AVISO_PESSOAIS_MAX
  return `Leva dados pessoais: ${citados}${resto > 0 ? ` e mais ${resto}` : ''}.`
}

/** A partir daqui o montador avisa que a letra do PDF fica pequena. */
export const AVISO_COLUNAS_PDF = 9

/** No celular não há "Imprimir": vira o PDF. */
export function formatoNaTela(format: ReportFormat, celular: boolean): ReportFormat {
  return celular && format === 'print' ? 'pdf' : format
}

/** Quantos registros vão sair (undefined = não se sabe). */
export function quantosVaoSair(
  state: ReportState,
  { total, selecionados }: { total?: number; selecionados: number },
): number | undefined {
  return state.scope === 'selected' ? selecionados : total
}

const milhar = (n: number) => n.toLocaleString('pt-BR')

/**
 * Por que o botão de baixar está desligado (null = pode baixar). São os mesmos
 * limites que a API confere; aqui é só para a pessoa não esperar à toa.
 */
export function problemaParaBaixar(
  state: ReportState,
  catalog: ExportCatalog,
  { total, selecionados, celular = false }: { total?: number; selecionados: number; celular?: boolean },
): string | null {
  if (state.fields.length === 0) return 'Escolha pelo menos um campo.'
  if (state.fields.length > catalog.limits.fields) return `No máximo ${catalog.limits.fields} campos por relatório.`
  if (state.scope === 'selected' && selecionados === 0) return 'Nenhum registro selecionado. Marque na lista ou escolha "Todos".'
  const n = quantosVaoSair(state, { total, selecionados })
  // Com "Só confirmadas" o total da tela é só um teto: quem confere é a API.
  if (n == null || state.confirmed) return null
  if (n === 0) return 'Nenhum registro para exportar.'
  if (n > catalog.limits.rows) {
    return `O relatório passa de ${milhar(catalog.limits.rows)} linhas. Use um filtro para diminuir.`
  }
  const formato = formatoNaTela(state.format, celular)
  if (formato !== 'csv' && n > catalog.limits.pdfRows) {
    return `O PDF aceita até ${milhar(catalog.limits.pdfRows)} linhas. Baixe a planilha ou use um filtro.`
  }
  return null
}

export function textoDoBotao(format: ReportFormat, n: number | undefined): string {
  const quantos = n != null ? ` (${milhar(n)})` : ''
  if (format === 'print') return `Imprimir${quantos}`
  if (format === 'pdf') return `Baixar PDF${quantos}`
  return `Baixar planilha${quantos}`
}

type ValorDeFiltro = string | number | boolean | string[] | null | undefined

/**
 * Os filtros da tela em palavras, com os nomes do catálogo: "Busca: silva",
 * "Só associados em dia". Filtro sem nome no catálogo não aparece.
 */
export function filtrosEmPalavras(
  filters: Record<string, ValorDeFiltro>,
  filterLabels: Record<string, string>,
): string[] {
  const partes: string[] = []
  for (const [chave, valor] of Object.entries(filters)) {
    const nome = filterLabels[chave]
    if (!nome || valor == null || valor === '' || valor === false || valor === 'false') continue
    if (Array.isArray(valor)) {
      if (valor.length) partes.push(`${nome} (${valor.length})`)
    } else if (valor === true || valor === 'true') {
      partes.push(nome)
    } else {
      partes.push(`${nome}: ${valor}`)
    }
  }
  return partes
}

/** Texto do modelo que vai para a API (até 64 caracteres, só para a auditoria e o PDF). */
export function modeloParaApi(state: ReportState, catalog: ExportCatalog): string | undefined {
  const nome = nomeDoModelo(state, catalog)
  return nome ? nome.slice(0, 64) : undefined
}

// ---------------------------------------------------------------------------
// O último relatório de cada fonte, no navegador (fase 1, sem tabela)
// ---------------------------------------------------------------------------

export function chaveDoUltimo(dataset: string): string {
  return `sr:relatorio:${dataset}`
}

/** Lê `{ fields, format }`; qualquer coisa estranha (ou navegador sem storage) = nada salvo. */
export function lerUltimo(dataset: string): UltimoRelatorio | null {
  try {
    const bruto = localStorage.getItem(chaveDoUltimo(dataset))
    if (!bruto) return null
    const dado = JSON.parse(bruto) as Record<string, unknown> | null
    if (!dado || typeof dado !== 'object') return null
    const fields = listaDeTextos(dado.fields)
    const format: ReportFormat = dado.format === 'pdf' || dado.format === 'print' ? dado.format : 'csv'
    return fields.length ? { fields, format } : null
  } catch {
    return null
  }
}

export function guardarUltimo(dataset: string, ultimo: UltimoRelatorio): void {
  try {
    localStorage.setItem(chaveDoUltimo(dataset), JSON.stringify({ fields: ultimo.fields, format: ultimo.format }))
  } catch {
    // Navegador sem storage (aba anônima, cota cheia): só não lembra.
  }
}
