import { ApiError, apiFetch } from '@/lib/api'

// Documentos que o painel monta sozinho, em PDF, no navegador (decisão 006,
// item 7.5; rota da SR-104, tela da SR-106): lista de presença, fichas de
// inscrição, Agenda, os PDFs do Financeiro e os da Unimed. O dado chegou por
// outras rotas e o documento não passa pela API; para ficar na auditoria, o
// painel avisa ANTES de gerar: `POST /admin/export/documents/<tipo>` grava a
// linha "Gerou o documento …" (área Exportação).
//
// Regra: se o registro falhar (sem permissão, 429, sem internet), o documento
// NÃO é gerado e a tela mostra a mensagem. Nenhum documento sai sem linha.
//
// O PDF do "Relatório de cadastros" fica de fora de propósito: ele é montado
// do CSV de `/admin/export/cadastros`, que já grava a linha da planilha; mais
// uma chamada daria duas linhas. Por isso `relatorio-cadastros` nem entra no
// tipo abaixo (a API aceita, o painel não usa).

/** O tipo do documento (`:kind` da rota). É contrato com a API: não se renomeia. */
export type DocumentoDoNavegador =
  | 'lista-presenca'
  | 'ficha-inscricao'
  | 'agenda'
  /** "Baixar PDF" do Financeiro (Relatório do Financeiro). */
  | 'financeiro'
  | 'relatorio-despesas'
  | 'nota-empenho'
  | 'recibo'
  | 'unimed-ficha'
  | 'unimed-termo-adesao'
  | 'unimed-contrato'

/** Como a API grava o escopo. Sem ele: `seleção` com `ids`, senão `todos`. */
export type EscopoDoDocumento = 'seleção' | 'com filtros' | 'todos'

export type RegistroDoDocumento = {
  /** Quantos registros o documento tem. */
  linhas: number
  /** O que ele cobre em palavras curtas: o curso, a pessoa, o período, "Nº 128 · COOP LTDA". */
  alvo?: string | null
  /** Os registros do documento (inscrições, lançamento, beneficiário). Vazios e repetidos saem. */
  ids?: readonly (string | null | undefined)[]
  escopo?: EscopoDoDocumento
}

/** Os limites da rota (a API confere de novo e responderia 400). */
export const LIMITES_DO_DOCUMENTO = { alvo: 120, ids: 1000, id: 64, linhas: 100_000 } as const

/** Partes do alvo juntas com " · ", sem espaço sobrando, cortado no limite da API (com "…"). */
export function alvoDoDocumento(...partes: (string | null | undefined | false)[]): string {
  const texto = partes
    .map(p => (typeof p === 'string' ? p.replace(/\s+/g, ' ').trim() : ''))
    .filter(Boolean)
    .join(' · ')
  const max = LIMITES_DO_DOCUMENTO.alvo
  return texto.length > max ? `${texto.slice(0, max - 1).trimEnd()}…` : texto
}

const DIA = /^\d{4}-\d{2}-\d{2}/

/** "2026-11-12" → "12/11/2026"; um dia só ou "05/10/2026 a 11/10/2026". Sem nenhuma ponta, "". */
export function periodoDoDocumento(from?: string | null, to?: string | null): string {
  const br = (v?: string | null) => (v && DIA.test(v) ? `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}` : '')
  const de = br(from)
  const ate = br(to)
  if (de && ate) return de === ate ? de : `${de} a ${ate}`
  if (de) return `desde ${de}`
  if (ate) return `até ${ate}`
  return ''
}

/** O corpo do POST, já dentro dos limites da API. */
export function corpoDoRegistro(reg: RegistroDoDocumento): {
  linhas: number
  alvo?: string
  ids?: string[]
  escopo?: EscopoDoDocumento
} {
  const linhas = Number.isFinite(reg.linhas)
    ? Math.min(LIMITES_DO_DOCUMENTO.linhas, Math.max(0, Math.round(reg.linhas)))
    : 0
  const corpo: ReturnType<typeof corpoDoRegistro> = { linhas }
  const alvo = alvoDoDocumento(reg.alvo)
  if (alvo) corpo.alvo = alvo
  const ids = [...new Set((reg.ids ?? [])
    .map(id => (typeof id === 'string' ? id.trim() : ''))
    .filter(id => id && id.length <= LIMITES_DO_DOCUMENTO.id))]
  // Acima do limite a lista fica de fora inteira: uma parte dela pareceria a lista toda.
  if (ids.length > 0 && ids.length <= LIMITES_DO_DOCUMENTO.ids) corpo.ids = ids
  if (reg.escopo) corpo.escopo = reg.escopo
  return corpo
}

/** O registro falhou e o documento não foi gerado. A mensagem já é a da tela. */
export class DocumentoNaoRegistradoError extends Error {
  /** O status da API (null sem resposta: sem internet). */
  readonly status: number | null
  constructor(message: string, status: number | null) {
    super(message)
    this.name = 'DocumentoNaoRegistradoError'
    this.status = status
  }
}

export const TEXTOS_DO_REGISTRO = {
  semPermissao: 'Você não tem permissão para gerar este documento.',
  /** 429 sem o texto da rota (o limite geral da API responde em inglês). */
  muitos: 'Muitos documentos seguidos. Aguarde um minuto e tente de novo.',
  falhou: 'O documento não foi gerado: não deu para registrar na auditoria. Confira a internet e tente de novo.',
} as const

/**
 * A mensagem de quando o registro falha. O 429 da rota vem em português ("Muitos
 * documentos seguidos. Aguarde um minuto e tente de novo.") e o 400 também (o
 * corpo fora do formato): vão como vieram. 403, sem internet e 5xx têm texto da tela.
 */
export function mensagemDoRegistro(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return TEXTOS_DO_REGISTRO.semPermissao
    if (err.status === 429) return /^Muit[ao]s /.test(err.message) ? err.message : TEXTOS_DO_REGISTRO.muitos
    if (err.status === 400 && err.message && !/^HTTP \d+$/.test(err.message)) return err.message
  }
  return TEXTOS_DO_REGISTRO.falhou
}

/**
 * Grava na auditoria o documento que vai ser gerado. Chame ANTES de gerar o PDF
 * e não gere se ela lançar: o erro é `DocumentoNaoRegistradoError`, com a
 * mensagem pronta para a tela (`erroDoDocumento`).
 */
export async function registrarDocumento(kind: DocumentoDoNavegador, reg: RegistroDoDocumento): Promise<void> {
  try {
    await apiFetch(`/admin/export/documents/${kind}`, {
      method: 'POST',
      body: JSON.stringify(corpoDoRegistro(reg)),
    })
  } catch (err) {
    throw new DocumentoNaoRegistradoError(mensagemDoRegistro(err), err instanceof ApiError ? err.status : null)
  }
}

/** Para o `catch` de quem gera: a mensagem do registro que falhou, ou o texto de sempre da tela. */
export function erroDoDocumento(err: unknown, fallback: string): string {
  return err instanceof DocumentoNaoRegistradoError ? err.message : fallback
}
