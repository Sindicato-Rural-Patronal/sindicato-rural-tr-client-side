type Props = { message?: string }

/** Bloco padrão de "sem permissão" para telas admin gated por permissão. */
export function NoPermission({ message = 'Você não tem permissão para ver esta página.' }: Props) {
  return (
    <div className="p-6">
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
        {message}
      </div>
    </div>
  )
}
