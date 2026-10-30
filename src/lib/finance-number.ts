import { ApiError } from '@/lib/api'

// Nº dos lançamentos do Financeiro (decisão 005, SR-064 na API e SR-066 aqui).
//
// Cada lançamento tem um número (`number`) que nunca se repete, nem com lançamento
// excluído. Sem digitar nada, a API dá o próximo (o maior + 1); digitado à frente do
// próximo, a sequência continua dele. Aqui ficam, como funções puras e testadas, as
// regras e os textos que o formulário usa: o Select/Popover do Radix é instável no
// jsdom e o formulário mora no arquivo da rota.

/** Maior valor que a API aceita (int4 do Postgres). */
export const NUMERO_MAXIMO = 2147483647

/** Quantos dígitos cabem no campo (NUMERO_MAXIMO tem 10). */
export const NUMERO_MAX_DIGITOS = String(NUMERO_MAXIMO).length

/** Inteiro positivo: o que um Nº de lançamento pode ser. */
export function numeroValido(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0
}

/** Só os dígitos do que foi digitado ou colado, no máximo `NUMERO_MAX_DIGITOS`. */
export function soDigitosDoNumero(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, NUMERO_MAX_DIGITOS)
}

/** O que o campo "Nº" vazio diz: "Automático (próximo: 128)"; sem o próximo carregado, só "Automático". */
export function textoAutomatico(proximo: number | null | undefined): string {
  return numeroValido(proximo) ? `Automático (próximo: ${proximo})` : 'Automático'
}

/** Como o Nº aparece em texto corrido: "Nº 128". */
export function rotuloDoNumero(n: number): string {
  return `Nº ${n}`
}

export type NumeroLido =
  | { tipo: 'vazio' }
  | { tipo: 'numero'; valor: number }
  | { tipo: 'invalido'; erro: string }

/** Lê o campo "Nº": vazio, um número ≥ 1 (zeros à esquerda não contam: "0045" é 45) ou um motivo de recusa. */
export function lerNumeroDigitado(texto: string): NumeroLido {
  const t = texto.trim()
  if (t === '') return { tipo: 'vazio' }
  if (!/^\d+$/.test(t)) return { tipo: 'invalido', erro: 'Use só números no Nº.' }
  const valor = Number(t)
  if (valor < 1) return { tipo: 'invalido', erro: 'O Nº precisa ser maior que zero.' }
  if (valor > NUMERO_MAXIMO) return { tipo: 'invalido', erro: `O Nº pode ir até ${NUMERO_MAXIMO}.` }
  return { tipo: 'numero', valor }
}

export type EscolhaDoNumero =
  /** `enviar` é o `number` do corpo; `undefined` = o corpo não leva o campo. */
  | { ok: true; enviar: number | undefined }
  | { ok: false; erro: string }

/**
 * O que fazer com o campo "Nº" ao salvar.
 * - Novo lançamento: vazio = automático, e o POST não manda `number`.
 * - Edição: só manda `number` se mudou; a API não aceita apagar o número (400),
 *   então esvaziar o campo é um erro da tela. `original` é o Nº do lançamento
 *   aberto (`null` só nos excluídos antigos, que a tela nem lista).
 */
export function escolherNumero(
  texto: string,
  opcoes: { editando: boolean; original?: number | null },
): EscolhaDoNumero {
  const lido = lerNumeroDigitado(texto)
  if (lido.tipo === 'invalido') return { ok: false, erro: lido.erro }

  if (lido.tipo === 'vazio') {
    if (opcoes.editando && numeroValido(opcoes.original)) {
      return { ok: false, erro: `Não dá para apagar o Nº do lançamento. Digite um número (o atual é ${opcoes.original}).` }
    }
    return { ok: true, enviar: undefined }
  }

  if (opcoes.editando && lido.valor === opcoes.original) return { ok: true, enviar: undefined }
  return { ok: true, enviar: lido.valor }
}

/** Um número digitado à frente do próximo: a sequência automática passa a continuar dele. */
export type Salto = { de: number; para: number; depois: number }

/** Há salto quando o digitado é maior que o próximo automático. Sem o próximo conhecido, não há como saber. */
export function saltoDaSequencia(digitado: number, proximo: number | null | undefined): Salto | null {
  if (!numeroValido(proximo) || digitado <= proximo) return null
  return { de: proximo, para: digitado, depois: digitado + 1 }
}

/** A pergunta antes de gravar um número que pula a sequência. */
export function textoDoSalto(s: Salto): string {
  return `Esse número pula do ${s.de} para o ${s.para}. Os próximos automáticos continuam do ${s.depois}.`
}

/** Aviso depois de salvar um lançamento novo: "Lançamento registrado: Nº 128" (a API de antes não mandava o número). */
export function textoDoRegistro(numero: number | null | undefined): string {
  return numeroValido(numero) ? `Lançamento registrado: ${rotuloDoNumero(numero)}` : 'Lançamento registrado!'
}

/**
 * Aviso depois de salvar uma transferência, que gera dois lançamentos (saída e entrada):
 * "Transferência registrada: Nº 130 e 131".
 */
export function textoDaTransferencia(lancamentos: ReadonlyArray<{ number?: number | null }> | null | undefined): string {
  const numeros = (lancamentos ?? []).map(l => l.number).filter(numeroValido)
  if (numeros.length === 0) return 'Transferência registrada!'
  const ultimo = numeros[numeros.length - 1]
  const antes = numeros.slice(0, -1)
  return `Transferência registrada: Nº ${antes.length > 0 ? `${antes.join(', ')} e ${ultimo}` : ultimo}`
}

/** 409 de "número em uso": "O número 123 já é de outro lançamento." / "… de um lançamento excluído.". Outros 409 (mês fechado) não. */
export function ehNumeroEmUso(e: unknown): e is ApiError {
  return e instanceof ApiError && e.status === 409 && /^O número \d+ já é de /.test(e.message)
}

/** Nome do arquivo da Nota de Empenho: "nota-empenho-<Nº>.pdf" (sem Nº, "nota-empenho.pdf"). */
export function nomeDoArquivoNotaEmpenho(numero: number | null | undefined): string {
  return numeroValido(numero) ? `nota-empenho-${numero}.pdf` : 'nota-empenho.pdf'
}

/** "Nº anterior: 3144", em letra menor na Nota de Empenho; sem o Nº anterior (`empenho.numero`), null. */
export function textoNumeroAnterior(anterior: string | null | undefined): string | null {
  const t = (anterior ?? '').trim()
  return t ? `Nº anterior: ${t}` : null
}
