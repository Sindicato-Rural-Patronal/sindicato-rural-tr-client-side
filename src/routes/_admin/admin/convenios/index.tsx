import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, HeartHandshake, Pencil, Plus, Trash2 } from 'lucide-react'
import { requirePermission } from '@/lib/auth-guard'
import { apiErrorMessage } from '@/lib/api-error-message'
import { STICKY_ACTIONS_CELL, STICKY_ACTIONS_ROW } from '@/lib/table-sticky-actions'
import { usePermissions } from '@/hooks/usePermissions'
import { useAdminConvenios, useDeleteConvenio, type Convenio } from '@/hooks/useConvenios'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { EmptyState } from '@/components/EmptyState'

export const Route = createFileRoute('/_admin/admin/convenios/')({
  beforeLoad: () => requirePermission('READ_CONVENIO'),
  component: ConveniosAdminPage,
})

function ConveniosAdminPage() {
  const { can } = usePermissions()
  const { data, isLoading, isError } = useAdminConvenios()
  const deleteM = useDeleteConvenio()
  const [deleteTarget, setDeleteTarget] = useState<Convenio | null>(null)
  const list = data ?? []

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteM.mutateAsync(deleteTarget.id)
      toast.success('Convênio excluído.')
      setDeleteTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao excluir o convênio.'))
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Convênios</h1>
          <p className="text-sm text-muted-foreground">
            Páginas públicas do menu "Convênios" do site: tabela de valores, documentos e informações.
          </p>
        </div>
        {can('CREATE_CONVENIO') && (
          <Button asChild className="shrink-0">
            <Link to="/admin/convenios/novo"><Plus className="size-4" /> Novo convênio</Link>
          </Button>
        )}
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar os convênios." />}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Convênio</TableHead>
                <TableHead className="hidden md:table-cell">Endereço no site</TableHead>
                <TableHead className="hidden lg:table-cell">Faixas de preço</TableHead>
                <TableHead className="hidden sm:table-cell">Ordem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden xl:table-cell">Atualizado em</TableHead>
                <TableHead className={`text-right ${STICKY_ACTIONS_CELL}`}>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className={STICKY_ACTIONS_CELL}><Skeleton className="h-7 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))}

              {!isLoading && list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={HeartHandshake}
                      title="Nenhum convênio"
                      description='Clique em "Novo convênio" para criar a primeira página.'
                    />
                  </TableCell>
                </TableRow>
              )}

              {list.map(c => (
                <TableRow key={c.id} className={STICKY_ACTIONS_ROW}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white">
                        {c.logoUrl
                          ? <img src={c.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                          : <HeartHandshake className="size-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.title}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">/convenios/{c.slug}</TableCell>
                  <TableCell className="hidden lg:table-cell tabular-nums text-muted-foreground">{c.priceRows.length}</TableCell>
                  <TableCell className="hidden sm:table-cell tabular-nums text-muted-foreground">{c.order}</TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? 'default' : 'secondary'}>{c.isActive ? 'Ativo' : 'Inativo'}</Badge>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell tabular-nums text-muted-foreground">
                    {formatDateFromString(c.updatedAt)}
                  </TableCell>
                  <TableCell className={`text-right ${STICKY_ACTIONS_CELL}`}>
                    <div className="flex items-center justify-end gap-1">
                      {c.isActive && (
                        <Button size="sm" variant="ghost" className="h-8 px-2" asChild>
                          <a href={`/convenios/${c.slug}`} target="_blank" rel="noreferrer" aria-label="Ver página" title="Ver página no site">
                            <ExternalLink className="size-4" />
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-8 px-2" asChild>
                        <Link to="/admin/convenios/$id" params={{ id: c.id }} aria-label="Editar" title="Editar">
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                      {can('DELETE_CONVENIO') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(c)}
                          aria-label="Excluir"
                          title="Excluir"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Excluir convênio"
        description={
          <>
            Excluir <strong>{deleteTarget?.name}</strong>? A página sai do site e do menu, e o conteúdo não pode
            ser recuperado. Para só esconder, edite e desmarque "Ativo".
          </>
        }
        onConfirm={handleDelete}
        pending={deleteM.isPending}
      />
    </div>
  )
}
