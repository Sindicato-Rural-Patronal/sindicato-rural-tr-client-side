// Montador de relatórios (decisão 006, SR-089): o estado, puro e testado.
//
// O back é o único lugar que define campos, modelos e permissões: o front só
// lê o catálogo (`GET /admin/export/:dataset/catalog`) e guarda as chaves que a
// pessoa escolheu, NA ORDEM das colunas. Nada aqui conhece os campos de uma
// fonte: tudo vem do catálogo.

import {
  EDUCATION_OPTIONS, ETHNICITY_OPTIONS, GENDER_OPTIONS, MARITAL_STATUS_OPTIONS,
} from '@/lib/user-form-options'
import { MEMBER_STATUS, MEMBER_TYPES } from '@/lib/member-types'
import { COURSE_VIEW_LABEL } from '@/lib/course-views'
import { COLUNAS_DO_NOME, pdfColumns } from '@/lib/csv-parse'

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
  /** Formato preferido do modelo da equipe (os de fábrica não têm). */
  format?: FormatoDoModelo
  /** O modelo da equipe como a API devolve (só nos modelos da equipe). */
  daEquipe?: ModeloDaEquipe
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

/**
 * Os modelos do seletor: o Padrão sempre em primeiro, depois os de fábrica e,
 * por último, os da equipe (fase 3), com o id `equipe:<id>` para nunca bater
 * com o de um modelo de fábrica. O modelo da equipe leva também as chaves que
 * saíram do catálogo (`missingFields`): `limparCampos` as tira e avisa.
 */
export function modelosDe(catalog: ExportCatalog, equipe: ModeloDaEquipe[] = []): CatalogModelo[] {
  const deFabrica = catalog.modelos.filter(m => m.id !== PADRAO_ID)
  const padraoDoCatalogo = catalog.modelos.find(m => m.id === PADRAO_ID)
  return [
    { id: PADRAO_ID, name: PADRAO_NOME, fields: catalog.padrao, ...(padraoDoCatalogo?.confirmed ? { confirmed: true } : {}) },
    ...deFabrica,
    ...equipe.map(t => ({
      id: idDaEquipe(t.id),
      name: t.name,
      fields: [...t.fields, ...t.missingFields],
      ...(t.confirmed ? { confirmed: true } : {}),
      ...(t.format ? { format: t.format } : {}),
      daEquipe: t,
    })),
  ]
}

// ---------------------------------------------------------------------------
// Modelos da equipe (decisão 006, fase 3; contrato da SR-114)
// ---------------------------------------------------------------------------

/** O formato que um modelo da equipe guarda (o "Imprimir" é guardado como PDF). */
export type FormatoDoModelo = 'csv' | 'pdf' | 'xlsx'

export type AutorDoModelo = { id: string; username: string | null }

/** Um modelo da equipe, como `GET /admin/report-templates/:dataset` devolve. */
export type ModeloDaEquipe = {
  id: string
  dataset: string
  name: string
  /** As chaves que ainda existem no catálogo, na ordem das colunas. */
  fields: string[]
  /** As chaves gravadas que saíram do catálogo. */
  missingFields: string[]
  format: FormatoDoModelo | null
  /** Só em `registrations` ("Só confirmadas"); null nos outros. */
  confirmed: boolean | null
  createdAt: string
  updatedAt: string
  createdBy: AutorDoModelo
  updatedBy: AutorDoModelo | null
}

/** O nome do modelo vai no `modelo` da exportação, que aceita até 64. */
export const NOME_DO_MODELO_MAX = 64

const PREFIXO_DA_EQUIPE = 'equipe:'

/** O id do modelo da equipe no seletor e no estado. */
export function idDaEquipe(id: string): string {
  return `${PREFIXO_DA_EQUIPE}${id}`
}

export function ehDaEquipe(modeloId: string | null | undefined): modeloId is string {
  return !!modeloId && modeloId.startsWith(PREFIXO_DA_EQUIPE)
}

const FORMATOS_DO_MODELO: readonly FormatoDoModelo[] = ['csv', 'pdf', 'xlsx']

function lerAutor(v: unknown): AutorDoModelo | null {
  if (!v || typeof v !== 'object') return null
  const a = v as Record<string, unknown>
  if (!ehTexto(a.id)) return null
  return { id: a.id, username: ehTexto(a.username) && a.username ? a.username : null }
}

