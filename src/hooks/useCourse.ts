import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiUpload } from '@/lib/api'
import type { Course } from '@/@types/course'

export type CreateCourseBody = {
  name: string
  description: string
  roomId: string
  status?: 'PUBLIC' | 'PRIVATE' | 'UNPUBLISHED'
  startTime: string
  endTime: string
  price?: number
  workloadHours?: number
  registrationDeadline?: string
  observations?: string
  eventNumber?: string
  minStudents?: number
}

export type UpdateCourseBody = Partial<CreateCourseBody>

export type CourseCardItem = {
  id: string
  status: 'PUBLIC' | 'PRIVATE' | 'UNPUBLISHED'
  title: string
  eventNumber: string | null
  startDate: string
  enrolled: number
  maxStudents: number
  price: number
  coverImage: string | null
  photoCount: number
}

export function useAdminCourses() {
  return useQuery<CourseCardItem[]>({
    queryKey: ['admin', 'courses'],
    queryFn: () => apiFetch('/admin/courses').then(r => r.json()),
  })
}

export function useAdminCourse(id: string) {
  return useQuery<Course>({
    queryKey: ['admin', 'courses', id],
    queryFn: () => apiFetch(`/admin/courses/${id}`).then(r => r.json()),
    enabled: !!id,
  })
}

export function useCourses() {
  return useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => apiFetch('/courses').then(r => r.json()),
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
    },
  })
}

export function useUpdateCourse(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateCourseBody) =>
      apiFetch(`/courses/${courseId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'], exact: true })
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'], exact: true })
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'], exact: true })
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
