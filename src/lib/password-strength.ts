// Força da senha: dica, nunca barreira. O painel usa isso só para orientar quem
// está escolhendo a senha — o botão de salvar continua funcionando de qualquer
// jeito (o mínimo de 8 caracteres é do backend, não daqui).

export type PasswordScore = 0 | 1 | 2 | 3 | 4

export type PasswordStrengthLabel =
  | 'Muito fraca'
  | 'Fraca'
  | 'Razoável'
  | 'Boa'
  | 'Forte'

export type PasswordStrengthResult = {
  score: PasswordScore
  label: PasswordStrengthLabel
  /** Sugestões em ordem de importância (a tela mostra as primeiras). */
  tips: string[]
}

export type PasswordContext = {
  username?: string
  name?: string
}

const LABELS: PasswordStrengthLabel[] = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte']

/** Senhas que qualquer lista de tentativas testa primeiro. */
const COMMON = [
  '123456', '1234567', '12345678', '123456789', '1234567890', '123123', '102030',
  'senha', 'senha123', 'senha1234', 'minhasenha', 'mudar123', 'trocar123',
  'password', 'password123', 'qwerty', 'qwerty123', 'asdf', 'asdfgh', 'abc123',
  'admin', 'admin123', 'administrador', 'master', 'letmein', 'iloveyou',
  'sindicato', 'sindicatorural', 'sindicato123', 'ruraltr', 'terraroxa', 'parana', 'brasil',
]

/** Sequências de teclado/alfabeto usadas para detectar "abcdef", "qwerty" etc. */
const SEQUENCES = [
  'abcdefghijklmnopqrstuvwxyz',
  '01234567890',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
]

/** minúsculo, sem acento e sem espaços — para comparar com nome/usuário. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
}

function classes(password: string): number {
  let n = 0
  if (/[a-z]/.test(password)) n++
  if (/[A-Z]/.test(password)) n++
  if (/[0-9]/.test(password)) n++
  if (/[^a-zA-Z0-9]/.test(password)) n++
  return n
}

/** "123456", "abcdef", "qwerty" (e ao contrário) dentro da senha. */
export function hasSequence(password: string): boolean {
  const p = normalize(password)
  if (p.length < 4) return false
  for (const row of SEQUENCES) {
    const reversed = [...row].reverse().join('')
    for (let i = 0; i + 4 <= row.length; i++) {
      if (p.includes(row.slice(i, i + 4))) return true
      if (p.includes(reversed.slice(i, i + 4))) return true
    }
  }
  // "aaaa", "1111" — mesmo caractere repetido.
  return /(.)\1{3,}/.test(p)
}

/** A senha é (ou contém) uma senha conhecida. */
export function isCommonPassword(password: string): boolean {
  const p = normalize(password)
  if (!p) return false
  // Tira números no fim ("sindicato2024" continua sendo "sindicato").
  const base = p.replace(/[0-9]+$/, '')
  return COMMON.some(c => p === c || base === c || (c.length >= 5 && p.includes(c)))
}

/** A senha repete o usuário ou um pedaço do nome. */
export function usesContext(password: string, context: PasswordContext = {}): 'username' | 'name' | null {
  const p = normalize(password)
  if (!p) return null
  const username = normalize(context.username ?? '')
  if (username.length >= 3 && p.includes(username)) return 'username'
  const parts = (context.name ?? '').split(/\s+/).map(normalize).filter(part => part.length >= 4)
  if (parts.some(part => p.includes(part))) return 'name'
  return null
}

/**
 * Nota de 0 a 4 com dicas do que melhorar. Nunca bloqueia nada: quem insiste
 * numa senha fraca consegue salvar mesmo assim.
 */
export function passwordStrength(
  password: string,
  context: PasswordContext = {},
): PasswordStrengthResult {
  const tips: string[] = []
  if (!password) {
    return {
      score: 0,
      label: 'Muito fraca',
      tips: ['Use pelo menos 12 caracteres', 'Misture letras, números e símbolos'],
    }
  }

  const len = password.length
  const variety = classes(password)

  let points = 0
  if (len >= 8) points++
  if (len >= 12) points++
  if (len >= 16) points++
  if (variety >= 2) points++
  if (variety >= 3) points++
  if (variety === 4) points++

  // Dicas na ordem em que valem mais a pena.
  if (len < 8) tips.push('Use pelo menos 8 caracteres')
  else if (len < 12) tips.push('Use pelo menos 12 caracteres')

  const context_ = usesContext(password, context)
  if (context_ === 'username') tips.push('Evite o seu nome de usuário')
  if (context_ === 'name') tips.push('Evite o seu nome')

  const common = isCommonPassword(password)
  if (common) tips.push('Evite senhas comuns, como "senha123" ou "sindicato"')

  const sequence = hasSequence(password)
  if (sequence) tips.push('Evite sequências como 123456, abcdef ou qwerty')

  if (/^[0-9]+$/.test(password)) tips.push('Não use só números')
  else if (variety < 3) tips.push('Misture letras maiúsculas, minúsculas, números e símbolos')

  // Tetos: nada disso vira senha boa só por ser comprida.
  let score: PasswordScore =
    points <= 1 ? 0 : points === 2 ? 1 : points === 3 ? 2 : points <= 5 ? 3 : 4
  if (sequence || context_) score = Math.min(score, 1) as PasswordScore
  if (common) score = 0

  if (score >= 3 && tips.length === 0) tips.push('Boa senha. Não a use em outros sites.')

  return { score, label: LABELS[score], tips }
}