/** Um modelo da resposta da API; fora do formato, null. */
export function lerModeloDaEquipe(data: unknown): ModeloDaEquipe | null {
  if (!data || typeof data !== 'object') return null
  const t = data as Record<string, unknown>
  if (!ehTexto(t.id) || !ehTexto(t.name) || !Array.isArray(t.fields)) return null
  return {
    id: t.id,
    dataset: ehTexto(t.dataset) ? t.dataset : '',
    name: t.name,
    fields: listaDeTextos(t.fields),
    missingFields: listaDeTextos(t.missingFields),
    format: FORMATOS_DO_MODELO.includes(t.format as FormatoDoModelo) ? t.format as FormatoDoModelo : null,
    confirmed: typeof t.confirmed === 'boolean' ? t.confirmed : null,
    createdAt: ehTexto(t.createdAt) ? t.createdAt : '',
    updatedAt: ehTexto(t.updatedAt) ? t.updatedAt : '',
    createdBy: lerAutor(t.createdBy) ?? { id: '', username: null },
    updatedBy: lerAutor(t.updatedBy),
  }
}

/** A lista da API (array). Resposta que não é lista = nenhum modelo. */
export function lerModelosDaEquipe(data: unknown): ModeloDaEquipe[] {
  if (!Array.isArray(data)) return []
  return data.map(lerModeloDaEquipe).filter((t): t is ModeloDaEquipe => !!t)
}

/** A mesma ordem da API: pelo nome, sem diferenciar maiúscula nem acento. */
function porNome(a: ModeloDaEquipe, b: ModeloDaEquipe): number {
  return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
}

/** A lista com o modelo novo ou mudado no lugar certo (antes de a API responder a lista de novo). */
export function comModelo(lista: ModeloDaEquipe[], modelo: ModeloDaEquipe): ModeloDaEquipe[] {
  return [...lista.filter(t => t.id !== modelo.id), modelo].sort(porNome)
}

export function semModelo(lista: ModeloDaEquipe[], id: string): ModeloDaEquipe[] {
  return lista.filter(t => t.id !== id)
}

/** O nome como a API grava: sem caractere de controle e com os espaços juntados. */
export function normalizarNome(nome: string): string {
  return nome.replace(/[\p{Cc}\s]+/gu, ' ').trim()
}

/** O mesmo que a API confere no nome (400), para não pedir à toa. null = pode. */
export function problemaDoNome(nome: string): string | null {
  const limpo = normalizarNome(nome)
  if (!limpo) return 'Informe o nome do modelo.'
  if (limpo.length > NOME_DO_MODELO_MAX) return `O nome do modelo pode ter até ${NOME_DO_MODELO_MAX} caracteres.`
  return null
}

/**
 * Quem não pode exportar um campo do modelo não o muda nem o exclui (a API
 * responde 403 "Este modelo tem campos que você não pode exportar: RG."). O
 * motivo, para os botões desligados; null = pode. Campo que saiu do catálogo
 * não conta, como na API.
 */
export function travaDoModelo(catalog: ExportCatalog, modelo: ModeloDaEquipe): string | null {
  const mapa = camposDoCatalogo(catalog)
  const negados = modelo.fields.map(k => mapa.get(k)).filter((c): c is CampoComGrupo => !!c && !c.allowed)
  if (negados.length === 0) return null
  const rotulos = [...new Set(negados.map(c => c.label))].join(', ')
  return `Você não pode mudar nem excluir este modelo, porque ele tem campos que você não pode exportar: ${rotulos}.`
}

const DIA_BRASILIA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
})

function diaBrasilia(iso: string): string | null {
  const data = new Date(iso)
  return iso && !Number.isNaN(data.getTime()) ? DIA_BRASILIA.format(data) : null
}

/**
 * Quem criou e quem mudou por último, numa frase: "Modelo da equipe, criado por
 * gestor em 10/11/2026 e editado por bali em 11/11/2026." Sem o usuário
 * (administrador que não existe mais), só a data. "Editado", e não "alterado",
 * para não confundir com o "(alterado)" do seletor, que é a tela diferente do
 * modelo.
 */
export function autoriaDoModelo(modelo: ModeloDaEquipe): string {
  const parte = (verbo: string, autor: AutorDoModelo | null, iso: string) => {
    const dia = diaBrasilia(iso)
    const quem = autor?.username ? ` por ${autor.username}` : ''
    return dia ? `${verbo}${quem} em ${dia}` : `${verbo}${quem}`
  }
  const criado = parte('criado', modelo.createdBy, modelo.createdAt)
  const editado = modelo.updatedBy ? ` e ${parte('editado', modelo.updatedBy, modelo.updatedAt)}` : ''
  return `Modelo da equipe, ${criado}${editado}.`
}

