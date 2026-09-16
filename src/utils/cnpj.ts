// Validação de CNPJ (mesma regra do backend, src/lib/cnpj.ts): 14 dígitos, não
// todos iguais e os dois dígitos verificadores corretos. Usada só para avisar
// cedo no formulário — quem decide é o backend.
export function isValidCnpj(raw: string): boolean {
  const d = raw.replace(/\D/g, '')
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = weights.reduce((acc, w, i) => acc + Number(d[i]) * w, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
}
