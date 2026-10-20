import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  HeartPulse, Plus, Pencil, Trash2, Search, Receipt, ScrollText, FileSignature, Loader2, Download, MoreHorizontal,
} from 'lucide-react'
import { requirePermission } from '@/lib/auth-guard'
import { apiErrorMessage } from '@/lib/api-error-message'
import { downloadExport } from '@/lib/export'
import { baixarFichaUnimed, baixarTermoUnimed, baixarContratoUnimed } from '@/lib/unimed-docs'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { maskCPF } from '@/utils/masks'
import { STICKY_ACTIONS_CELL, STICKY_ACTIONS_ROW } from '@/lib/table-sticky-actions'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useRowSelection } from '@/hooks/useRowSelection'
import { usePermissions } from '@/hooks/usePermissions'
import { useUnimedList, useDeleteUnimed, type UnimedRow } from '@/hooks/useUnimed'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { EmptyState } from '@/components/EmptyState'
import { ExportMenu, SelectCheckbox, SelectionInfo } from '@/components/export/ExportMenu'
import { Pagination } from '@/components/ui/pagination'
import { AjudaLink } from '@/components/ajuda/AjudaLink'
import { BulkDeleteButton } from '@/components/export/BulkDeleteButton'
import { UnimedFormDialog } from '@/components/unimed/UnimedFormDialog'

export const Route = createFileRoute('/_admin/admin/unimed')({
  beforeLoad: () => requirePermission('READ_USER'),
  component: RouteComponent,
})

// Documentos do beneficiário, na ordem em que aparecem no menu de ações.
type DocKind = 'ficha' | 'termo' | 'contrato'
type UnimedDoc = {
  kind: DocKind
  label: string
  icon: typeof Receipt
  run: (id: string) => Promise<void>
}
const UNIMED_DOCS: UnimedDoc[] = [
  { kind: 'ficha', label: 'Gerar Ficha', icon: Receipt, run: baixarFichaUnimed },
  { kind: 'termo', label: 'Gerar Termo de adesão', icon: ScrollText, run: baixarTermoUnimed },
  { kind: 'contrato', label: 'Gerar Contrato (Ciência e Consentimento)', icon: FileSignature, run: baixarContratoUnimed },
]

