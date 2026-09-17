import { describe, it, expect } from 'vitest'
import { brPhoneNational, whatsappUrl, telHref, uniqueContactLines, phoneKey } from '@/lib/contact-links'
import { markdownToPlainText } from '@/lib/markdown-text'
import { courseToDuplicateForm, roomIdByName } from '@/lib/course-duplicate'
import type { Course } from '@/@types/course'

describe('brPhoneNational', () => {
  it('aceita celular e fixo com DDD em qualquer formato', () => {
    expect(brPhoneNational('(44) 99999-0000')).toBe('44999990000')
    expect(brPhoneNational('44 3645-2199')).toBe('4436452199')
  })

  it('tira +55 do país e 0 de discagem', () => {
    expect(brPhoneNational('+55 (44) 99999-0000')).toBe('44999990000')
    expect(brPhoneNational('55 44 3645 2199')).toBe('4436452199')
    expect(brPhoneNational('044 99999-0000')).toBe('44999990000')
    expect(brPhoneNational('0055 44 99999 0000')).toBe('44999990000')
  })

  it('DDD 55 não é confundido com o código do país', () => {
    expect(brPhoneNational('(55) 99999-9999')).toBe('55999999999')
  })

  it('sem DDD, curto demais ou vazio → null', () => {
    expect(brPhoneNational('99999-0000')).toBeNull()
    expect(brPhoneNational('')).toBeNull()
    expect(brPhoneNational(null)).toBeNull()
    expect(brPhoneNational('123456789012345')).toBeNull()
  })
})

describe('whatsappUrl / telHref', () => {
  it('monta os links com o número nacional', () => {
    expect(whatsappUrl('(44) 99999-0000')).toBe('https://wa.me/5544999990000')
    expect(telHref('(44) 99999-0000')).toBe('tel:+5544999990000')
  })

  it('WhatsApp só com número completo; ligar aceita o que tiver dígitos', () => {
    expect(whatsappUrl('9999-0000')).toBeNull()
    expect(telHref('9999-0000')).toBe('tel:99990000')
    expect(telHref('')).toBeNull()
    expect(telHref(undefined)).toBeNull()
  })
})

describe('uniqueContactLines', () => {
  it('tira vazios e repetidos mantendo a ordem', () => {
    expect(uniqueContactLines(['A@x.com', '', null, ' a@x.com ', 'b@x.com'])).toEqual(['A@x.com', 'b@x.com'])
  })

  it('telefones iguais em formatos diferentes contam uma vez', () => {
    expect(uniqueContactLines(['(44) 99999-0000', '+55 44 99999-0000', '44 3645-2199'], phoneKey))
      .toEqual(['(44) 99999-0000', '44 3645-2199'])
  })
})

describe('markdownToPlainText', () => {
  it('remove a marcação e junta as linhas', () => {
    const md = '## Sobre o curso\n\n**Aulas práticas** com _técnicos_.\n\n- Item um\n- [Saiba mais](https://x.com)\n\n> Citação `código`'
    expect(markdownToPlainText(md)).toBe('Sobre o curso Aulas práticas com técnicos. Item um Saiba mais Citação código')
  })

  it('vazio → string vazia', () => {
    expect(markdownToPlainText(null)).toBe('')
    expect(markdownToPlainText('')).toBe('')
  })

  it('mantém asteriscos soltos e texto comum', () => {
    expect(markdownToPlainText('Preço 5 * 2 = 10')).toBe('Preço 5 * 2 = 10')
    expect(markdownToPlainText('arquivo_de_teste e __forte__')).toBe('arquivo_de_teste e forte')
  })
})

describe('courseToDuplicateForm', () => {
  const course = {
    id: 'c1',
    status: 'PUBLIC',
    title: 'MANEJO DE PASTAGEM',
    description: '## Conteúdo',
    maxStudents: 30,
    minStudents: 8,
    enrolled: 12,
    preEnrolled: 0,
    waitlist: 0,
    coverImage: 'https://x/banner.jpg',
    price: 150,
    startDate: '2026-08-10',
    endDate: '2026-08-12',
    startTime: '08:00',
    endTime: '17:00',
    workloadHours: 16,
    location: 'SALA 1',
    instructorName: 'Fulano',
    registrationDeadline: '2026-08-05',
    observations: 'MAIORES DE 18 ANOS',
    eventNumber: '261676',
    photoGallery: [],
    instructors: [],
  } as Course

  it('copia os dados, limpa datas, prazo e nº do evento e começa como rascunho', () => {
    const form = courseToDuplicateForm(course, [{ id: 'r0', name: 'AUDITORIO' }, { id: 'r1', name: 'SALA 1' }])
    expect(form).toEqual({
      name: 'MANEJO DE PASTAGEM',
      description: '## Conteúdo',
      roomId: 'r1',
      status: 'UNPUBLISHED',
      startDate: '',
      startHour: '08:00',
      endDate: '',
      endHour: '17:00',
      price: 150,
      workloadHours: 16,
      regDeadlineDate: '',
      regDeadlineHour: '',
      observations: 'MAIORES DE 18 ANOS',
      eventNumber: '',
      minStudents: 8,
    })
  })

  it('sala não encontrada (ou salas ainda carregando) fica em branco', () => {
    expect(courseToDuplicateForm(course, undefined).roomId).toBe('')
    expect(roomIdByName([{ id: 'r0', name: 'AUDITORIO' }], 'SALA 1')).toBe('')
    expect(roomIdByName([{ id: 'r0', name: 'AUDITORIO' }], null)).toBe('')
  })
})
