import type { Course } from '@/@types/course'
import type { CourseFormData } from '@/lib/schemas'

/**
 * Sala do curso pelo nome. O detalhe do curso traz só o nome da sala
 * (`location`); os nomes de sala são únicos. Sem correspondência → ''.
 */
export function roomIdByName(rooms: { id: string; name: string }[] | undefined, name: string | null | undefined): string {
  if (!name) return ''
  return rooms?.find(r => r.name === name)?.id ?? ''
}

/**
 * Formulário de "Duplicar curso": copia os dados do curso (título, descrição,
 * sala, horários, preço, carga horária, mínimo de alunos, observações) e deixa
 * em branco o que é de cada turma — datas, prazo de inscrição e nº do evento.
 * A cópia começa como rascunho.
 */
export function courseToDuplicateForm(
  course: Course,
  rooms: { id: string; name: string }[] | undefined,
): CourseFormData {
  return {
    name: course.title,
    description: course.description ?? '',
    roomId: roomIdByName(rooms, course.location),
    status: 'UNPUBLISHED',
    startDate: '',
    startHour: course.startTime ?? '',
    endDate: '',
    endHour: course.endTime ?? '',
    price: course.price ?? undefined,
    workloadHours: course.workloadHours ?? undefined,
    regDeadlineDate: '',
    regDeadlineHour: '',
    observations: course.observations ?? '',
    eventNumber: '',
    minStudents: course.minStudents ?? undefined,
  }
}
