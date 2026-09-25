import { z } from 'zod'
import { ROOM_NAMES } from '@/lib/room-names'

const cpfSchema = z.string().min(1, 'CPF obrigatório')
  .refine(v => v.replace(/\D/g, '').length === 11, 'CPF inválido')

const phoneSchema = z.string().min(1, 'Telefone obrigatório')
  .refine(v => [10, 11].includes(v.replace(/\D/g, '').length), 'Telefone inválido')

export const pessoaSchema = z.object({
  name:  z.string().min(1, 'Nome obrigatório').max(50, 'Máximo 50 caracteres'),
  email: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido'),
  phone: phoneSchema,
  cpf:   cpfSchema,
})

export const roomSchema = z.object({
  name:        z.string().refine(v => (ROOM_NAMES as readonly string[]).includes(v), 'Escolha a sala'),
  description: z.string().min(1, 'Descrição obrigatória'),
  maxCapacity: z.number().int().min(1, 'Mínimo 1'),
})

export const courseBaseSchema = z.object({
  // Título em branco é permitido: o backend grava "CURSO SEM NOME". O cadastro
  // costuma começar pela sala e pelas datas, para já reservar a agenda.
  name:            z.string().optional().default(''),
  description:     z.string().optional().default(''),
  roomId:          z.string().optional(),
  status:          z.enum(['PUBLIC', 'PRIVATE', 'UNPUBLISHED', 'IN_PROGRESS', 'COMPLETED']),
  startDate:       z.string().min(1, 'Data de início obrigatória'),
  startHour:       z.string().min(1, 'Horário de início obrigatório'),
  endDate:         z.string().min(1, 'Data de término obrigatória'),
  endHour:         z.string().min(1, 'Horário de término obrigatório'),
  price:           z.number().min(0).optional(),
  workloadHours:   z.number().int().min(0).optional(),
  regDeadlineDate: z.string().optional().default(''),
  regDeadlineHour: z.string().optional().default(''),
  observations:    z.string().optional().default(''),
  eventNumber:     z.string().optional().default(''),
  minStudents:     z.number().int().min(0).optional(),
})

export type RoomFormData   = z.infer<typeof roomSchema>
export type CourseFormData = z.input<typeof courseBaseSchema>
