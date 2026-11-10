import { passwordStrength, type PasswordContext, type PasswordScore } from '@/lib/password-strength'

// Barra + rótulo + até duas dicas do que melhorar na senha. É só orientação:
// nunca desabilita o botão de salvar nem impede o envio do formulário.
// Cores do tema: fraca no vermelho da terra roxa, média no âmbar e forte no verde.

const BAR_COLOR: Record<PasswordScore, string> = {
  0: 'bg-destructive',
  1: 'bg-destructive',
  2: 'bg-warning',
  3: 'bg-success',
  4: 'bg-success',
}
const TEXT_COLOR: Record<PasswordScore, string> = {
  0: 'text-destructive',
  1: 'text-destructive',
  2: 'text-warning',
  3: 'text-success',
  4: 'text-success',
}

type Props = {
  password: string
  /** Usuário e nome, para avisar quando a senha repete um deles. */
  context?: PasswordContext
  /** Máximo de dicas exibidas (padrão 2). */
  maxTips?: number
  className?: string
}

export function PasswordStrengthHint({ password, context, maxTips = 2, className }: Props) {
  if (!password) return null
  const { score, label, tips } = passwordStrength(password, context)
  const filled = score + 1

  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`} aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex h-1 flex-1 gap-1" role="presentation">
          {[0, 1, 2, 3, 4].map(i => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${i < filled ? BAR_COLOR[score] : 'bg-muted'}`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium ${TEXT_COLOR[score]}`}>{label}</span>
      </div>
      <p className="sr-only">Força da senha: {label}.</p>
      {tips.slice(0, maxTips).map(tip => (
        <p key={tip} className="text-xs text-muted-foreground">
          {tip}
        </p>
      ))}
    </div>
  )
}
