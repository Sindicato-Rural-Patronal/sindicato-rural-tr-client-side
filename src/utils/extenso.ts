// Valor em centavos → por extenso em português (ex: 23000 → "DUZENTOS E TRINTA REAIS").

const UNIDADES = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
]
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

// 0..999
function trio(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cem'
  const c = Math.floor(n / 100)
  const resto = n % 100
  const parts: string[] = []
  if (c) parts.push(CENTENAS[c])
  if (resto) {
    if (resto < 20) parts.push(UNIDADES[resto])
    else {
      const d = Math.floor(resto / 10)
      const u = resto % 10
      parts.push(u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d])
    }
  }
  return parts.join(' e ')
}

const ESCALAS: [string, string][] = [
  ['', ''],
  ['mil', 'mil'],
  ['milhão', 'milhões'],
  ['bilhão', 'bilhões'],
]

function inteiroExtenso(n: number): string {
  if (n === 0) return 'zero'
  const grupos: number[] = []
  let x = n
  while (x > 0) { grupos.unshift(x % 1000); x = Math.floor(x / 1000) }
  const len = grupos.length
  const parts: string[] = []
  grupos.forEach((val, i) => {
    if (val === 0) return
    const escala = len - 1 - i
    if (escala === 1) {
      parts.push(val === 1 ? 'mil' : `${trio(val)} mil`)
    } else if (escala >= 2) {
      const [sing, plur] = ESCALAS[escala]
      parts.push(`${trio(val)} ${val === 1 ? sing : plur}`)
    } else {
      parts.push(trio(val))
    }
  })
  return parts.join(' e ')
}

export function valorPorExtenso(cents: number): string {
  const abs = Math.abs(Math.round(cents))
  const reais = Math.floor(abs / 100)
  const centavos = abs % 100
  const parts: string[] = []
  if (reais > 0) parts.push(`${inteiroExtenso(reais)} ${reais === 1 ? 'real' : 'reais'}`)
  if (centavos > 0) parts.push(`${inteiroExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`)
  if (parts.length === 0) return 'ZERO REAIS'
  return parts.join(' e ').toUpperCase()
}
