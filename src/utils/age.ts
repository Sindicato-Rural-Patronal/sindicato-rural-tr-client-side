/** Calcula a idade (anos completos) a partir de uma data "YYYY-MM-DD" ou ISO. */
export function calcAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null
  const iso = birthDate.split('T')[0]
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const now = new Date()
  let age = now.getFullYear() - y
  const monthDiff = now.getMonth() + 1 - m
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d)) age--
  return age >= 0 && age < 150 ? age : null
}

/** Rótulo curto tipo "34 anos" (ou "" se a data for inválida/vazia). */
export function ageLabel(birthDate: string | null | undefined): string {
  const age = calcAge(birthDate)
  return age === null ? '' : `${age} ${age === 1 ? 'ano' : 'anos'}`
}