/** O corpo do "Salvar como modelo" e do "Salvar alterações no modelo": o relatório de agora. */
export function corpoDoModelo(
  state: ReportState, dataset: string,
): { fields: string[]; format: FormatoDoModelo; confirmed?: boolean } {
  return {
    fields: state.fields,
    format: formatoDaApi(state.format),
    ...(dataset === 'registrations' ? { confirmed: state.confirmed } : {}),
  }
}

/**
 * O relatório na tela está diferente do modelo da equipe aberto? Aí o montador
 * oferece salvar por cima. Contam as colunas (como no "(alterado)"), o formato
 * (quando o modelo tem um; "Imprimir" é o PDF) e, nas inscrições, o "Só
 * confirmadas".
 */
export function mudouDoModelo(state: ReportState, catalog: ExportCatalog, modelo: CatalogModelo, dataset: string): boolean {
  if (!mesmaLista(limparCampos(catalog, modelo.fields).campos, state.fields)) return true
  if (modelo.format && modelo.format !== formatoDaApi(state.format)) return true
  return dataset === 'registrations' && state.confirmed !== (modelo.confirmed === true)
}

/** Modelo do PDF rápido do menu: vai para o cabeçalho do PDF e para a auditoria. */
export const MODELO_RESUMO = 'Resumo'

/**
 * Fontes que só exportavam planilha antes da decisão 006 (o Financeiro e a
 * Auditoria): não há colunas "de sempre" para manter, e os nomes preferidos de
 * `pdfColumns` achariam no Financeiro só "Data" e "Descrição", sem o valor. O
 * PDF rápido delas usa o modelo de fábrica resumido que a API define.
 */
const MODELO_DO_PDF_RAPIDO: Record<string, string> = {
  'finance-transactions': 'resumido',
  'audit-logs': 'resumida',
}

/**
 * A fonte já tinha PDF antes da decisão 006 (montado do CSV)? Só nelas o PDF
 * rápido acima do limite de linhas volta ao PDF do CSV (SR-103). O Financeiro e
 * a Auditoria nunca tiveram PDF: lá isso desenharia até 20.000 linhas no
 * navegador, então acima do limite vale o aviso da API (SR-106).
 */
export function temPdfDoCsv(dataset: string): boolean {
  return !(dataset in MODELO_DO_PDF_RAPIDO)
}

/** O limite do PDF da API quando o catálogo não carregou (o mesmo número dela). */
export const LIMITE_DO_PDF_PADRAO = 2_000

/** O aviso da API para PDF acima do limite ("O PDF aceita até 2.000 linhas. …"). */
export function textoDoLimiteDoPdf(limite: number): string {
  return `O PDF aceita até ${limite.toLocaleString('pt-BR')} linhas. Baixe a planilha ou use um filtro.`
}

export type PdfRapido = {
  /** Chaves do catálogo, na ordem das colunas. */
  fields: string[]
  /** Os rótulos dessas colunas: o PDF montado do CSV (acima do limite) mostra as mesmas. */
  rotulos: string[]
  /** O `modelo` do pedido: o cabeçalho do PDF e a auditoria dizem este nome. */
  modelo: string
}

/**
 * O PDF rápido do menu ("Relatório em PDF › Todos" e "› Selecionados") de uma
 * fonte com catálogo: as colunas de sempre (`camposDoResumo`, modelo "Resumo")
 * ou, nas fontes de `MODELO_DO_PDF_RAPIDO`, o modelo de fábrica resumido. Sem
 * nenhuma coluna possível, null (o PDF sai do CSV).
 */
export function pdfRapido(catalog: ExportCatalog): PdfRapido | null {
  const mapa = camposDoCatalogo(catalog)
  const id = MODELO_DO_PDF_RAPIDO[catalog.dataset]
  const deFabrica = id ? catalog.modelos.find(m => m.id === id) : undefined
  const doModelo = deFabrica ? limparCampos(catalog, deFabrica.fields).campos : []
  const fields = doModelo.length ? doModelo : camposDoResumo(catalog)
  if (fields.length === 0) return null
  return {
    fields,
    rotulos: fields.map(k => mapa.get(k)?.label ?? k),
    modelo: doModelo.length && deFabrica ? deFabrica.name : MODELO_RESUMO,
  }
}

/**
 * O PDF rápido vai pela API? Acima de `limits.pdfRows` linhas (quando a tela
 * sabe quantas), não: a API recusaria, e o PDF sai do CSV, como antes da
 * decisão 006 (SR-103). Sem saber quantas, tenta pela API.
 */
export function pdfRapidoPelaApi(catalog: ExportCatalog, quantos: number | undefined): boolean {
  return quantos == null || quantos <= catalog.limits.pdfRows
}

