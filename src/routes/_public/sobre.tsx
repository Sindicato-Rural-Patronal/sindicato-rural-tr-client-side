import { createFileRoute } from '@tanstack/react-router';


export const Route = createFileRoute('/_public/sobre')({
  component: AboutComponent,
});

function AboutComponent() {
  return (
    <main>
      
      <section className="container mx-auto px-4 py-8"> 
        <h1 className="text-3xl font-bold mb-4">Sobre Nós</h1>
        </section>
    </main>
  );
}