import { passwordStrength, type PasswordContext, type PasswordScore } from '@/lib/password-strength'

// Barra + rótulo + até duas dicas do que melhorar na senha. É só orientação:
// nunca desabilita o botão de salvar nem impede o envio do formulário.

const BAR_COLOR: Record<PasswordScore, string> = {
  0: 'bg-red-500',
  1: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-emerald-500',
  4: 'bg-emerald-600',
}
const TEXT_COLOR: Record<PasswordScore, string> = {
  0: 'text-red-600 dark:text-red-400',
  1: 'text-red-600 dark:text-red-400',
  2: 'text-amber-600 dark:text-amber-400',
  3: 'text-emerald-600 dark:text-emerald-400',
  4: 'text-emerald-600 dark:text-emerald-400',
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
        <span className={`text-[11px] font-medium ${TEXT_COLOR[score]}`}>{label}</span>
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
