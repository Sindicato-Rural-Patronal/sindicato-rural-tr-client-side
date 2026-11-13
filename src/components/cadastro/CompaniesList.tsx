import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Building2, Download, Eye, Handshake, Search, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { NativeSelect } from '@/components/ui/native-select'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/EmptyState'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { ExportMenu, SelectCheckbox, SelectionInfo } from '@/components/export/ExportMenu'
import { BulkDeleteButton } from '@/components/export/BulkDeleteButton'
import { FilterBar } from '@/components/FilterBar'
import { RowActions, type RowAction } from '@/components/RowActions'
import { usePermissions } from '@/hooks/usePermissions'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useRowSelection } from '@/hooks/useRowSelection'
import {
  useAdminCompanies, useDeleteCompany, COMPANY_TYPE_LABEL, companyDisplayName,
  type CompanyListItem, type CompanyType,
} from '@/hooks/useCompanies'
import { apiErrorMessage } from '@/lib/api-error-message'
import { downloadExport } from '@/lib/export'
import { STICKY_ACTIONS_CELL, STICKY_ACTIONS_ROW } from '@/lib/table-sticky-actions'
import { maskCNPJ, maskPhone } from '@/utils/masks'

const LIMIT = 20

/** Lista de empresas (aba "Empresas" em Usuários). */
export function CompaniesList() {
  const { can } = usePermissions()
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300).trim()
  const [type, setType] = useState<'' | CompanyType>('')
  const [partner, setPartner] = useState<'' | 'true' | 'false'>('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<CompanyListItem | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const selection = useRowSelection()

  // eslint-disable-next-line react-hooks/set-state-in-effect -- volta pra página 1 ao filtrar
  useEffect(() => { setPage(1) }, [search, type, partner])

  const isPartner = partner === '' ? undefined : partner === 'true'
  const { data, isLoading, isError, isFetching, refetch } = useAdminCompanies({
    page, limit: LIMIT, search,
    type: type || undefined,
    isPartner,
  })
  const deleteM = useDeleteCompany()
  const rows = data?.data ?? []
  const pageIds = rows.map(c => c.id)
  const pageState = selection.pageState(pageIds)
  const filtering = !!(search || type || partner)

  async function exportOne(c: CompanyListItem) {
    setExportingId(c.id)
    try {
      await downloadExport('companies', { ids: [c.id] })
      toast.success('Planilha baixada.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao exportar empresa.'))
    } finally {
      setExportingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteM.mutateAsync(deleteTarget.id)
      selection.remove(deleteTarget.id)
      toast.success(`Empresa "${companyDisplayName(deleteTarget)}" excluída.`)
      setDeleteTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao excluir empresa.'))
    }
  }

  function actionsOf(c: CompanyListItem): RowAction[] {
    return [
      { label: 'Abrir empresa', icon: Eye, onClick: () => void navigate({ to: '/admin/empresas/$id', params: { id: c.id } }) },
      { label: 'Exportar', icon: Download, onClick: () => void exportOne(c), busy: exportingId === c.id },
      { label: 'Excluir empresa', icon: Trash2, onClick: () => setDeleteTarget(c), destructive: true, hidden: !can('DELETE_USER') },
    ]
  }

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        actions={<>
          <SelectionInfo count={selection.count} onClear={selection.clear} />
          <BulkDeleteButton
            ids={selection.ids}
            singular="empresa"
            plural="empresas"
            allowed={can('DELETE_USER')}
            onDelete={id => deleteM.mutateAsync(id)}
            onDone={() => selection.clear()}
          />
          <ExportMenu
            dataset="companies"
            filters={{ search, type, isPartner }}
            selectedIds={selection.ids}
            total={data?.total}
            filtered={filtering}
            // O montador diz os filtros como a API diz no PDF: "Tipo: Privada", "Só não parceiras".
            filterTexts={{
              ...(type ? { type: `Tipo: ${COMPANY_TYPE_LABEL[type]}` } : {}),
              ...(isPartner === false ? { isPartner: 'Só não parceiras' } : {}),
            }}
            extra={[{
              label: 'Propriedades das selecionadas', dataset: 'properties', params: { ownerIds: selection.ids },
              disabled: selection.count === 0, builder: true,
            }]}
          />
        </>}
      >
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            aria-label="Buscar empresas"
            placeholder="Buscar por razão social, nome fantasia, e-mail ou CNPJ..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <NativeSelect aria-label="Filtrar por tipo" className="sm:w-40" value={type} onChange={e => setType(e.target.value as '' | CompanyType)}>
          <option value="">Todos os tipos</option>
          <option value="PRIVATE">{COMPANY_TYPE_LABEL.PRIVATE}</option>
          <option value="PUBLIC">{COMPANY_TYPE_LABEL.PUBLIC}</option>
        </NativeSelect>
        <NativeSelect aria-label="Filtrar por parceria" className="sm:w-52" value={partner} onChange={e => setPartner(e.target.value as '' | 'true' | 'false')}>
          <option value="">Parceiras e não parceiras</option>
          <option value="true">Só parceiras</option>
          <option value="false">Só não parceiras</option>
        </NativeSelect>
      </FilterBar>

      {isError && !data && (
        <LoadErrorRetry
          className="rounded-xl border border-border bg-card"
          message="Não foi possível carregar as empresas."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )}

      {/* Celular: um cartão por empresa, com o nome inteiro. */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-3">
            <Skeleton className="mb-2 h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
        {!isLoading && !isError && rows.length === 0 && (
          <EmptyState
            framed
            icon={Building2}
            title={filtering ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
            description={filtering ? 'Ajuste a busca ou os filtros.' : 'Clique em "Nova empresa" para cadastrar.'}
            topico={filtering ? undefined : 'empresas'}
          />
        )}
        {rows.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Empresas">
            {rows.map(c => (
              <li key={c.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                <span className="flex h-5 shrink-0 items-center">
                  <SelectCheckbox checked={selection.isSelected(c.id)} onChange={() => selection.toggle(c.id)} label={`Selecionar ${companyDisplayName(c)}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <Link to="/admin/empresas/$id" params={{ id: c.id }} className="block break-words text-sm font-medium text-foreground hover:underline">
                    {companyDisplayName(c)}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <Badge variant={c.type === 'PUBLIC' ? 'neutral' : 'outline'}>{COMPANY_TYPE_LABEL[c.type]}</Badge>
                    {c.isPartner && <Badge variant="outline"><Handshake /> Parceira</Badge>}
                  </div>
                  {c.cnpj && <p className="mt-1 text-xs tabular-nums text-muted-foreground">CNPJ {maskCNPJ(c.cnpj)}</p>}
                  {(c.tradeName || c.email || c.address?.city) && (
                    <p className="break-words text-xs text-muted-foreground">
                      {[c.tradeName ? c.name : null, c.address?.city, c.email].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <RowActions visible={0} label={`Ações de ${companyDisplayName(c)}`} actions={actionsOf(c)} className="-my-1.5 -mr-1.5" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <SelectCheckbox
                    checked={pageState === 'all'}
                    indeterminate={pageState === 'some'}
                    onChange={() => selection.togglePage(pageIds)}
                    label="Selecionar todos desta página"
                  />
                </TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                <TableHead className="hidden xl:table-cell">Telefone</TableHead>
                <TableHead>Pessoas</TableHead>
                <TableHead className={`w-28 text-right ${STICKY_ACTIONS_CELL}`}>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="size-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell className={STICKY_ACTIONS_CELL}><Skeleton className="ml-auto h-7 w-14" /></TableCell>
                </TableRow>
              ))}

              {!isLoading && !isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="p-0 whitespace-normal">
                    <EmptyState
                      icon={Building2}
                      title={filtering ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
                      description={filtering ? 'Ajuste a busca ou os filtros.' : 'Clique em "Nova empresa" para cadastrar.'}
                      topico={filtering ? undefined : 'empresas'}
                    />
                  </TableCell>
                </TableRow>
              )}

              {rows.map(c => (
                <TableRow key={c.id} className={STICKY_ACTIONS_ROW}>
                  <TableCell className="w-10">
                    <SelectCheckbox checked={selection.isSelected(c.id)} onChange={() => selection.toggle(c.id)} label={`Selecionar ${companyDisplayName(c)}`} />
                  </TableCell>
                  <TableCell className="max-w-[14rem] xl:max-w-[18rem]">
                    <div className="flex min-w-0 items-center gap-2">
                      <Link to="/admin/empresas/$id" params={{ id: c.id }} className="truncate font-medium text-foreground hover:underline">
                        {companyDisplayName(c)}
                      </Link>
                      {c.isPartner && (
                        <Badge variant="outline" className="shrink-0"><Handshake /> Parceira</Badge>
                      )}
                    </div>
                    {(c.tradeName || c.email || c.address?.city) && (
                      <p className="truncate text-xs text-muted-foreground">
                        {[c.tradeName ? c.name : null, c.address?.city, c.email].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {c.cnpj ? maskCNPJ(c.cnpj) : '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant={c.type === 'PUBLIC' ? 'neutral' : 'outline'}>{COMPANY_TYPE_LABEL[c.type]}</Badge>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell tabular-nums text-muted-foreground">
                    {c.phone ? maskPhone(c.phone) : '—'}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{c.membersCount}</TableCell>
                  <TableCell className={`text-right ${STICKY_ACTIONS_CELL}`}>
                    <RowActions label={`Ações de ${companyDisplayName(c)}`} actions={actionsOf(c)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {(data?.total ?? 0) > 0 && (
        <Pagination page={page} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} limit={LIMIT} onPageChange={setPage} showLimitSelector={false} />
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Excluir empresa"
        description={<>
          Excluir <strong>{deleteTarget ? companyDisplayName(deleteTarget) : ''}</strong>? A empresa some da lista e, se for parceira, da página inicial.
          As pessoas vinculadas não são apagadas.
        </>}
        onConfirm={handleDelete}
        pending={deleteM.isPending}
      />
    </div>
  )
}
