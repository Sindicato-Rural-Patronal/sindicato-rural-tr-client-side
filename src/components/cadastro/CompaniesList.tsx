import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Building2, Download, Eye, Handshake, Loader2, Search, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { NativeSelect } from '@/components/ui/native-select'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/EmptyState'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { ExportMenu, SelectCheckbox, SelectionInfo } from '@/components/export/ExportMenu'
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
  const { data, isLoading, isError } = useAdminCompanies({
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar empresas"
            placeholder="Buscar por razão social, nome fantasia, e-mail ou CNPJ..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <NativeSelect aria-label="Filtrar por tipo" className="h-9 py-1.5 sm:w-40" value={type} onChange={e => setType(e.target.value as '' | CompanyType)}>
          <option value="">Todos os tipos</option>
          <option value="PRIVATE">{COMPANY_TYPE_LABEL.PRIVATE}</option>
          <option value="PUBLIC">{COMPANY_TYPE_LABEL.PUBLIC}</option>
        </NativeSelect>
        <NativeSelect aria-label="Filtrar por parceria" className="h-9 py-1.5 sm:w-44" value={partner} onChange={e => setPartner(e.target.value as '' | 'true' | 'false')}>
          <option value="">Parceiras e não parceiras</option>
          <option value="true">Só parceiras</option>
          <option value="false">Só não parceiras</option>
        </NativeSelect>
        <div className="flex items-center justify-end gap-2">
          <SelectionInfo count={selection.count} onClear={selection.clear} />
          <ExportMenu
            dataset="companies"
            className="h-9"
            filters={{ search, type, isPartner }}
            selectedIds={selection.ids}
            total={data?.total}
            filtered={filtering}
            extra={[{ label: 'Propriedades das selecionadas', dataset: 'properties', params: { ownerIds: selection.ids }, disabled: selection.count === 0 }]}
          />
        </div>
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar empresas." />}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
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
                <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                <TableHead className="hidden xl:table-cell">Telefone</TableHead>
                <TableHead className="hidden sm:table-cell">Pessoas</TableHead>
                <TableHead className={`w-32 text-right ${STICKY_ACTIONS_CELL}`}>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="size-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell className={STICKY_ACTIONS_CELL}><Skeleton className="ml-auto h-7 w-14" /></TableCell>
                </TableRow>
              ))}

              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={Building2}
                      title={filtering ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
                      description={filtering ? 'Ajuste a busca ou os filtros.' : 'Clique em "Nova empresa" para cadastrar.'}
                    />
                  </TableCell>
                </TableRow>
              )}

              {rows.map(c => (
                <TableRow key={c.id} className={STICKY_ACTIONS_ROW}>
                  <TableCell className="w-10">
                    <SelectCheckbox checked={selection.isSelected(c.id)} onChange={() => selection.toggle(c.id)} label={`Selecionar ${companyDisplayName(c)}`} />
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <Link to="/admin/empresas/$id" params={{ id: c.id }} className="truncate font-medium text-foreground hover:underline">
                        {companyDisplayName(c)}
                      </Link>
                      {c.isPartner && (
                        <Badge variant="outline" className="shrink-0 gap-1 text-[10px]"><Handshake className="size-3" /> Parceira</Badge>
                      )}
                    </div>
                    {(c.tradeName || c.email || c.address?.city) && (
                      <p className="truncate text-xs text-muted-foreground">
                        {[c.tradeName ? c.name : null, c.address?.city, c.email].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell tabular-nums text-muted-foreground">
                    {c.cnpj ? maskCNPJ(c.cnpj) : '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant={c.type === 'PUBLIC' ? 'secondary' : 'outline'}>{COMPANY_TYPE_LABEL[c.type]}</Badge>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell tabular-nums text-muted-foreground">
                    {c.phone ? maskPhone(c.phone) : '—'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell tabular-nums text-muted-foreground">{c.membersCount}</TableCell>
                  <TableCell className={`text-right ${STICKY_ACTIONS_CELL}`}>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-8 px-2" asChild>
                        <Link to="/admin/empresas/$id" params={{ id: c.id }} aria-label={`Abrir ${companyDisplayName(c)}`} title="Abrir empresa">
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => exportOne(c)} disabled={exportingId === c.id}
                        aria-label={`Exportar ${companyDisplayName(c)}`} title="Exportar">
                        {exportingId === c.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                      </Button>
                      {can('DELETE_USER') && (
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(c)} aria-label={`Excluir ${companyDisplayName(c)}`} title="Excluir empresa">
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
