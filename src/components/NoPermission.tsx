import { Link } from '@tanstack/react-router'
import { HELP_PERMISSOES } from '@/lib/help'
import { usePermissions } from '@/hooks/usePermissions'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'

type Props = { message?: string }

/** Bloco padrão de "sem permissão" para telas admin gated por permissão. */
export function NoPermission({ message = 'Você não tem permissão para ver esta página.' }: Props) {
  const { isError, retry, retrying } = usePermissions()

  // As telas chegam aqui quando `can()` responde false — o que também acontece
  // quando o /admin/me falhou. Isso não é falta de permissão: avisa e tenta de novo.
  if (isError) {
    return (
      <div className="p-6">
        <LoadErrorRetry
          className="rounded-lg border border-border bg-card"
          message="Não foi possível conferir suas permissões."
          onRetry={retry}
          retrying={retrying}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
        <p>{message}</p>
        {/* Quem chega aqui está travado: dizer só "não pode" deixa a pessoa sem
            saber se é defeito, se ela errou o caminho ou com quem falar. */}
        <Link
          to="/admin/ajuda"
          search={{ topico: HELP_PERMISSOES.topico }}
          hash={HELP_PERMISSOES.hash}
          className="mt-3 inline-flex min-h-11 items-center text-primary hover:underline"
        >
          Por que não vejo esta tela?
        </Link>
      </div>
    </div>
  )
}
