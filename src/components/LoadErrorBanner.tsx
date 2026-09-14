type Props = { message?: string; className?: string }

/** Banner de erro de carregamento (vermelho, nível bloco). Padrão das listas admin. */
export function LoadErrorBanner({ message = 'Erro ao carregar os dados.', className = '' }: Props) {
  return (
    <div
      className={`rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive ${className}`}
    >
      {message}
    </div>
  )
}
