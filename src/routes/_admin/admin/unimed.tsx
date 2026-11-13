import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  HeartPulse, Plus, Pencil, Trash2, Search, Receipt, ScrollText, FileSignature, Download,
} from 'lucide-react'
import { requirePermission } from '@/lib/auth-guard'
import { apiErrorMessage } from '@/lib/api-error-message'
import { downloadExport } from '@/lib/export'
import {
  baixarFichaUnimed, baixarTermoUnimed, baixarContratoUnimed, ERRO_DO_DOCUMENTO_UNIMED, type DocumentoUnimed,
} from '@/lib/unimed-docs'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { maskCPF } from '@/utils/masks'
import { STICKY_ACTIONS_CELL, STICKY_ACTIONS_ROW } from '@/lib/table-sticky-actions'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useRowSelection } from '@/hooks/useRowSelection'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePermissions } from '@/hooks/usePermissions'
import { useUnimedList, useDeleteUnimed, type UnimedRow } from '@/hooks/useUnimed'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { FilterBar } from '@/components/FilterBar'
import { RowActions, type RowAction } from '@/components/RowActions'

export const Route = createFileRoute('/_admin/admin/unimed')({
  beforeLoad: () => requirePermission('READ_USER'),
  component: RouteComponent,
})

// Documentos do beneficiário, na ordem em que aparecem no menu de ações.
type DocKind = DocumentoUnimed
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
  const isMobile = useIsMobile()
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
      toast.error(apiErrorMessage(e, ERRO_DO_DOCUMENTO_UNIMED[doc.kind]))
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

  // Editar e a Ficha à vista (os mais usados); os outros documentos, a planilha e o
  // Excluir no "Mais", com os nomes escritos.
  function actionsOf(r: UnimedRow): RowAction[] {
    const [ficha, ...outros] = UNIMED_DOCS
    const doc = (d: UnimedDoc): RowAction => ({
      key: d.kind,
      label: d.label,
      icon: d.icon,
      onClick: () => void gerarDoc(r, d),
      busy: docBusy?.id === r.id && docBusy.kind === d.kind,
      disabled: docBusy !== null,
    })
    return [
      { label: 'Editar', icon: Pencil, onClick: () => openEdit(r.id) },
      doc(ficha),
      ...outros.map(doc),
      { label: 'Exportar planilha', icon: Download, onClick: () => void exportarLinha(r), busy: exportBusyId === r.id },
      { label: 'Excluir', icon: Trash2, onClick: () => setDeleteTarget(r), destructive: true },
    ]
  }

  return (
    <PageContainer>
      <PageHeader
        title="Unimed — Beneficiários"
        description="Beneficiários do plano de saúde vinculados aos usuários cadastrados"
        help={<AjudaLink topico="unimed" titulo="Unimed — Beneficiários" />}
        actions={(
          <Button onClick={openNew}>
            <Plus className="size-4" /> Novo beneficiário
          </Button>
        )}
      />

      <FilterBar
        actions={<>
          <SelectionInfo count={selection.count} onClear={selection.clear} />
          <BulkDeleteButton
            ids={selection.ids}
            singular="beneficiário"
            plural="beneficiários"
            allowed={can('DELETE_USER')}
            onDelete={id => deleteM.mutateAsync(id)}
            onDone={() => selection.clear()}
          />
          <ExportMenu
            dataset="unimed"
            filters={{ search }}
            selectedIds={selection.ids}
            total={data?.total}
            filtered={!!search}
          />
        </>}
      >
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Buscar por nome ou CPF..."
            aria-label="Buscar por nome ou CPF"
            className="pl-9"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
      </FilterBar>

      {isError && !data && (
        <LoadErrorRetry
          className="rounded-xl border border-border bg-card"
          message="Não foi possível carregar os beneficiários."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
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
                <TableHead className={`w-[120px] text-right ${STICKY_ACTIONS_CELL}`}>Ações</TableHead>
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
                  <TableCell colSpan={8} className="p-0 whitespace-normal">
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
                  <TableCell className="hidden lg:table-cell num text-muted-foreground">
                    {r.dataAdesao ? formatDateFromString(r.dataAdesao) : '—'}
                  </TableCell>
                  <TableCell className={`text-right ${STICKY_ACTIONS_CELL}`}>
                    {/* Editar e Ficha à vista; o resto no "Mais", com os rótulos escritos
                        (os ícones sozinhos só se explicariam no hover, que o celular não tem). */}
                    <RowActions label={`Ações de ${r.userData.name}`} actions={actionsOf(r)} visible={isMobile ? 1 : 2} />
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
    </PageContainer>
  )
}
