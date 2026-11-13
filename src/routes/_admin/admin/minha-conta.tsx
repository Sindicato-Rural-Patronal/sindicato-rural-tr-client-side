import { createFileRoute } from '@tanstack/react-router'
import { Palette } from 'lucide-react'
import { PerfilTab } from '@/components/conta/PerfilTab'
import { ThemeSetting } from '@/components/ThemeSetting'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AjudaLink } from '@/components/ajuda/AjudaLink'
import { PageContainer, PageHeader } from '@/components/PageHeader'

export const Route = createFileRoute('/_admin/admin/minha-conta')({
  component: MinhaContaPage,
})

function PreferenciasTab() {
  return (
    <div className="flex flex-col gap-2">
      <Label className="flex items-center gap-2"><Palette className="size-4 text-muted-foreground" /> Tema</Label>
      <ThemeSetting />
      <p className="text-xs text-muted-foreground">"Sistema" acompanha o tema do seu dispositivo.</p>
    </div>
  )
}

function MinhaContaPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Minha conta"
        description="Seus dados, senha e preferências"
        help={<AjudaLink topico="minha-conta" titulo="Minha conta" />}
      />

      <div className="max-w-xl">
        <Tabs defaultValue="perfil">
          <TabsList>
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="preferencias">Preferências</TabsTrigger>
          </TabsList>
          <TabsContent value="perfil" className="rounded-xl border border-border bg-card p-4 md:p-6">
            <PerfilTab />
          </TabsContent>
          <TabsContent value="preferencias" className="rounded-xl border border-border bg-card p-4 md:p-6">
            <PreferenciasTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  )
}