/**
 * Por onde sai o PDF rápido do menu ("Relatório em PDF › Todos/Selecionados"):
 * - `api`: o JSON da API com as colunas do resumo; `doCsv` (só nas fontes que já
 *   tinham PDF) é o pedido de novo, do CSV, se a API recusar pelo limite de linhas
 *   quando a tela não sabia quantas eram;
 * - `csv`: o PDF montado do CSV (acima do limite ou sem catálogo, nas fontes que já
 *   tinham PDF), com as mesmas colunas que o da API mostraria;
 * - `aviso`: não pede nada e mostra o texto (Financeiro e Auditoria acima do limite,
 *   ou sem o catálogo para saber as colunas).
 */
export type CaminhoDoPdfRapido =
  | { via: 'api'; fields: string[]; modelo: string; doCsv?: { colunasDoPdf: string[] } }
  | { via: 'csv'; colunasDoPdf?: string[] }
  | { via: 'aviso'; mensagem: string }

export const TEXTO_PDF_SEM_CATALOGO = 'Não foi possível montar o PDF agora. Tente de novo ou baixe a planilha.'

/** `quantos`: quantos registros a tela sabe que vão sair (o total ou os selecionados); undefined = não sabe. */
export function caminhoDoPdfRapido(
  dataset: string,
  catalog: ExportCatalog | null,
  quantos: number | undefined,
): CaminhoDoPdfRapido {
  const resumo = catalog ? pdfRapido(catalog) : null
  const doCsv = temPdfDoCsv(dataset)
  const limite = catalog?.limits.pdfRows ?? LIMITE_DO_PDF_PADRAO
  if (quantos != null && quantos > limite) {
    if (!doCsv) return { via: 'aviso', mensagem: textoDoLimiteDoPdf(limite) }
    return resumo ? { via: 'csv', colunasDoPdf: resumo.rotulos } : { via: 'csv' }
  }
  if (resumo) {
    return {
      via: 'api', fields: resumo.fields, modelo: resumo.modelo,
      ...(doCsv ? { doCsv: { colunasDoPdf: resumo.rotulos } } : {}),
    }
  }
  return doCsv ? { via: 'csv' } : { via: 'aviso', mensagem: TEXTO_PDF_SEM_CATALOGO }
}

/**
 * As colunas do PDF rápido do menu ("Relatório em PDF › Todos"): as mesmas que
 * ele mostrava quando era montado do CSV, escolhidas do Padrão pelos nomes
 * preferidos de `pdfColumns` (até 7, na ordem do Padrão), mais o nome do
 * registro onde a coluna não se chama "Nome" (o curso; a propriedade e o dono:
 * `COLUNAS_DO_NOME`, SR-111). Vão como `fields`, e a API devolve o JSON do PDF e
 * registra na auditoria que saiu um PDF e com quais campos. Campo do Padrão sem
 * permissão fica de fora (a API recusaria).
 */