// ── Tela ──────────────────────────────────────────────────────────────────────
function RouteComponent() {
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300).trim()
  const [page, setPage] = useState(1)
  // Busca nova (já com debounce) volta para a página 1 — ajuste no render, sem efeito.
  const [pageSearch, setPageSearch] = useState(search)
  if (pageSearch !== search) {
    setPageSearch(search)
    setPage(1)
  }

  const { data, isLoading, isError, isFetching, refetch } = useUnimedList({ page, limit: 20, search })
  const deleteM = useDeleteUnimed()
  const { can } = usePermissions()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UnimedRow | null>(null)
  const [docBusy, setDocBusy] = useState<{ id: string; kind: DocKind } | null>(null)
  const [exportBusyId, setExportBusyId] = useState<string | null>(null)
  const selection = useRowSelection()

  const rows = data?.data ?? []
  const pageIds = rows.map(r => r.id)
  const pageState = selection.pageState(pageIds)
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  function openNew() { setEditId(null); setDialogOpen(true) }
  function openEdit(id: string) { setEditId(id); setDialogOpen(true) }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteM.mutateAsync(deleteTarget.id)
      selection.remove(deleteTarget.id)
      toast.success('Beneficiário removido.')
      setDeleteTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover o beneficiário.'))
    }
  }

  // Os três documentos (Ficha, Termo e Contrato) são cópia do modelo antigo e
  // dependem da ficha completa da pessoa — o download vive em lib/unimed-docs.
  async function gerarDoc(row: UnimedRow, doc: UnimedDoc) {
    setDocBusy({ id: row.id, kind: doc.kind })
    try {
      await doc.run(row.id)
    } catch (e) {
      toast.error(apiErrorMessage(e, `Erro ao gerar o documento (${doc.label}).`))
    } finally {
      setDocBusy(null)
    }
  }

  async function exportarLinha(row: UnimedRow) {
    setExportBusyId(row.id)
    try {
      await downloadExport('unimed', { ids: [row.id] })
      toast.success('Planilha baixada.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao exportar o beneficiário.'))
    } finally {
      setExportBusyId(null)
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Unimed — Beneficiários</h1>
            <AjudaLink topico="unimed" titulo="Unimed — Beneficiários" />
          </div>
          <p className="text-sm text-muted-foreground">
            Beneficiários do plano de saúde vinculados aos usuários cadastrados.
          </p>
        </div>
        <Button onClick={openNew} className="shrink-0">
          <Plus className="size-4" /> Novo beneficiário
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            className="pl-9"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <SelectionInfo count={selection.count} onClear={selection.clear} />
          <BulkDeleteButton
            ids={selection.ids}
            singular="beneficiário"
            plural="beneficiários"
            allowed={can('DELETE_USER')}
            onDelete={id => deleteM.mutateAsync(id)}
            onDone={() => selection.clear()}
            className="h-9"
          />
          <ExportMenu
            dataset="unimed"
            filters={{ search }}
            selectedIds={selection.ids}
            total={data?.total}
            filtered={!!search}
          />
        </div>
      </div>

      {isError && !data && (
        <LoadErrorRetry
          className="rounded-lg border border-border bg-card"
          message="Não foi possível carregar os beneficiários."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Com a sidebar ocupando ~256px, as 8 colunas só cabem em telas
                    bem largas — as menos essenciais somem por breakpoint. E, se
                    ainda assim sobrar conteúdo (nomes longos em telas estreitas),
                    a coluna de Ações fica presa à direita (STICKY_ACTIONS_CELL) para
                    nunca sair da área visível. */}
                <TableHead className="w-10">
                  <SelectCheckbox
                    checked={pageState === 'all'}
                    indeterminate={pageState === 'some'}
                    onChange={() => selection.togglePage(pageIds)}
                    label="Selecionar todos desta página"
                  />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">CPF</TableHead>
                <TableHead className="hidden 2xl:table-cell">Plano</TableHead>
                <TableHead className="hidden xl:table-cell">Matrícula</TableHead>
                <TableHead className="hidden xl:table-cell">Tipo dependente</TableHead>
                <TableHead className="hidden lg:table-cell">Data adesão</TableHead>
                <TableHead className={`text-right ${STICKY_ACTIONS_CELL}`}>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="size-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="hidden 2xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className={STICKY_ACTIONS_CELL}><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && !isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState
                      icon={HeartPulse}
                      title="Nenhum beneficiário"
                      description={search ? 'Nada encontrado com essa busca.' : 'Clique em "Novo beneficiário" para cadastrar.'}
                    />
                  </TableCell>
                </TableRow>
              )}
              {rows.map(r => (
                <TableRow key={r.id} className={STICKY_ACTIONS_ROW}>
                  <TableCell className="w-10">
                    <SelectCheckbox checked={selection.isSelected(r.id)} onChange={() => selection.toggle(r.id)} label={`Selecionar ${r.userData.name}`} />
                  </TableCell>
                  <TableCell className="max-w-[10rem] font-medium text-foreground sm:max-w-[22rem]"><span className="block truncate" title={r.userData.name}>{r.userData.name}</span></TableCell>
                  <TableCell className="hidden sm:table-cell tabular-nums text-muted-foreground">{r.userData.cpf ? maskCPF(r.userData.cpf) : '—'}</TableCell>
                  <TableCell className="hidden 2xl:table-cell text-muted-foreground">{r.plano ?? '—'}</TableCell>
                  <TableCell className="hidden xl:table-cell tabular-nums text-muted-foreground">{r.matricula ?? '—'}</TableCell>
                  <TableCell className="hidden xl:table-cell text-muted-foreground">{r.tipoDependente ?? '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell tabular-nums text-muted-foreground">
                    {r.dataAdesao ? formatDateFromString(r.dataAdesao) : '—'}
                  </TableCell>
                  <TableCell className={`text-right ${STICKY_ACTIONS_CELL}`}>
                    {/* Menu com rótulos escritos: os ícones sozinhos só se explicavam
                        no hover, que não existe no celular/tablet. */}
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 gap-1 px-2">
                          {docBusy?.id === r.id || exportBusyId === r.id
                            ? <Loader2 className="size-4 animate-spin" />
                            : <MoreHorizontal className="size-4" />}
                          Ações
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        {UNIMED_DOCS.map(doc => (
                          <DropdownMenuItem
                            key={doc.kind}
                            onSelect={() => gerarDoc(r, doc)}
                            disabled={docBusy !== null}
                          >
                            {docBusy?.id === r.id && docBusy.kind === doc.kind
                              ? <Loader2 className="size-4 animate-spin" />
                              : <doc.icon className="size-4" />}
                            {doc.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => exportarLinha(r)} disabled={exportBusyId === r.id}>
                          {exportBusyId === r.id
                            ? <Loader2 className="size-4 animate-spin" />
                            : <Download className="size-4" />}
                          Exportar planilha
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openEdit(r.id)}>
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(r)}>
                          <Trash2 className="size-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {total > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={20}
          onPageChange={setPage}
          showLimitSelector={false}
        />
      )}

      <UnimedFormDialog
        open={dialogOpen}
        editId={editId}
        onClose={() => { setDialogOpen(false); setEditId(null) }}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => { if (!o) setDeleteTarget(null) }}
        title="Excluir beneficiário"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir o beneficiário "${deleteTarget.userData.name}"? Esta ação não pode ser desfeita.`
            : ''
        }
        onConfirm={handleDelete}
        pending={deleteM.isPending}
      />
    </div>
  )
}
