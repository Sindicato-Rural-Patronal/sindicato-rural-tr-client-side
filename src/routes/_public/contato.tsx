import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_public/contato')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main>
      Hello "/contato"!
    </main>
  )
}
