import { createFileRoute } from '@tanstack/react-router'
import { Building, DoorOpen, Globe, Handshake, Images, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/hooks/usePermissions'
import { NoPermission } from '@/components/NoPermission'
import { PageContainer, PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger, tabsWrapClass } from '@/components/ui/tabs'
import { OrgInfoPanel } from '@/components/site-config/OrgInfoPanel'
import { SocialLinksPanel } from '@/components/site-config/SocialLinksPanel'
import { GalleriesPanel } from '@/components/site-config/GalleriesPanel'
import { PartnersPanel } from '@/components/site-config/PartnersPanel'
import { PublicContactsPanel } from '@/components/site-config/PublicContactsPanel'
import { RoomsPanel } from '@/components/site-config/RoomsPanel'
import { AjudaLink } from '@/components/ajuda/AjudaLink'

const TABS = ['dados', 'redes', 'galerias', 'parceiros', 'contatos', 'salas'] as const
type Tab = (typeof TABS)[number]

export const Route = createFileRoute('/_admin/admin/configuracoes')({
  // Aba na URL: links diretos (ex.: da empresa para Parceiros) e voltar/atualizar.
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => ({
    tab: TABS.includes(s.tab as Tab) ? (s.tab as Tab) : undefined,
  }),
  component: ConfiguracoesPage,
})

// Ajustes do sistema: o que aparece no site público e as salas onde acontecem
// cursos, eventos e reuniões. Cada aba segue a permissão da área de origem:
// conteúdo do site (banners), empresas/pessoas (usuários) e salas (cursos).
function ConfiguracoesPage() {
  const { t } = useTranslation()
  const { can, isLoading } = usePermissions()
  const navigate = Route.useNavigate()
  const { tab } = Route.useSearch()

  const available: Record<Tab, boolean> = {
    dados: can('READ_BANNER'),
    redes: can('READ_BANNER'),
    galerias: can('READ_BANNER'),
    parceiros: can('READ_USER'),
    contatos: can('READ_USER'),
    salas: can('READ_COURSE'),
  }
  const visible = TABS.filter(k => available[k])
  const current = tab && available[tab] ? tab : visible[0]

  if (isLoading) {
    return <PageContainer><Skeleton className="h-8 w-72" /><Skeleton className="h-64 w-full" /></PageContainer>
  }
  if (!current) return <NoPermission message={t('admin.settings.noPermission')} />

  return (
    <PageContainer>
      <PageHeader
        title={t('admin.settings.title')}
        description={t('admin.settings.subtitle')}
        help={<AjudaLink topico="configuracoes" titulo="Configurações do site" />}
      />

      <Tabs value={current} onValueChange={v => navigate({ search: { tab: v as Tab }, replace: true })}>
        <TabsList className={tabsWrapClass}>
          {available.dados && <TabsTrigger value="dados"><Building /> Dados do sindicato</TabsTrigger>}
          {available.redes && <TabsTrigger value="redes"><Globe /> Redes sociais</TabsTrigger>}
          {available.galerias && <TabsTrigger value="galerias"><Images /> Galerias</TabsTrigger>}
          {available.parceiros && <TabsTrigger value="parceiros"><Handshake /> Parceiros</TabsTrigger>}
          {available.contatos && <TabsTrigger value="contatos"><Users /> Contatos públicos</TabsTrigger>}
          {available.salas && <TabsTrigger value="salas"><DoorOpen /> Salas</TabsTrigger>}
        </TabsList>

        {/* Abas com formulário ficam montadas (só escondidas) para não perder o que foi digitado ao trocar de aba */}
        {available.dados && (
          <TabsContent value="dados" forceMount className="data-[state=inactive]:hidden">
            <OrgInfoPanel canEdit={can('UPDATE_BANNER')} />
          </TabsContent>
        )}
        {available.redes && (
          <TabsContent value="redes" forceMount className="data-[state=inactive]:hidden">
            <SocialLinksPanel canEdit={can('UPDATE_BANNER')} />
          </TabsContent>
        )}
        {available.galerias && (
          <TabsContent value="galerias">
            <GalleriesPanel canCreate={can('CREATE_BANNER')} canEdit={can('UPDATE_BANNER')} canDelete={can('DELETE_BANNER')} />
          </TabsContent>
        )}
        {available.parceiros && (
          <TabsContent value="parceiros"><PartnersPanel canEdit={can('UPDATE_USER')} /></TabsContent>
        )}
        {available.contatos && (
          <TabsContent value="contatos"><PublicContactsPanel canEdit={can('UPDATE_USER')} /></TabsContent>
        )}
        {available.salas && (
          <TabsContent value="salas">
            <RoomsPanel
              canCreate={can('CREATE_COURSE')}
              canEdit={can('UPDATE_COURSE')}
              canDelete={can('DELETE_COURSE')}
            />
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  )
}
