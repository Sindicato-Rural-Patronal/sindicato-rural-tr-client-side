import { calcAge } from '@/utils/age'

/** Mostra a idade calculada; em vermelho (terra roxa) + aviso quando menor de 18. */
export function AgeHint({ birthDate }: { birthDate: string | null | undefined }) {
  const age = calcAge(birthDate)
  if (age === null) return null
  const minor = age < 18
  return (
    <span className={`text-xs font-medium ${minor ? 'text-destructive' : 'text-muted-foreground'}`}>
      <span className="tabular-nums">{age}</span> {age === 1 ? 'ano' : 'anos'}{minor ? ' · menor de idade' : ''}
    </span>
  )
}
