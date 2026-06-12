// src/routes/_public.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PublicHeader } from '@/components/PublicHeader' // seu componente
import { PublicFooter } from '@/components/public-footer'

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
})

function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background w-full">
      <PublicHeader />
      <main >
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}