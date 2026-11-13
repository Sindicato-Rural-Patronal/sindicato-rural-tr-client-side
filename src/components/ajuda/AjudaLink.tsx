import { Link } from '@tanstack/react-router'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * O "?" ao lado do título de uma tela: abre o artigo da Central de Ajuda que
 * fala DESTA tela. A dúvida acontece aqui dentro, não na seção de ajuda —
 * esperar que a pessoa lembre que a ajuda existe, saia do que está fazendo e
 * procure o assunto é pedir demais de quem está começando.
 *
 * `topico` é o nome do arquivo em `src/lib/help/articles/` (sem o .md).
 *
 * `novaAba` abre o artigo em outra aba. É para onde sair da tela perde o que a
 * pessoa fez sem salvar (o montador de relatórios: as colunas montadas sem
 * baixar). Nas telas comuns o "?" continua na mesma aba.
 */
export function AjudaLink({ topico, titulo, novaAba = false, className }: {
  topico: string
  /** O assunto, para o leitor de tela ("Ajuda sobre Banners"). */
  titulo: string
  /** Abre em outra aba (e o rótulo diz isso). */
  novaAba?: boolean
  className?: string
}) {
  const outraAba = novaAba ? ' (abre em outra aba)' : ''
  return (
    <Link
      to="/admin/ajuda"
      search={{ topico }}
      // Com target diferente de _self, o Link do roteador não navega: deixa o
      // navegador abrir a aba nova e esta tela fica como estava.
      {...(novaAba ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      aria-label={`Ajuda sobre ${titulo}${outraAba}`}
      title={`Como usar esta tela${outraAba}`}
      className={cn(
        // 44px no toque (a regra de alvo do projeto) e 36px no computador, onde
        // o ponteiro é preciso e um botão grande brigaria com o título.
        'inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground md:size-9',
        'transition-colors hover:bg-accent hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'print:hidden',
        className,
      )}
    >
      <HelpCircle className="size-5 md:size-4" aria-hidden />
    </Link>
  )
}
