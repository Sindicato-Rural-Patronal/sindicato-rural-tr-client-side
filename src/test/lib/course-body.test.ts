import { describe, it, expect } from 'vitest'
import { buildCourseBody } from '@/lib/course-body'
import type { CourseFormData } from '@/lib/schemas'

// Criar e editar montam o mesmo corpo, mas campo em branco quer dizer coisas
// diferentes: na criação, "sem valor"; na edição, "apague o que estava gravado"
// (fora do PATCH a API mantém o valor antigo).

function form(over: Partial<CourseFormData> = {}): CourseFormData {
  return {
    name: 'Curso de Soja', description: 'Texto', roomId: 'r1', status: 'PUBLIC',
    startDate: '2026-12-01', startHour: '08:00', endDate: '2026-12-02', endHour: '17:00',
    price: 100, workloadHours: 8, minStudents: 5,
    regDeadlineDate: '2026-11-30', regDeadlineHour: '12:00',
    observations: 'Trazer bota', eventNumber: 'EVT-1',
    ...over,
  } as CourseFormData
}

describe('buildCourseBody: edição', () => {
  it('prazo, observações e número do evento esvaziados vão como null', () => {
    const body = buildCourseBody(form({ regDeadlineDate: '', regDeadlineHour: '', observations: '', eventNumber: '' }), true)
    expect(body.registrationDeadline).toBeNull()
    expect(body.observations).toBeNull()
    expect(body.eventNumber).toBeNull()
    // o corpo vai para o JSON com o null (não some)
    expect(JSON.parse(JSON.stringify(body))).toMatchObject({ registrationDeadline: null, observations: null, eventNumber: null })
  })

  it('campos preenchidos continuam indo com o valor', () => {
    const body = buildCourseBody(form(), true)
    expect(body).toMatchObject({
      registrationDeadline: '2026-11-30T12:00:00.000Z',
      observations: 'Trazer bota',
      eventNumber: 'EVT-1',
    })
  })

  it('só o campo esvaziado vai como null', () => {
    const body = buildCourseBody(form({ observations: '' }), true)
    expect(body.observations).toBeNull()
    expect(body.eventNumber).toBe('EVT-1')
    expect(body.registrationDeadline).toBe('2026-11-30T12:00:00.000Z')
  })

  it('preço, carga horária e mínimo esvaziados ainda ficam fora (dependem da API)', () => {
    const body = buildCourseBody(form({ price: undefined, workloadHours: undefined, minStudents: undefined }), true)
    expect(body).not.toHaveProperty('price')
    expect(body).not.toHaveProperty('workloadHours')
    expect(body).not.toHaveProperty('minStudents')
  })
})

describe('buildCourseBody: criação', () => {
  it('campo em branco fica fora do corpo, sem null', () => {
    const body = buildCourseBody(form({ regDeadlineDate: '', regDeadlineHour: '', observations: '', eventNumber: '' }), false)
    expect(body).not.toHaveProperty('registrationDeadline')
    expect(body).not.toHaveProperty('observations')
    expect(body).not.toHaveProperty('eventNumber')
  })

  it('manda o horário de parede como ISO com Z, sem converter fuso', () => {
    const body = buildCourseBody(form(), false)
    expect(body.startTime).toBe('2026-12-01T08:00:00.000Z')
    expect(body.endTime).toBe('2026-12-02T17:00:00.000Z')
  })
})
