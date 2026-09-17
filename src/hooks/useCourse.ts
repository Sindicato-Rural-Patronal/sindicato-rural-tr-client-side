import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiUpload } from '@/lib/api'
import type { Course } from '@/@types/course'
import type { Registration } from '@/hooks/useAdmin'

export type CreateCourseBody = {
  name: string
  description: string
  roomId: string
  status?: 'PUBLIC' | 'PRIVATE' | 'UNPUBLISHED' | 'IN_PROGRESS'
  startTime: string
  endTime: string
  price?: number
  workloadHours?: number
  registrationDeadline?: string
  observations?: string
  eventNumber?: string
  minStudents?: number
  // "Duplicar curso": o backend copia a capa (arquivo próprio) e os instrutores.
  copyCoverFromCourseId?: string
  copyInstructorsFromCourseId?: string
  /** Só estes vínculos do curso de origem; ausente = todos. */
  instructorAssignmentIds?: string[]
}

/** Resposta do POST /courses; os campos de cópia só vêm quando pedidos. */
export type CreateCourseResponse = {
  id: string
  coverCopied?: boolean
  instructorsCopied?: number
}

export type UpdateCourseBody = Partial<CreateCourseBody> & {
  preEnrolled?: number
  waitlist?: number
}

export type CourseCardItem = {
  id: string
  status: 'PUBLIC' | 'PRIVATE' | 'UNPUBLISHED' | 'IN_PROGRESS'
  title: string
  eventNumber: string | null
  startDate: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  enrolled: number
  maxStudents: number
  price: number
  coverImage: string | null
  /** Miniatura WebP (~640px) para o cartão; null → usa coverImage. */
  coverImageThumb?: string | null
  photoCount: number
  description?: string | null
  registrationDeadline: string | null
  location: string | null
  instructorName: string | null
  workloadHours: number | null
}

export type PaginatedCourses = {
  data: CourseCardItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useAdminCourses(params: {
  page: number
  limit: number
  status?: 'PUBLIC' | 'PRIVATE' | 'UNPUBLISHED' | 'IN_PROGRESS'
  search?: string
}) {
  const { page, limit, status, search } = params
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) qs.set('status', status)
  if (search?.trim()) qs.set('search', search.trim())

  return useQuery<PaginatedCourses>({
    queryKey: ['admin', 'courses', page, limit, status ?? '', search ?? ''],
    queryFn: () => apiFetch(`/admin/courses?${qs}`).then(r => r.json()),
  })
}

/** Detalhe do curso no painel; também usado com `queryClient.fetchQuery` (menu do card). */
export function adminCourseQuery(id: string) {
  return {
    queryKey: ['admin', 'courses', id],
    queryFn: (): Promise<Course> => apiFetch(`/admin/courses/${id}`).then(r => r.json()),
  }
}

export function useAdminCourse(id: string) {
  return useQuery<Course>({
    ...adminCourseQuery(id),
    enabled: !!id,
  })
}

export function useCourses(params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = params
  return useQuery<{ data: Course[]; total: number; page: number; limit: number; totalPages: number }>({
    queryKey: ['courses', page, limit],
    queryFn: () => apiFetch(`/courses?page=${page}&limit=${limit}`).then(r => r.json()),
  })
}

export function useCourse(id: string) {
  return useQuery<Course>({
    queryKey: ['courses', id],
    queryFn: () => apiFetch(`/courses/${id}`).then(r => r.json()),
    enabled: !!id,
  })
}

export function useCreateCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateCourseBody) =>
      apiFetch('/courses', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'], exact: false })
    },
  })
}

