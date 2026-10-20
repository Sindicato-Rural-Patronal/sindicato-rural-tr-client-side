import type { CourseFormData } from '@/lib/schemas'
import type { CreateCourseBody, UpdateCourseBody } from '@/hooks/useCourse'

/**
 * Hora "de parede", sem fuso: envia como se fosse UTC porque o backend devolve
 * a hora fatiando o ISO em UTC. Converter do fuso local (new Date(...).toISOString())
 * deslocava a hora no round-trip — digitava 08:00 e voltava 11:00.
 */
export function toISO(date: string, hour: string) {
  if (!date) return undefined
  return `${date}T${hour || '00:00'}:00.000Z`
}

type Required4 = 'name' | 'description' | 'startTime' | 'endTime'
type CreateBody = Pick<CreateCourseBody, Required4> & Partial<CreateCourseBody>
type EditBody = Pick<CreateCourseBody, Required4> & UpdateCourseBody

/**
 * Corpo do curso a partir do formulário (criar e editar montam o mesmo corpo).
 *
 * Na criação, campo em branco fica de fora. Na EDIÇÃO, fora do PATCH significa
 * "mantém o valor antigo": quem esvazia um campo precisa mandar `null` para a
 * API apagar. Nos numéricos (preço, carga horária, mínimo de alunos) a API
 * grava 0, porque a coluna não aceita nulo.
 */
export function buildCourseBody(data: CourseFormData, editing: false): CreateBody
export function buildCourseBody(data: CourseFormData, editing: true): EditBody
export function buildCourseBody(data: CourseFormData, editing: boolean): EditBody {
  const deadline = data.regDeadlineDate ? toISO(data.regDeadlineDate, data.regDeadlineHour ?? '') : undefined
  return {
    // Em branco vai como string vazia e o backend grava "CURSO SEM NOME" —
    // a regra do nome genérico mora num lugar só, lá.
    name: data.name ?? '',
    description: data.description ?? '',
    status: data.status,
    startTime: toISO(data.startDate, data.startHour)!,
    endTime: toISO(data.endDate, data.endHour)!,
    ...(data.roomId ? { roomId: data.roomId } : {}),
    ...(data.price != null ? { price: data.price } : editing ? { price: null } : {}),
    ...(data.workloadHours != null ? { workloadHours: data.workloadHours } : editing ? { workloadHours: null } : {}),
    ...(deadline ? { registrationDeadline: deadline } : editing ? { registrationDeadline: null } : {}),
    ...(data.observations ? { observations: data.observations } : editing ? { observations: null } : {}),
    ...(data.eventNumber ? { eventNumber: data.eventNumber } : editing ? { eventNumber: null } : {}),
    ...(data.minStudents != null ? { minStudents: data.minStudents } : editing ? { minStudents: null } : {}),
  }
}
