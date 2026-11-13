import type { ReactNode } from 'react'
import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AuditTrailItem } from '@/hooks/useAuditTrail'
import { auditChanges, auditFieldLabel, formatAuditValue } from '@/lib/audit-fields'
import { detalhesDaExportacao, type DetalhesDaExportacao } from '@/components/export/export-details'

// Detalhe de uma linha da auditoria: de onde veio (IP, local, navegador), o que
// mudou e, na exportação, o que foi exportado (formato, modelo, campos, filtros).

function OQueFoiExportado({ detalhes }: { detalhes: DetalhesDaExportacao }) {
  const linhas: [string, ReactNode][] = []
  if (detalhes.formato) linhas.push(['Formato', detalhes.formato])
  if (detalhes.modelo) linhas.push(['Modelo', detalhes.modelo])
  if (detalhes.escopo) linhas.push(['O que entrou', detalhes.escopo])
  if (detalhes.linhas != null) {
    linhas.push(['Registros', detalhes.linhas.toLocaleString('pt-BR')])
  }
  if (detalhes.filtros.length) {
    linhas.push(['Filtros', (
      <ul className="flex flex-col gap-0.5">
        {detalhes.filtros.map((f, i) => (
          <li key={`${f.nome}-${i}`}>{f.valor ? <>{f.nome}: <span className="text-foreground">{f.valor}</span></> : f.nome}</li>
        ))}
      </ul>
    )])
  }
  if (detalhes.campos.length) {
    linhas.push([`Campos (${detalhes.campos.length})`, (
      <ol className="flex flex-wrap gap-1">
        {detalhes.campos.map((c, i) => (
          <li key={`${c}-${i}`} className="rounded-md border border-border bg-card px-1.5 py-0.5 text-xs text-foreground">
            {c}
          </li>
        ))}
      </ol>
    )])
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">O que foi exportado</p>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 rounded-lg border border-border bg-card p-3 text-sm sm:grid-cols-[max-content_1fr] sm:gap-y-2">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="contents">
            <dt className="text-xs text-muted-foreground sm:text-sm">{rotulo}</dt>
            <dd className="mb-2 min-w-0 text-foreground sm:mb-0">{valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
export function AuditRowDetails({
  row,
  ipFiltered,
  onFilterIp,
}: {
  row: AuditTrailItem
  /** Já filtrando por este IP: esconde o botão. */
  ipFiltered: boolean
  onFilterIp: (ip: string) => void
}) {
  const changes = auditChanges(row.changes)
  const exportado = detalhesDaExportacao(row.details)

  return (
    <div className="flex flex-col gap-4 py-1">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_1fr] sm:gap-y-2">
        <dt className="text-xs text-muted-foreground sm:text-sm">IP</dt>
        <dd className="mb-2 flex flex-wrap items-center gap-2 sm:mb-0">
          {row.ip ? (
            <>
              <span className="font-mono text-foreground">{row.ip}</span>
              {!ipFiltered && (
                <Button size="xs" variant="outline" onClick={() => onFilterIp(row.ip!)}>
                  <Filter aria-hidden />
                  Filtrar por este IP
                </Button>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">Não registrado</span>
          )}
        </dd>

        <dt className="text-xs text-muted-foreground sm:text-sm">Local aproximado</dt>
        <dd className="mb-2 text-foreground sm:mb-0">
          {row.location ?? <span className="text-muted-foreground">Não identificado</span>}
        </dd>

        <dt className="text-xs text-muted-foreground sm:text-sm">Navegador e aparelho</dt>
        <dd className="mb-2 min-w-0 sm:mb-0">
          {row.userAgent ? (
            <>
              {row.device && <span className="block text-foreground">{row.device}</span>}
              <span className="block break-all font-mono text-xs text-muted-foreground">{row.userAgent}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Não registrado</span>
          )}
        </dd>

        <dt className="text-xs text-muted-foreground sm:text-sm">Rota</dt>
        <dd className="break-all font-mono text-xs text-muted-foreground">
          {row.method} {row.path} · {row.statusCode}
        </dd>
      </dl>

      {exportado && <OQueFoiExportado detalhes={exportado} />}

      {changes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">O que mudou</p>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Campo</th>
                  <th className="px-3 py-2 font-medium">Antes</th>
                  <th className="px-3 py-2 font-medium">Depois</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((c, i) => (
                  <tr key={`${c.field}-${i}`} className="border-t border-border align-top">
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-foreground" title={c.field}>
                      {auditFieldLabel(c.field)}
                    </td>
                    <td className="max-w-[280px] break-words px-3 py-2 text-muted-foreground">
                      {formatAuditValue(c.field, c.before)}
                    </td>
                    <td className="max-w-[280px] break-words px-3 py-2 text-foreground">
                      {formatAuditValue(c.field, c.after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
