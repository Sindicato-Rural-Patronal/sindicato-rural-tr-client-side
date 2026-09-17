// Valor por extenso do jeito do sistema legado (Nota de Empenho de ruraltr.com.br/sistema).
// Porte da função PHP clássica `valorPorExtenso` (grupos de 3 dígitos, "um mil", ", " entre
// grupos e " e " antes do último), com a vírgula trocada por espaço como aparece na nota antiga.
// Usar só na Nota de Empenho; o resto do sistema usa `valorPorExtenso` de '@/utils/extenso'.

const SINGULAR = ['centavo', 'real', 'mil', 'milhão', 'bilhão', 'trilhão', 'quatrilhão']
const PLURAL = ['centavos', 'reais', 'mil', 'milhões', 'bilhões', 'trilhões', 'quatrilhões']
const C = ['', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']
const D = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
// A função original escreve "dezesete"; aqui vai a grafia correta.
const D10 = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const U = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']

/** Valor em centavos → por extenso em maiúsculas (ex: 104277 → "UM MIL QUARENTA E DOIS REAIS E SETENTA E SETE CENTAVOS"). */
export function valorPorExtensoLegado(cents: number): string {
  const total = Math.round(Math.abs(cents))
  // number_format($valor, 2, ".", ".") + explode("."): grupos de 3 dígitos e, por último, os centavos.
  const reais = String(Math.floor(total / 100))
  const inteiro: string[] = []
  for (let end = reais.length; end > 0; end -= 3) inteiro.unshift(reais.slice(Math.max(0, end - 3), end))
  inteiro.push(String(total % 100))
  for (let i = 0; i < inteiro.length; i++) inteiro[i] = inteiro[i].padStart(3, '0')

  const n = inteiro.length
  const fim = n - (Number(inteiro[n - 1]) > 0 ? 1 : 2)
  let z = 0
  let rt = ''
  for (let i = 0; i < n; i++) {
    const valor = inteiro[i]
    const v = Number(valor)
    const [c0, d1, u2] = [Number(valor[0]), Number(valor[1]), Number(valor[2])]
    const rc = v > 100 && v < 200 ? 'cento' : C[c0]
    const rd = d1 < 2 ? '' : D[d1]
    const ru = v > 0 ? (d1 === 1 ? D10[u2] : U[u2]) : ''

    let r = rc + (rc && (rd || ru) ? ' e ' : '') + rd + (rd && ru ? ' e ' : '') + ru
    const t = n - 1 - i
    r += r ? ' ' + (v > 1 ? PLURAL[t] : SINGULAR[t]) : ''
    if (valor === '000') z++
    else if (z > 0) z--
    if (t === 1 && z > 0 && Number(inteiro[0]) > 0) r += (z > 1 ? ' de ' : '') + PLURAL[t]
    if (r) rt += (i > 0 && i <= fim && v > 0 && z < 1 ? (i < fim ? ', ' : ' e ') : ' ') + r
  }

  const texto = rt
    .replace(/, /g, ' ')
    .replace(/\s+/g, ' ') // o HTML do legado juntava os espaços duplos ("um milhão  de reais")
    .trim()
    .replace(/^e /, '') // só centavos: a função original começaria com "e cinquenta centavos"
  return (texto || 'zero').toLocaleUpperCase('pt-BR')
}
