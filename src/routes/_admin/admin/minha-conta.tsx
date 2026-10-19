import { createFileRoute } from '@tanstack/react-router'
import { UserCog, Palette } from 'lucide-react'
import { PerfilTab } from '@/components/conta/PerfilTab'
import { ThemeSetting } from '@/components/ThemeSetting'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AjudaLink } from '@/components/ajuda/AjudaLink'

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
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <div className="flex items-center gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <UserCog className="size-6" /> Minha conta
          </h1>
          <AjudaLink topico="minha-conta" titulo="Minha conta" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Seus dados, senha e preferências.</p>
      </div>

      <div className="max-w-xl">
        <Tabs defaultValue="perfil">
          <TabsList>
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="preferencias">Preferências</TabsTrigger>
          </TabsList>
          <TabsContent value="perfil" className="mt-4 rounded-lg border border-border bg-card p-4 md:p-6">
            <PerfilTab />
          </TabsContent>
          <TabsContent value="preferencias" className="mt-4 rounded-lg border border-border bg-card p-4 md:p-6">
            <PreferenciasTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
