// src/routes/_public.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PublicHeader } from '@/components/PublicHeader' // seu componente
import { PublicFooter } from '@/components/public-footer'
import { WhatsAppFloatingButton } from '@/components/WhatsAppFloatingButton'

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
})

function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background w-full">
      <PublicHeader />
      {/* flex-1: página curta (ex.: 404) não deixa o rodapé no meio da tela. */}
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
      <WhatsAppFloatingButton />
    </div>
  )
}
