import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AuditTrailItem } from '@/hooks/useAuditTrail'
import { auditChanges, auditFieldLabel, formatAuditValue } from '@/lib/audit-fields'

// Detalhe de uma linha da auditoria: de onde veio (IP, local, navegador) e o que mudou.
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

  return (
    <div className="flex flex-col gap-4 py-1">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_1fr] sm:gap-y-2">
        <dt className="text-xs text-muted-foreground sm:text-sm">IP</dt>
        <dd className="mb-2 flex flex-wrap items-center gap-2 sm:mb-0">
          {row.ip ? (
            <>
              <span className="font-mono text-foreground">{row.ip}</span>
              {!ipFiltered && (
                <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => onFilterIp(row.ip!)}>
                  <Filter className="size-3.5" />
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
              <span className="block break-all font-mono text-[11px] text-muted-foreground">{row.userAgent}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Não registrado</span>
          )}
        </dd>

        <dt className="text-xs text-muted-foreground sm:text-sm">Rota</dt>
        <dd className="break-all font-mono text-[11px] text-muted-foreground">
          {row.method} {row.path} · {row.statusCode}
        </dd>
      </dl>

      {changes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">O que mudou</p>
          <div className="overflow-x-auto rounded-md border border-border">
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
