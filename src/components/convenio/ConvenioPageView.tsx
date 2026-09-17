import { Link } from '@tanstack/react-router'
import { CheckCircle2, FileText, MessageCircle, Phone, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { centsToBRL } from '@/utils/masks'
import { phoneDigits } from '@/lib/org-contact'
import { toParagraphs } from '@/lib/convenio-utils'
import type { Convenio } from '@/hooks/useConvenios'

// Conteúdo que a página precisa — o editor do admin passa o formulário em
// andamento pra pré-visualizar, por isso não exige id/datas.
export type ConvenioView = Pick<
  Convenio,
  | 'name' | 'title' | 'subtitle' | 'intro' | 'logoUrl'
  | 'priceLabelHeader' | 'priceValueHeader' | 'priceRows' | 'priceNote'
  | 'documentsTitle' | 'documents' | 'highlightsTitle' | 'highlights'
  | 'aboutTitle' | 'aboutText'
>

/**
 * Página pública de um convênio. Segue a estrutura da página antiga do
 * sindicato (tabela de valores, documentos para adesão, estrutura do convênio
 * e texto institucional) no visual do site atual.
 */
// `orgPhone` vem das Configurações do site (quem usa a página passa o valor); vazio esconde o botão.
export function ConvenioPageView({ convenio: c, orgPhone }: { convenio: ConvenioView; orgPhone: string }) {
  const aboutParagraphs = toParagraphs(c.aboutText)
  const hasTable = c.priceRows.length > 0
  const hasDocuments = c.documents.length > 0
  const hasAbout = c.highlights.length > 0 || !!c.aboutTitle || aboutParagraphs.length > 0

  return (
    <div>
      {/* Cabeçalho */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center md:flex-row md:text-left">
            {c.logoUrl && (
              <div className="flex h-24 w-44 shrink-0 items-center justify-center rounded-xl bg-white p-3 shadow-sm">
                <img src={c.logoUrl} alt={`Logo ${c.name}`} className="max-h-full max-w-full object-contain" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium uppercase tracking-wider text-primary-foreground/70">
                Convênio {c.name}
              </p>
              <h1 className="mt-1 text-3xl font-bold text-primary-foreground md:text-4xl">{c.title}</h1>
              {c.subtitle && <p className="mt-2 text-lg text-primary-foreground/80">{c.subtitle}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* Tabela + documentos */}
      {(hasTable || hasDocuments || c.intro) && (
        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4">
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-5">
              <div className={hasDocuments ? 'lg:col-span-3' : 'lg:col-span-5'}>
                {c.intro && (
                  <p className="mb-6 whitespace-pre-line text-muted-foreground">{c.intro}</p>
                )}
                {hasTable && (
                  <>
                    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                      <table className="w-full text-sm md:text-base">
                        <thead>
                          <tr className="bg-muted/60 text-left">
                            <th scope="col" className="px-5 py-3 font-semibold text-foreground">{c.priceLabelHeader}</th>
                            <th scope="col" className="px-5 py-3 text-right font-semibold text-foreground">{c.priceValueHeader}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.priceRows.map((row, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-5 py-3 text-foreground">{row.label}</td>
                              <td className="px-5 py-3 text-right font-semibold tabular-nums text-primary whitespace-nowrap">
                                {centsToBRL(row.priceCents)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {c.priceNote && (
                      <p className="mt-3 whitespace-pre-line text-xs text-muted-foreground">{c.priceNote}</p>
                    )}
                  </>
                )}
              </div>

              {hasDocuments && (
                <aside className="h-fit rounded-xl border bg-card p-6 shadow-sm lg:col-span-2">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                    <FileText className="size-5 text-primary" />
                    {c.documentsTitle}
                  </h2>
                  <ul className="mt-4 flex flex-col divide-y">
                    {c.documents.map((doc, i) => (
                      <li key={i} className="flex items-start gap-3 py-2.5 text-sm text-foreground">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </aside>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Estrutura + texto institucional */}
      {hasAbout && (
        <section className="bg-muted/30 py-10 md:py-14">
          <div className="container mx-auto px-4">
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-5">
              {c.highlights.length > 0 && (
                <div className="lg:col-span-2">
                  {c.highlightsTitle && (
                    <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                      <Sparkles className="size-5 text-primary" />
                      {c.highlightsTitle}
                    </h2>
                  )}
                  <ul className="mt-4 flex flex-col gap-2">
                    {c.highlights.map((h, i) => (
                      <li key={i} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm font-medium text-foreground">
                        <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(c.aboutTitle || aboutParagraphs.length > 0) && (
                <div className={c.highlights.length > 0 ? 'lg:col-span-3' : 'lg:col-span-5'}>
                  {c.aboutTitle && (
                    <h2 className="text-xl font-bold leading-snug text-foreground md:text-2xl">{c.aboutTitle}</h2>
                  )}
                  <div className="mt-4 flex flex-col gap-4 text-muted-foreground">
                    {aboutParagraphs.map((p, i) => (
                      <p key={i} className="whitespace-pre-line">{p}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Chamada para adesão */}
      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 rounded-2xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:p-8">
            <div>
              <h2 className="text-xl font-bold text-foreground">Quer aderir ao convênio {c.name}?</h2>
              <p className="mt-1 text-muted-foreground">
                Venha ao Sindicato Rural de Terra Roxa com os documentos ou fale com a gente.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              {orgPhone && (
                <Button asChild variant="outline">
                  <a href={`tel:${phoneDigits(orgPhone)}`}>
                    <Phone className="size-4" /> {orgPhone}
                  </a>
                </Button>
              )}
              <Button asChild>
                <Link to="/contato">
                  <MessageCircle className="size-4" /> Fale conosco
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
