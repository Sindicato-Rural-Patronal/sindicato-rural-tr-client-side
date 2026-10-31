// Abas da lista de cursos do painel (`GET /admin/courses?view=`, SR-057 no backend).
//
// - Próximos: o dia do início ainda não chegou.
// - Armazenados: o dia do início é hoje ou já passou (relógio de Brasília), de
//   qualquer status; o concluído vem marcado como concluído.
//
// O curso passa de uma aba para a outra sozinho, no dia do início: quem separa é
// a consulta do backend. Aqui só ficam o nome das abas, o que vai na URL e os
// textos — o mesmo curso continua abrindo, com inscritos, presença e "Concluir".

export const COURSE_VIEWS = ['upcoming', 'stored'] as const
export type CourseView = (typeof COURSE_VIEWS)[number]

/** A aba que abre sem `?lista=` na URL. */
export const DEFAULT_COURSE_VIEW: CourseView = 'upcoming'

/** Valor de `?lista=` na URL (em português, como o resto dos endereços do painel). */
export const COURSE_VIEW_SLUG = { upcoming: 'proximos', stored: 'armazenados' } as const satisfies Record<CourseView, string>
export type CourseViewSlug = (typeof COURSE_VIEW_SLUG)[CourseView]

export const COURSE_VIEW_LABEL: Record<CourseView, string> = {
  upcoming: 'Próximos',
  stored: 'Armazenados',
}

/** Uma frase embaixo das abas: explica quando o curso muda de aba. */
export const COURSE_VIEW_HINT: Record<CourseView, string> = {
  upcoming: 'Cursos que ainda não começaram. No dia do início, o curso vai para Armazenados.',
  stored: 'Cursos que já chegaram ao dia do início, em andamento ou concluídos, do mais recente para o mais antigo.',
}

/** `?lista=` da URL → aba. Valor ausente ou desconhecido cai na aba padrão. */
export function courseViewFromSlug(slug: unknown): CourseView {
  return slug === COURSE_VIEW_SLUG.stored ? 'stored' : DEFAULT_COURSE_VIEW
}

/** Aba → `?lista=` da URL; a aba padrão não precisa aparecer (`undefined`). */
export function courseViewToSlug(view: CourseView): CourseViewSlug | undefined {
  return view === DEFAULT_COURSE_VIEW ? undefined : COURSE_VIEW_SLUG[view]
}

/** Valor de `?lista=` aceito pela URL (qualquer outra coisa é ignorada). */
export function parseCourseViewSlug(value: unknown): CourseViewSlug | undefined {
  return value === COURSE_VIEW_SLUG.upcoming || value === COURSE_VIEW_SLUG.stored ? value : undefined
}

/**
 * Texto da lista vazia SEM filtro. Quer dizer que a aba não tem curso, e só a
 * aba, não o sistema: o curso pode estar na outra. Com busca ou ano ativos, a
 * tela diz "nenhum curso encontrado" (`courses.notFound`).
 */
export function emptyCoursesCopy(view: CourseView): { title: string; description: string } {
  return view === 'stored'
    ? {
        title: 'Nenhum curso armazenado',
        description: 'No dia do início, o curso sai de Próximos e vem para cá.',
      }
    : {
        title: 'Nenhum curso próximo',
        description: 'Clique em "Novo curso" para cadastrar. Cursos que já começaram estão em Armazenados.',
      }
}
