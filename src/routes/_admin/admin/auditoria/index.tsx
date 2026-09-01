import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuditLogs } from '@/hooks/useAdmin'
import { usePermissions } from '@/hooks/usePermissions'
import { ScrollText, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Dot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'

export const Route = createFileRoute('/_admin/admin/auditoria/')({
  component: RouteComponent,
})

// Transforma método+entidade em frase legível pra qualquer pessoa.
const VERB: Record<string, string> = { POST: 'Criou', PATCH: 'Editou', PUT: 'Editou', DELETE: 'Excluiu' }
const ENTITY: Record<string, { n: string; a: string }> = {
  'Curso': { n: 'curso', a: 'um' },
  'Cotação': { n: 'cotação', a: 'uma' },
  'Sala': { n: 'sala', a: 'uma' },
  'Usuário': { n: 'usuário', a: 'um' },
  'Inscrição': { n: 'inscrição', a: 'uma' },
  'Notícia': { n: 'notícia', a: 'uma' },
  'Banner': { n: 'banner', a: 'um' },
  'Regra': { n: 'regra', a: 'uma' },
  'Instrutor': { n: 'instrutor', a: 'um' },
  'Mensagem': { n: 'mensagem', a: 'uma' },
  'Propriedade': { n: 'propriedade', a: 'uma' },
  'Relação': { n: 'relação', a: 'uma' },
  'Endereço': { n: 'endereço', a: 'um' },
  'Outro': { n: 'registro', a: 'um' },
}
function acaoLegivel(method: string, entity: string): string {
  const v = VERB[method] ?? method
  const e = ENTITY[entity] ?? { n: entity.toLowerCase(), a: 'um' }
  return `${v} ${e.a} ${e.n}`
}
type ActionKind = 'create' | 'edit' | 'delete' | 'other'
function actionKind(method: string): ActionKind {
  if (method === 'POST') return 'create'
  if (method === 'PATCH' || method === 'PUT') return 'edit'
  if (method === 'DELETE') return 'delete'
  return 'other'
}
const KIND_ICON = { create: Plus, edit: Pencil, delete: Trash2, other: Dot }
const KIND_COLOR: Record<ActionKind, string> = {
  create: 'text-emerald-600 dark:text-emerald-400',
  edit: 'text-amber-600 dark:text-amber-400',
  delete: 'text-red-600 dark:text-red-400',
  other: 'text-muted-foreground',
}

function RouteComponent() {
  const { can, isLoading: permLoading } = usePermissions()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useAuditLogs({ page, limit: 30 })
  const rows = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  if (!permLoading && !can('READ_AUDIT')) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          Você não tem permissão para ver a auditoria.
        </div>
      </div>
    )
  }

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
                <TableHead>Quando</TableHead>
                <TableHead>Quem</TableHead>
                <TableHead>O que aconteceu</TableHead>
                <TableHead className="hidden lg:table-cell">Detalhe técnico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-16 text-center">
                    <ScrollText className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">Nenhum registro ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      As ações administrativas aparecem aqui conforme acontecem.
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {rows.map(r => {
                const kind = actionKind(r.method)
                const Icon = KIND_ICON[kind]
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums text-xs">
                      {new Date(r.createdAt).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{r.actorName}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <Icon className={`size-4 shrink-0 ${KIND_COLOR[kind]}`} />
                        <span className="text-foreground">{acaoLegivel(r.method, r.entity)}</span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-[11px] text-muted-foreground max-w-xs truncate">
                      {r.method} {r.path} · {r.statusCode}
                    </TableCell>
                  </TableRow>
                )
              })}
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
