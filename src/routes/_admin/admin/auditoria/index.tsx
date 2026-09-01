import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuditLogs } from '@/hooks/useAdmin'
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'

export const Route = createFileRoute('/_admin/admin/auditoria/')({
  component: RouteComponent,
})

const methodColor: Record<string, string> = {
  POST: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  PATCH: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
}

function RouteComponent() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useAuditLogs({ page, limit: 30 })
  const rows = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Registro de criações, edições e exclusões feitas no sistema.
        </p>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Erro ao carregar a auditoria.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data / hora</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead className="hidden md:table-cell">Caminho</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <ScrollText className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">Nenhum registro ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      As ações administrativas aparecem aqui conforme acontecem.
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                    {new Date(r.createdAt).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{r.actorName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`font-mono text-[10px] ${methodColor[r.method] ?? ''}`}>
                      {r.method}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.entity}</TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground max-w-xs truncate">
                    {r.path}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{r.statusCode}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" className="h-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">{page} / {totalPages}</span>
          <Button size="sm" variant="outline" className="h-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
