import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiUpload } from '@/lib/api'
import type { Course } from '@/@types/course'

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

export function useAdminCourse(id: string) {
  return useQuery<Course>({
    queryKey: ['admin', 'courses', id],
    queryFn: () => apiFetch(`/admin/courses/${id}`).then(r => r.json()),
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
      queryClient.invalidateQueries({ queryKey: ['courses'], exact: true })
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

export type RegisterCourseBody = {
  name: string
  phone: string
  email: string
  cpf: string
}

export function useRegisterCourse(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: RegisterCourseBody) =>
      apiFetch(`/courses/${courseId}/register`, { method: 'POST', body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', courseId] })
    },
  })
}

export function useAssignInstructor(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { instructorUserDataId: string; title?: string; category?: string }) =>
      apiFetch(`/admin/courses/${courseId}/instructors`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
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
