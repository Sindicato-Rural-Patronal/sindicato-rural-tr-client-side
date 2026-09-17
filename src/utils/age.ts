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
