import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { requirePermission } from '@/lib/auth-guard'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useCreateCompany } from '@/hooks/useCompanies'
import { CompanyForm } from '@/components/cadastro/CompanyForm'
import { AjudaLink } from '@/components/ajuda/AjudaLink'
import { PageContainer, PageHeader } from '@/components/PageHeader'

export const Route = createFileRoute('/_admin/admin/empresas/novo')({
  beforeLoad: () => requirePermission('CREATE_USER'),
  component: NovaEmpresaPage,
})

function NovaEmpresaPage() {
  const navigate = useNavigate()
  const createM = useCreateCompany()

  return (
    <PageContainer>
      <div className="flex flex-col gap-1">
        <Link to="/admin/usuarios" search={{ tab: 'empresas' }} className="-ml-0.5 inline-flex min-h-9 w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Empresas
        </Link>
        <PageHeader
          title="Nova empresa"
          description="Depois de criar, vincule as pessoas e adicione outros endereços"
          help={<AjudaLink topico="empresas" titulo="Nova empresa" />}
        />
      </div>

      <CompanyForm
        saving={createM.isPending}
        submitLabel="Criar empresa"
        onSubmit={async (input, allowLeave) => {
          try {
            const created = await createM.mutateAsync(input)
            toast.success('Empresa criada.')
            // Já salvou: sai sem o aviso de alterações não salvas.
            allowLeave()
            navigate({ to: '/admin/empresas/$id', params: { id: created.id }, replace: true })
            return true
          } catch (e) {
            toast.error(apiErrorMessage(e, 'Erro ao criar empresa.'))
            return false
          }
        }}
      />
    </PageContainer>
  )
}
