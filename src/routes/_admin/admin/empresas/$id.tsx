import { useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowLeft, Building2, Download, Handshake, Loader2, TreePine, Trash2, Users } from 'lucide-react'
import { requirePermission } from '@/lib/auth-guard'
import { apiErrorMessage } from '@/lib/api-error-message'
import { downloadExport, type ExportDataset, type ExportParams } from '@/lib/export'
import { usePermissions } from '@/hooks/usePermissions'
import {
  useAdminCompany, useUpdateCompany, useDeleteCompany, useAddCompanyProperty, useRemoveCompanyProperty, useUpdateCompanyProperty,
  COMPANY_TYPE_LABEL, companyDisplayName,
} from '@/hooks/useCompanies'
import { CompanyForm } from '@/components/cadastro/CompanyForm'
import { CompanyMembersPanel } from '@/components/cadastro/CompanyMembersPanel'
import { PropertiesManager } from '@/components/cadastro/PropertiesManager'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'
import { PageContainer } from '@/components/PageHeader'
import { errorStatus } from '@/lib/query-retry'
import { Tabs, TabsList, TabsTrigger, TabsContent, tabsWrapClass } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { maskCNPJ } from '@/utils/masks'

export const Route = createFileRoute('/_admin/admin/empresas/$id')({
  beforeLoad: () => requirePermission('READ_USER'),
  component: EmpresaPage,
})

function Count({ n }: { n: number }) {
  return n > 0 ? <span className="text-xs tabular-nums text-faint-foreground">{n}</span> : null
}

function EmpresaPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const { data: company, isLoading, isError, error, isFetching, refetch } = useAdminCompany(id)
  const updateM = useUpdateCompany(id)
  const deleteM = useDeleteCompany()
  const addProp = useAddCompanyProperty(id)
  const removeProp = useRemoveCompanyProperty(id)
  const updateProperty = useUpdateCompanyProperty(id)
  const [tab, setTab] = useState('dados')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exporting, setExporting] = useState(false)
  const readOnly = !can('UPDATE_USER')
  // allowLeave do formulário de dados: excluir a empresa sai sem o aviso de não salvo.
  const allowLeaveRef = useRef<(() => void) | null>(null)

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-10 w-96 max-w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </PageContainer>
    )
  }
  if (isError || !company) {
    return (
      <PageContainer>
        {isError && errorStatus(error) !== 404 ? (
          <LoadErrorRetry
            className="rounded-xl border border-border bg-card"
            message="Não foi possível carregar a empresa."
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : (
          <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">Empresa não encontrada.</p>
        )}
        <Button asChild variant="outline" className="self-start">
          <Link to="/admin/usuarios" search={{ tab: 'empresas' }}><ArrowLeft /> Voltar para empresas</Link>
        </Button>
      </PageContainer>
    )
  }

  async function handleDelete() {
    try {
      await deleteM.mutateAsync(id)
      toast.success('Empresa excluída.')
      allowLeaveRef.current?.()
      navigate({ to: '/admin/usuarios', search: { tab: 'empresas' } })
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao excluir empresa.'))
    }
  }

  async function handleExport(dataset: ExportDataset, params: ExportParams) {
    setExporting(true)
    try {
      await downloadExport(dataset, params)
      toast.success('Planilha baixada.')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao exportar.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <PageContainer>
      {/* Cabeçalho como o PageHeader, com o "voltar" em cima e o selo de parceira ao lado do CNPJ. */}
      <div className="flex flex-col gap-1">
        <Link to="/admin/usuarios" search={{ tab: 'empresas' }} className="-ml-0.5 inline-flex min-h-9 w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Empresas
        </Link>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl leading-8 font-semibold break-words text-foreground">
            {companyDisplayName(company)}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {company.tradeName && <span className="break-words">{company.name} ·</span>}
            <span className="tabular-nums">{company.cnpj ? `CNPJ ${maskCNPJ(company.cnpj)}` : 'Sem CNPJ'}</span>
            <Badge variant={company.type === 'PUBLIC' ? 'neutral' : 'outline'}>{COMPANY_TYPE_LABEL[company.type]}</Badge>
            {company.isPartner && (
              <Link to="/admin/configuracoes" search={{ tab: 'parceiros' }} title="Logo, link e ordem em Configurações do site › Parceiros">
                <Badge variant="outline" className="hover:bg-muted"><Handshake /> Parceira na home</Badge>
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exporting}>
                {exporting ? <Loader2 className="animate-spin" /> : <Download />} Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Planilha CSV (abre no Excel)</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => handleExport('companies', { ids: [id] })}>Dados da empresa</DropdownMenuItem>
              <DropdownMenuItem disabled={company.properties.length === 0} onSelect={() => handleExport('properties', { ownerIds: [id] })}>
                Propriedades ({company.properties.length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {can('DELETE_USER') && (
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Excluir
            </Button>
          )}
        </div>
        </header>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className={tabsWrapClass}>
          <TabsTrigger value="dados"><Building2 /> Dados</TabsTrigger>
          <TabsTrigger value="pessoas"><Users /> Pessoas <Count n={company.members.length} /></TabsTrigger>
          <TabsTrigger value="enderecos"><TreePine /> Propriedades <Count n={company.properties.length} /></TabsTrigger>
        </TabsList>

        {/* Fica montada (só escondida) para não perder edições ao trocar de aba */}
        <TabsContent value="dados" forceMount className="data-[state=inactive]:hidden">
          <CompanyForm
            key={company.updatedAt}
            company={company}
            readOnly={readOnly}
            saving={updateM.isPending}
            allowLeaveRef={allowLeaveRef}
            onSubmit={async input => {
              try {
                await updateM.mutateAsync(input)
                toast.success('Dados da empresa salvos.')
                return true
              } catch (e) {
                toast.error(apiErrorMessage(e, 'Erro ao salvar empresa.'))
                return false
              }
            }}
          />
        </TabsContent>

        <TabsContent value="pessoas">
          <CompanyMembersPanel companyId={id} members={company.members} readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="enderecos">
          <PropertiesManager
            properties={company.properties}
            total={company.properties.length}
            loading={false}
            primaryId={company.primaryPropertyId}
            readOnly={readOnly}
            nameLabel="Nome (ex.: SEDE, FILIAL, ARMAZEM) *"
            onCreate={body => addProp.mutateAsync(body)}
            creating={addProp.isPending}
            onUpdate={(propertyId, body) => updateProperty.mutateAsync({ propertyId, ...body })}
            updating={updateProperty.isPending}
            onDelete={propertyId => removeProp.mutateAsync(propertyId)}
            deleting={removeProp.isPending}
            onSetPrimary={propertyId => updateM.mutateAsync({ primaryPropertyId: propertyId })}
            settingPrimary={updateM.isPending}
          />
        </TabsContent>

      </Tabs>

      <DeleteConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir empresa"
        description={<>
          Excluir <strong>{companyDisplayName(company)}</strong>? A empresa some da lista e, se for parceira, da página inicial.
          As pessoas vinculadas não são apagadas.
        </>}
        onConfirm={handleDelete}
        pending={deleteM.isPending}
      />
    </PageContainer>
  )
}
