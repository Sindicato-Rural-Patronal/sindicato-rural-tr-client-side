import { createFileRoute } from '@tanstack/react-router';
import { Construction } from 'lucide-react';

export const Route = createFileRoute('/_public/sobre')({
  component: AboutComponent,
});

function AboutComponent() {
  return (
    <main className="container mx-auto px-4 py-20">
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <Construction className="size-14 text-primary/60" />
        <h1 className="text-3xl font-bold">Página em desenvolvimento</h1>
        <p className="max-w-md text-muted-foreground">
          Esta página ainda está sendo construída. Em breve traremos mais informações sobre o Sindicato Rural de Terra Roxa.
        </p>
      </div>
    </main>
  );
}
