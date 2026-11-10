import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
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
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { EmptyState } from '@/components/EmptyState'
import { AjudaLink } from '@/components/ajuda/AjudaLink'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { RowActions } from '@/components/RowActions'

export const Route = createFileRoute('/_admin/admin/convenios/')({
  beforeLoad: () => requirePermission('READ_CONVENIO'),
  component: ConveniosAdminPage,
})

function ConveniosAdminPage() {
  const { can } = usePermissions()
  const navigate = useNavigate()
  const { data, isLoading, isError, isFetching, refetch } = useAdminConvenios()
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
    <PageContainer>
      <PageHeader
        title="Convênios"
        description='Páginas públicas do menu "Convênios" do site: tabela de valores, documentos e informações'
        help={<AjudaLink topico="convenios" titulo="Convênios" />}
        actions={can('CREATE_CONVENIO') && (
          <Button asChild>
            <Link to="/admin/convenios/novo"><Plus className="size-4" /> Novo convênio</Link>
          </Button>
        )}
      />

      {isError && !data && (
        <LoadErrorRetry
          className="rounded-xl border border-border bg-card"
          message="Não foi possível carregar os convênios."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Convênio</TableHead>
                <TableHead className="hidden md:table-cell">Endereço no site</TableHead>
                <TableHead className="hidden lg:table-cell">Faixas de preço</TableHead>
                <TableHead className="hidden sm:table-cell">Ordem</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden xl:table-cell">Atualizado em</TableHead>
                <TableHead className={`w-28 text-right ${STICKY_ACTIONS_CELL}`}>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-14" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className={STICKY_ACTIONS_CELL}><Skeleton className="h-7 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))}

              {!isLoading && !isError && list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="p-0 whitespace-normal">
                    <EmptyState
                      icon={HeartHandshake}
                      title="Nenhum convênio"
                      description='Clique em "Novo convênio" para criar a primeira página.'
                      topico="convenios"
                    />
                  </TableCell>
                </TableRow>
              )}

              {list.map(c => (
                <TableRow key={c.id} className={STICKY_ACTIONS_ROW}>
                  <TableCell className="max-w-[10rem] sm:max-w-[22rem]">
                    <div className="flex items-center gap-3">
                      {/* Fundo branco de propósito: o logo do convênio é pensado para fundo claro (no tema escuro sumiria). */}
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white">
                        {c.logoUrl
                          ? <img src={c.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                          : <HeartHandshake className="size-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.title}</p>
                        {/* No celular a situação sai da coluna e vem para baixo do nome (as três ações precisam de espaço). */}
                        <Badge variant={c.isActive ? 'success' : 'neutral'} className="mt-1 sm:hidden">{c.isActive ? 'Ativo' : 'Inativo'}</Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">/convenios/{c.slug}</TableCell>
                  <TableCell className="hidden lg:table-cell tabular-nums text-muted-foreground">{c.priceRows.length}</TableCell>
                  <TableCell className="hidden sm:table-cell tabular-nums text-muted-foreground">{c.order}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'Ativo' : 'Inativo'}</Badge>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell num text-muted-foreground">
                    {formatDateFromString(c.updatedAt)}
                  </TableCell>
                  <TableCell className={`text-right ${STICKY_ACTIONS_CELL}`}>
                    <RowActions
                      label={`Ações do convênio ${c.name}`}
                      actions={[
                        { label: 'Editar', icon: Pencil, onClick: () => void navigate({ to: '/admin/convenios/$id', params: { id: c.id } }) },
                        // A página pública abre em outra aba, como o link de antes.
                        { label: 'Ver página no site', icon: ExternalLink, onClick: () => window.open(`/convenios/${c.slug}`, '_blank', 'noreferrer'), hidden: !c.isActive },
                        { label: 'Excluir', icon: Trash2, onClick: () => setDeleteTarget(c), destructive: true, hidden: !can('DELETE_CONVENIO') },
                      ]}
                    />
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
    </PageContainer>
  )
}