export function camposDoResumo(catalog: ExportCatalog): string[] {
  const mapa = camposDoCatalogo(catalog)
  const padrao = catalog.padrao
    .map(k => mapa.get(k))
    .filter((c): c is CampoComGrupo => !!c && c.allowed)
  return pdfColumns(padrao.map(c => c.label), undefined, COLUNAS_DO_NOME[catalog.dataset]).map(i => padrao[i].key)
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

/** "print" é o mesmo PDF, aberto numa aba nova para imprimir; "xlsx" é a planilha do Excel. */
export type ReportFormat = 'csv' | 'xlsx' | 'pdf' | 'print'

/** O formato que vai para a API: o "Imprimir" é o PDF. */
export function formatoDaApi(format: ReportFormat): 'csv' | 'xlsx' | 'pdf' {
  return format === 'print' ? 'pdf' : format
}

/** PDF ou Imprimir: valem o limite de linhas do PDF e o aviso de letra pequena. */
export function ehPdf(format: ReportFormat): boolean {
  return format === 'pdf' || format === 'print'
}

const FORMATOS_GUARDADOS: readonly ReportFormat[] = ['csv', 'xlsx', 'pdf', 'print']
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

/**
 * O último relatório da fonte, no navegador. `modelo` é o id do modelo que
 * estava aberto (de fábrica ou `equipe:<id>`) e `alterado` diz se as colunas
 * tinham mudado dele. Os dois faltam no que foi guardado antes da SR-115.
 */
export type UltimoRelatorio = { fields: string[]; format: ReportFormat; modelo?: string; alterado?: boolean }

function mesmaLista(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((k, i) => k === b[i])
}

/** O modelo cujas colunas são exatamente estas (para reabrir com o nome dele). */
export function modeloQueBate(catalog: ExportCatalog, campos: string[], equipe: ModeloDaEquipe[] = []): CatalogModelo | null {
  return modelosDe(catalog, equipe).find(m => mesmaLista(limparCampos(catalog, m.fields).campos, campos)) ?? null
}

/** O modelo aberto no montador (null = montado à mão, ou o modelo da equipe não está mais na lista). */
export function modeloAtual(state: ReportState, catalog: ExportCatalog, equipe: ModeloDaEquipe[] = []): CatalogModelo | null {
  if (!state.modeloId) return null
  return modelosDe(catalog, equipe).find(m => m.id === state.modeloId) ?? null
}

/**
 * Como o montador abre: na primeira vez, no Padrão (para ninguém se perder);
 * depois, no último relatório montado nesta fonte. Com registros marcados na
 * lista, "O que entra" começa em "Selecionados".
 *
 * O último pode apontar para um modelo da equipe (`equipe` = a lista; undefined
 * enquanto ela carrega):
 * - usado sem mexer, abre o modelo como ele está agora (alguém da equipe pode
 *   tê-lo mudado depois);
 * - usado com mudança, abre as colunas guardadas, como "(alterado)";
 * - excluído, abre as colunas guardadas, sem o nome dele;
 * - com a lista ainda carregando, abre as colunas guardadas e guarda o id: o
 *   montador chama esta função de novo quando a lista chega.
 */
export function estadoInicial(
  catalog: ExportCatalog,
  { ultimo, selecionados = 0, equipe }: {
    ultimo?: UltimoRelatorio | null
    selecionados?: number
    equipe?: ModeloDaEquipe[] | null
  } = {},
): ReportState {
  const scope: ReportScope = selecionados > 0 ? 'selected' : 'all'
  if (ultimo && ultimo.fields.length) {
    const modelos = modelosDe(catalog, equipe ?? [])
    const guardado = ultimo.modelo ? modelos.find(m => m.id === ultimo.modelo) : undefined
    if (guardado?.daEquipe && ultimo.alterado === false) {
      const doModelo = limparCampos(catalog, guardado.fields)
      if (doModelo.campos.length) {
        return {
          fields: doModelo.campos,
          modeloId: guardado.id,
          format: ultimo.format,
          scope,
          confirmed: guardado.confirmed === true,
          avisos: avisosDaLimpeza(doModelo, 'modelo'),
        }
      }
    }
    const limpos = limparCampos(catalog, ultimo.fields)
    if (limpos.campos.length) {
      const pendente = equipe === undefined && ehDaEquipe(ultimo.modelo) ? ultimo.modelo : null
      const modelo = guardado ?? (pendente ? null : modeloQueBate(catalog, limpos.campos, equipe ?? []))
      return {
        fields: limpos.campos,
        modeloId: modelo?.id ?? pendente,
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

/**
 * O modelo escolhido preenche as colunas e decide "Só confirmadas": liga se ele
 * pede (Lista de presença) e desliga se não pede. Depois a pessoa ainda pode
 * marcar ou desmarcar à mão. O modelo da equipe com formato o aplica também
 * ("Imprimir" continua, se o modelo é PDF: é o mesmo PDF).
 */
export function aplicarModelo(
  state: ReportState, catalog: ExportCatalog, modeloId: string, equipe: ModeloDaEquipe[] = [],
): ReportState {
  const modelo = modelosDe(catalog, equipe).find(m => m.id === modeloId)
  if (!modelo) return state
  const limpos = limparCampos(catalog, modelo.fields)
  const format = modelo.format && !(modelo.format === 'pdf' && state.format === 'print') ? modelo.format : state.format
  return {
    ...state,
    fields: limpos.campos,
    modeloId: modelo.id,
    format,
    confirmed: modelo.confirmed === true,
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

const SUFIXO_ALTERADO = ' (alterado)'

/**
 * Nome do modelo para a tela, o cabeçalho do PDF e a auditoria: "Nome e CPF",
 * "Nome e CPF (alterado)" depois de mexer, ou null quando foi montado à mão.
 */
export function nomeDoModelo(state: ReportState, catalog: ExportCatalog, equipe: ModeloDaEquipe[] = []): string | null {
  const modelo = modeloAtual(state, catalog, equipe)
  if (!modelo) return null
  return colunasAlteradas(state, catalog, modelo) ? `${modelo.name}${SUFIXO_ALTERADO}` : modelo.name
}

/** As colunas mudaram do modelo? (O que saiu por permissão não conta: é o modelo possível.) */
function colunasAlteradas(state: ReportState, catalog: ExportCatalog, modelo: CatalogModelo): boolean {
  return !mesmaLista(limparCampos(catalog, modelo.fields).campos, state.fields)
}

/** As colunas na tela mudaram do modelo aberto? (Para o último guardado.) */
export function modeloAlterado(state: ReportState, catalog: ExportCatalog, equipe: ModeloDaEquipe[] = []): boolean {
  const modelo = modeloAtual(state, catalog, equipe)
  return !!modelo && colunasAlteradas(state, catalog, modelo)
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

/**
 * Quantos registros vão sair. `n` undefined = não se sabe. `teto` = o número é
 * só o máximo: com "Só confirmadas" e a tela sem saber quantas estão
 * confirmadas, sai no máximo o total (quem conta é a API).
 */
export type Quantos = { n: number | undefined; teto: boolean }

export function quantosVaoSair(
  state: ReportState,
  { total, selecionados, totalConfirmadas }: { total?: number; selecionados: number; totalConfirmadas?: number },
): Quantos {
  const base = state.scope === 'selected' ? selecionados : total
  if (!state.confirmed) return { n: base, teto: false }
  if (state.scope === 'all' && totalConfirmadas != null) return { n: totalConfirmadas, teto: false }
  return { n: base, teto: base != null }
}

const milhar = (n: number) => n.toLocaleString('pt-BR')

/** " (123)", " (até 123)" ou nada, para o botão e o "Todos". */
export function contagem({ n, teto }: Quantos): string {
  return n != null ? ` (${teto ? 'até ' : ''}${milhar(n)})` : ''
}

export const TEXTO_NENHUM_REGISTRO = 'Nenhum registro para exportar.'
export const TEXTO_NENHUMA_CONFIRMADA = 'Nenhuma inscrição confirmada. Desmarque "Só confirmadas" para levar todas.'

/**
 * Por que o botão de baixar está desligado (null = pode baixar). São os mesmos
 * limites que a API confere; aqui é só para a pessoa não esperar à toa.
 */
export function problemaParaBaixar(
  state: ReportState,
  catalog: ExportCatalog,
  { total, selecionados, totalConfirmadas, celular = false }: {
    total?: number
    selecionados: number
    totalConfirmadas?: number
    celular?: boolean
  },
): string | null {
  if (state.fields.length === 0) return 'Escolha pelo menos um campo.'
  if (state.fields.length > catalog.limits.fields) return `No máximo ${catalog.limits.fields} campos por relatório.`
  if (state.scope === 'selected' && selecionados === 0) return 'Nenhum registro selecionado. Marque na lista ou escolha "Todos".'
  const { n, teto } = quantosVaoSair(state, { total, selecionados, totalConfirmadas })
  if (n == null) return null
  if (n === 0) return state.confirmed && !teto ? TEXTO_NENHUMA_CONFIRMADA : TEXTO_NENHUM_REGISTRO
  // Só o teto: quem confere os limites é a API.
  if (teto) return null
  if (n > catalog.limits.rows) {
    return `O relatório passa de ${milhar(catalog.limits.rows)} linhas. Use um filtro para diminuir.`
  }
  const formato = formatoNaTela(state.format, celular)
  if (ehPdf(formato) && n > catalog.limits.pdfRows) return textoDoLimiteDoPdf(catalog.limits.pdfRows)
  return null
}

/**
 * Quantos saem quando a fonte corta em vez de recusar: a Auditoria leva só as
 * `limits.rows` linhas mais recentes, como sempre levou, e nunca dá o "passa de
 * 20.000 linhas". Nas outras fontes, o total como veio.
 */
export function totalComCorte(total: number | undefined, catalog: ExportCatalog, cortaNoLimite = false): number | undefined {
  return cortaNoLimite && total != null ? Math.min(total, catalog.limits.rows) : total
}

/**
 * O aviso do corte, quando a lista passa do limite (null = não corta nada). Vale
 * no montador e no menu Exportar (SR-106), antes do clique; sem o catálogo, o
 * limite é o da API (20.000).
 */
export function avisoDoCorte(
  total: number | undefined, catalog: Pick<ExportCatalog, 'limits'> | null, cortaNoLimite = false,
): string | null {
  const limite = catalog?.limits.rows ?? LIMITES_PADRAO.rows
  if (!cortaNoLimite || total == null || total <= limite) return null
  return `Saem só as ${milhar(limite)} linhas mais recentes.`
}

export function textoDoBotao(format: ReportFormat, quantos: Quantos): string {
  const numero = contagem(quantos)
  if (format === 'print') return `Imprimir${numero}`
  if (format === 'pdf') return `Baixar PDF${numero}`
  if (format === 'xlsx') return `Baixar planilha do Excel${numero}`
  return `Baixar planilha${numero}`
}

/** O aviso depois de baixar: "Planilha do Excel com 3 registros baixada." (milhar com ponto). */
export function textoDoBaixado(format: 'csv' | 'xlsx' | 'pdf', count: number): string {
  const [nome, fim] = format === 'pdf' ? ['Relatório', 'baixado']
    : format === 'xlsx' ? ['Planilha do Excel', 'baixada']
      : ['Planilha', 'baixada']
  if (count === 1) return `${nome} com 1 registro ${fim}.`
  if (count >= 0) return `${nome} com ${milhar(count)} registros ${fim}.`
  return `${nome} ${fim}.`
}

type ValorDeFiltro = string | number | boolean | string[] | null | undefined

const deOpcoes = (lista: readonly { value: string; label: string }[]) =>
  Object.fromEntries(lista.map(o => [o.value, o.label]))

/**
 * Rótulo de cada valor dos filtros de lista fixa, os mesmos dos selects das
 * telas ("FEMALE" → "Feminino"). A chave é a do filtro que a tela manda.
 */
export const ROTULOS_DOS_VALORES: Record<string, Record<string, string>> = {
  gender: deOpcoes(GENDER_OPTIONS),
  ethnicity: deOpcoes(ETHNICITY_OPTIONS),
  educationLevel: deOpcoes(EDUCATION_OPTIONS),
  maritalStatus: deOpcoes(MARITAL_STATUS_OPTIONS),
  memberType: deOpcoes(MEMBER_TYPES),
  memberStatus: deOpcoes(MEMBER_STATUS),
  // Abas da lista de cursos ("Aba: Próximos"). O `type` das empresas NÃO entra
  // aqui: a mesma chave existe nas reservas, com outros valores. A tela de
  // empresas diz o tipo pelo `filterTexts`.
  view: COURSE_VIEW_LABEL,
}

const DIA = /^\d{4}-\d{2}-\d{2}$/

/** "2026-01-31" → "31/01/2026". */
const diaBr = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`

/**
 * Um período de dias (AAAA-MM-DD) em palavras, como a API escreve no PDF:
 * "Período: 01/01/2026 a 31/01/2026", "Dia: 05/10/2026" (início = fim), "De: …"
 * ou "Até: …" (só uma ponta). Sem nenhuma, null.
 */
export function periodoEmPalavras(from?: string | null, to?: string | null): string | null {
  const de = from && DIA.test(from) ? from : null
  const ate = to && DIA.test(to) ? to : null
  if (de && ate) return de === ate ? `Dia: ${diaBr(de)}` : `Período: ${diaBr(de)} a ${diaBr(ate)}`
  if (de) return `De: ${diaBr(de)}`
  if (ate) return `Até: ${diaBr(ate)}`
  return null
}

/**
 * Os filtros da tela em palavras, com os nomes do catálogo: "Busca: silva",
 * "Sexo: Feminino", "Só associados em dia". Filtro sem nome no catálogo não
 * aparece. `textos` troca a parte de um filtro pelo que a tela sabe dizer
 * melhor ("Curso: Horta" em vez de "Cursos (1)").
 *
 * O valor `false` não aparece (`activeMember: false` não filtra nada), a não
 * ser que a tela dê o texto dele: `isPartner: false` é "Só não parceiras".
 *
 * `from` e `to` em dias (Auditoria, Agenda, Financeiro) viram uma parte só, no
 * lugar do primeiro deles, como a API diz: "Período: 01/01/2026 a 31/01/2026".
 */
export function filtrosEmPalavras(
  filters: Record<string, ValorDeFiltro>,
  filterLabels: Record<string, string>,
  { textos = {}, valores = ROTULOS_DOS_VALORES }: {
    textos?: Record<string, string>
    valores?: Record<string, Record<string, string>>
  } = {},
): string[] {
  const partes: string[] = []
  const diaDo = (chave: 'from' | 'to') => {
    const v = filters[chave]
    return filterLabels[chave] && typeof v === 'string' && DIA.test(v) ? v : null
  }
  let periodoDito = false
  for (const [chave, valor] of Object.entries(filters)) {
    const nome = filterLabels[chave]
    if (!nome || valor == null || valor === '') continue
    if (Array.isArray(valor) && valor.length === 0) continue
    if ((chave === 'from' || chave === 'to') && !textos[chave] && typeof valor === 'string' && DIA.test(valor)) {
      if (!periodoDito) {
        periodoDito = true
        const periodo = periodoEmPalavras(diaDo('from'), diaDo('to'))
        if (periodo) partes.push(periodo)
      }
      continue
    }
    if (textos[chave]) {
      partes.push(textos[chave])
    } else if (valor === false || valor === 'false') {
      continue
    } else if (Array.isArray(valor)) {
      partes.push(`${nome} (${valor.length})`)
    } else if (valor === true || valor === 'true') {
      partes.push(nome)
    } else {
      partes.push(`${nome}: ${valores[chave]?.[String(valor)] ?? valor}`)
    }
  }
  return partes
}

/**
 * Texto do modelo que vai para a API (até 64 caracteres, só para a auditoria e
 * o PDF). Com "(alterado)" e o nome comprido (modelo da equipe de 64), o nome é
 * que encurta, com "…": o "(alterado)" não pode se perder.
 */
export function modeloParaApi(state: ReportState, catalog: ExportCatalog, equipe: ModeloDaEquipe[] = []): string | undefined {
  const modelo = modeloAtual(state, catalog, equipe)
  if (!modelo) return undefined
  if (!colunasAlteradas(state, catalog, modelo)) return modelo.name.slice(0, NOME_DO_MODELO_MAX)
  const cabe = NOME_DO_MODELO_MAX - SUFIXO_ALTERADO.length
  const nome = modelo.name.length > cabe ? `${modelo.name.slice(0, cabe - 1).trimEnd()}…` : modelo.name
  return `${nome}${SUFIXO_ALTERADO}`
}

// ---------------------------------------------------------------------------
// O último relatório de cada fonte, no navegador (fase 1, sem tabela)
// ---------------------------------------------------------------------------

export function chaveDoUltimo(dataset: string): string {
  return `sr:relatorio:${dataset}`
}

/**
 * Lê `{ fields, format, modelo?, alterado? }`; qualquer coisa estranha (ou
 * navegador sem storage) = nada salvo. Sem `modelo` (guardado antes da SR-115),
 * o nome volta quando as colunas batem com um modelo.
 */
export function lerUltimo(dataset: string): UltimoRelatorio | null {
  try {
    const bruto = localStorage.getItem(chaveDoUltimo(dataset))
    if (!bruto) return null
    const dado = JSON.parse(bruto) as Record<string, unknown> | null
    if (!dado || typeof dado !== 'object') return null
    const fields = listaDeTextos(dado.fields)
    const format: ReportFormat = FORMATOS_GUARDADOS.includes(dado.format as ReportFormat)
      ? dado.format as ReportFormat
      : 'csv'
    if (!fields.length) return null
    return {
      fields,
      format,
      ...(ehTexto(dado.modelo) && dado.modelo ? { modelo: dado.modelo } : {}),
      ...(typeof dado.alterado === 'boolean' ? { alterado: dado.alterado } : {}),
    }
  } catch {
    return null
  }
}

export function guardarUltimo(dataset: string, ultimo: UltimoRelatorio): void {
  try {
    localStorage.setItem(chaveDoUltimo(dataset), JSON.stringify({
      fields: ultimo.fields,
      format: ultimo.format,
      ...(ultimo.modelo ? { modelo: ultimo.modelo, alterado: ultimo.alterado === true } : {}),
    }))
  } catch {
    // Navegador sem storage (aba anônima, cota cheia): só não lembra.
  }
}

/** O que guardar do relatório que acabou de sair: as colunas, o formato e o modelo aberto (se houver). */
export function ultimoDoEstado(state: ReportState, catalog: ExportCatalog, equipe: ModeloDaEquipe[] = []): UltimoRelatorio {
  const modelo = modeloAtual(state, catalog, equipe)
  return {
    fields: state.fields,
    format: state.format,
    ...(modelo ? { modelo: modelo.id, alterado: colunasAlteradas(state, catalog, modelo) } : {}),
  }
}

// ---------------------------------------------------------------------------
// A planilha rápida do menu Exportar: CSV ou Excel, lembrado no navegador
// ---------------------------------------------------------------------------

export type FormatoDaPlanilha = 'csv' | 'xlsx'

/** Um só para todas as listas: quem prefere o Excel prefere em todas. */
export const CHAVE_DA_PLANILHA = 'sr:planilha'

export function lerFormatoDaPlanilha(): FormatoDaPlanilha {
  try {
    return localStorage.getItem(CHAVE_DA_PLANILHA) === 'xlsx' ? 'xlsx' : 'csv'
  } catch {
    return 'csv'
  }
}

export function guardarFormatoDaPlanilha(formato: FormatoDaPlanilha): void {
  try {
    localStorage.setItem(CHAVE_DA_PLANILHA, formato)
  } catch {
    // Navegador sem storage: só não lembra.
  }
}
