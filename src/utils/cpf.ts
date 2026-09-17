// Validação de CPF (mesma regra do backend, src/lib/cpf.ts): 11 dígitos, não
// todos iguais e os dois dígitos verificadores corretos. Usada para avisar cedo
// no formulário — quem decide é o backend.

/** Só os dígitos do CPF (aceita com ou sem pontuação). */
export function cpfDigits(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\D/g, '')
}

export function isValidCpf(raw: string | null | undefined): boolean {
  const d = cpfDigits(raw)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const calc = (factor: number) => {
    let sum = 0
    for (let i = 0; i < factor - 1; i++) sum += Number(d[i]) * (factor - i)
    const rest = (sum * 10) % 11
    return rest >= 10 ? 0 : rest
  }
  return calc(10) === Number(d[9]) && calc(11) === Number(d[10])
}

/** Mesmo CPF, ignorando a formatação dos dois lados. */
export function sameCpf(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = cpfDigits(a)
  return da.length > 0 && da === cpfDigits(b)
}
