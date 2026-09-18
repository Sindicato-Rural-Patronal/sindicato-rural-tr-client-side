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
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  return n > 0 ? <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px]">{n}</span> : null
}

function EmpresaPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const { data: company, isLoading, isError } = useAdminCompany(id)
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
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }
  if (isError || !company) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <LoadErrorBanner message="Empresa não encontrada ou erro ao carregar." />
        <Button asChild variant="outline" className="self-start">
          <Link to="/admin/usuarios" search={{ tab: 'empresas' }}><ArrowLeft className="size-4" /> Voltar para empresas</Link>
        </Button>
      </div>
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
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link to="/admin/usuarios" search={{ tab: 'empresas' }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Empresas
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Building2 className="size-6 shrink-0 text-muted-foreground" />
            <span className="truncate">{companyDisplayName(company)}</span>
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {company.tradeName && <span className="truncate">{company.name} ·</span>}
            <span>{company.cnpj ? `CNPJ ${maskCNPJ(company.cnpj)}` : 'Sem CNPJ'}</span>
            <Badge variant={company.type === 'PUBLIC' ? 'secondary' : 'outline'}>{COMPANY_TYPE_LABEL[company.type]}</Badge>
            {company.isPartner && (
              <Link to="/admin/configuracoes" search={{ tab: 'parceiros' }} title="Logo, link e ordem em Configurações do site › Parceiros">
                <Badge variant="outline" className="gap-1 hover:bg-muted"><Handshake className="size-3" /> Parceira na home</Badge>
              </Link>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting}>
                {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} Exportar
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
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5" /> Excluir
            </Button>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="dados"><Building2 className="mr-1.5 size-3.5" /> Dados</TabsTrigger>
          <TabsTrigger value="pessoas"><Users className="mr-1.5 size-3.5" /> Pessoas <Count n={company.members.length} /></TabsTrigger>
          <TabsTrigger value="enderecos"><TreePine className="mr-1.5 size-3.5" /> Propriedades <Count n={company.properties.length} /></TabsTrigger>
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
    </div>
  )
}