export function useUpdateCourse(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateCourseBody) =>
      apiFetch(`/courses/${courseId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses', courseId] })
    },
  })
}

export function useDeleteCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (courseId: string) =>
      apiFetch(`/courses/${courseId}`, { method: 'DELETE' }),
    onSuccess: (_, courseId) => {
      queryClient.removeQueries({ queryKey: ['admin', 'courses', courseId] })
      queryClient.invalidateQueries({ queryKey: ['courses'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'], exact: false })
    },
  })
}

export function useUploadBanner(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiUpload(`/courses/${courseId}/banner`, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', courseId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses', courseId] })
    },
  })
}

export function useUploadGalleryPhoto(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiUpload(`/courses/${courseId}/gallery`, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', courseId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses', courseId] })
    },
  })
}

export function useAssignInstructor(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { instructorUserDataId: string; title?: string; category?: string }) =>
      apiFetch(`/admin/courses/${courseId}/instructors`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses', courseId] })
    },
  })
}

export function useRemoveInstructorAssignment(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (assignmentId: string) =>
      apiFetch(`/admin/courses/${courseId}/instructors/${assignmentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses', courseId] })
    },
  })
}

export function useRegisterByCpf(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cpf: string) =>
      apiFetch(`/courses/${courseId}/register-by-cpf`, {
        method: 'POST',
        body: JSON.stringify({ cpf }),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', courseId] })
    },
  })
}

export type RegisterFullBody = {
  name: string
  phone: string
  email: string
  cpf: string
  rg?: string
  birthDate?: string
  address: {
    type: string
    zipCode?: string
    street?: string
    number?: string
    neighborhood?: string
    city?: string
  }
}

export function useRegisterFull(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: RegisterFullBody) =>
      apiFetch(`/courses/${courseId}/register-full`, {
        method: 'POST',
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', courseId] })
    },
  })
}

export function useDeleteGalleryPhoto(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (photoId: string) =>
      apiFetch(`/courses/${courseId}/gallery/${photoId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', courseId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses', courseId] })
    },
  })
}

// ─── inscrições (painel) ─────────────────────────────────────────────────────

/** Chave da lista completa de inscrições; fica sob a das páginas, então as mutations que já invalidam as páginas invalidam esta também. */
export function allRegistrationsKey(courseId: string) {
  return ['admin', 'courses', courseId, 'registrations', 'all'] as const
}

/** Busca TODAS as inscrições do curso paginando (não trunca em 1000). */
export async function fetchAllCourseRegistrations(courseId: string): Promise<Registration[]> {
  const limit = 500
  const acc: Registration[] = []
  for (let page = 1; ; page++) {
    const resp: { data?: Registration[]; totalPages?: number } = await apiFetch(
      `/admin/courses/${courseId}/registrations?page=${page}&limit=${limit}`,
    ).then(r => r.json())
    const batch = resp.data ?? []
    acc.push(...batch)
    if (batch.length < limit || page >= (resp.totalPages ?? 1)) break
  }
  return acc
}

/**
 * Todas as inscrições do curso (não só a página aberta): quem já está inscrito,
 * quantas faltam confirmar, telefones e e-mails para copiar.
 */
export function useAllCourseRegistrations(courseId: string) {
  return useQuery<Registration[]>({
    queryKey: allRegistrationsKey(courseId),
    queryFn: () => fetchAllCourseRegistrations(courseId),
    enabled: !!courseId,
  })
}

function invalidateRegistrations(queryClient: ReturnType<typeof useQueryClient>, courseId: string) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'courses', courseId, 'registrations'] })
  queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
  queryClient.invalidateQueries({ queryKey: ['courses'] }) // vagas na página pública
}

/** Inscrição feita pela equipe (pessoa do cadastro). Já nasce confirmada; ignora o prazo. */
export function useAdminRegisterPerson(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userDataId: string): Promise<{ registrationId: string }> =>
      apiFetch(`/admin/courses/${courseId}/registrations`, {
        method: 'POST',
        body: JSON.stringify({ userDataId }),
      }).then(r => r.json()),
    onSuccess: () => invalidateRegistrations(queryClient, courseId),
  })
}

/** Confirma todas as inscrições pendentes; devolve quantas foram confirmadas. */
export function useConfirmAllRegistrations(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (): Promise<{ confirmed: number }> =>
      apiFetch(`/admin/courses/${courseId}/registrations/confirm-all`, { method: 'PATCH' }).then(r => r.json()),
    onSuccess: () => invalidateRegistrations(queryClient, courseId),
  })
}
