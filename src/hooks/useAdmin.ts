import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export type DashboardStats = {
  totalUsers: number
  totalAdmins: number
  courses: {
    total: number
    public: number
    private: number
    unpublished: number
  }
  totalRegistrations: number
}

export type Registration = {
  id: string
  courseId: string
  userDataId: string
  createdAt: string
  userData: {
    id: string
    name: string
    email: string
    phone: string
    cpf: string | null
    cnpj: string | null
    avatar: string | null
  }
}

export type CreateWorkerBody = {
  name: string
  email: string
  phone: string
  cpf: string
}

export type AdminMe = {
  userId: string
  username: string
  rulesId: string
  ruleName: string
  permitions: string[]
}

export function useMe() {
  return useQuery<AdminMe>({
    queryKey: ['admin', 'me'],
    queryFn: () => apiFetch('/admin/me').then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAdminStats() {
  return useQuery<DashboardStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiFetch('/admin/dashboard/stats').then(r => r.json()),
  })
}

export type UserData = {
  id: string
  name: string
  email: string
  phone: string
  cpf: string | null
  cnpj: string | null
  avatar: string | null
  createdAt: string
  updatedAt: string
  nickname: string | null
  maritalStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'DOMESTIC_PARTNERSHIP' | null
  phone2: string | null
  phone3: string | null
  rg: string | null
  rgIssuer: string | null
  rgIssuedAt: string | null
  birthDate: string | null
  driverLicense: string | null
  driverLicenseCategory: string | null
  birthPlace: string | null
  nationality: string | null
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  ethnicity: 'WHITE' | 'BLACK' | 'MIXED' | 'ASIAN' | 'INDIGENOUS' | null
  educationLevel: 'NO_FORMAL_EDUCATION' | 'INCOMPLETE_PRIMARY' | 'COMPLETE_PRIMARY' | 'INCOMPLETE_SECONDARY' | 'COMPLETE_SECONDARY' | 'INCOMPLETE_HIGHER' | 'COMPLETE_HIGHER' | 'POSTGRADUATE' | null
  functionalCategory: string | null
  specialNeeds: boolean
  memberClassification: string | null
  cadPro: string | null
  familyIncome: string | null
  memberType: string | null
  boardPosition: string | null
  boardMember: boolean
  memberStatus: 'ACTIVE' | 'INACTIVE' | null
  memberSince: string | null
  memberNotes: string | null
  memberNotesNumber: string | null
}

export type UserAddress = {
  id: string
  type: 'URBAN' | 'RURAL'
  city: string | null
  state: string | null
  zipCode: string | null
  street: string | null
  number: string | null
  neighborhood: string | null
  complement: string | null
  localityName: string | null
  road: string | null
  km: string | null
  lot: string | null
  section: string | null
}

export type UserProperty = {
  id: string
  name: string
  registration: string | null
  address: Omit<UserAddress, 'id'> | null
}

export type UserRelation = {
  id: string
  sourceId: string
  targetId: string
  label: string | null
  target: { id: string; name: string; cpf: string | null }
}

export type UserDataDetail = UserData & {
  address: UserAddress | null
  relations: UserRelation[]
  properties: UserProperty[]
}

export type UpdateUserAddressBody = {
  type?: 'URBAN' | 'RURAL'
  street?: string
  number?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
  complement?: string
  localityName?: string
  road?: string
  km?: string
  lot?: string
  section?: string
}

export type UserAdmin = {
  id: string
  username: string
  userDataId: string
  rulesId: string
  createdAt: string
  updatedAt: string
  userData: { name: string; email: string; cpf: string | null }
  rules: { name: string; permitions: string[] }
}

export type Rule = {
  id: string
  name: string
  description: string
  permitions: string[]
  createdAt: string
  updatedAt: string
}

export type CreateRuleBody = {
  name: string
  description?: string
  permitions: string[]
}

export type CreateAdminBody = {
  username: string
  password: string
  userDataId: string
  userRole: string
}

export function useAdminUsers() {
  return useQuery<UserData[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => apiFetch('/admin/users').then(r => r.json()),
  })
}

export function useAdminAdmins() {
  return useQuery<UserAdmin[]>({
    queryKey: ['admin', 'admins'],
    queryFn: () => apiFetch('/admin/users/admins').then(r => r.json()),
  })
}

export function useAdminRules() {
  return useQuery<Rule[]>({
    queryKey: ['admin', 'rules'],
    queryFn: () => apiFetch('/admin/rules').then(r => r.json()),
  })
}

export function useCreateRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateRuleBody) =>
      apiFetch('/rules', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rules'] })
    },
  })
}

export function useUpdateRule(ruleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<CreateRuleBody>) =>
      apiFetch(`/rules/${ruleId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rules'] })
    },
  })
}

export function useCreateAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateAdminBody) =>
      apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] })
    },
  })
}

export function useCreateWorker() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateWorkerBody) =>
      apiFetch('/users', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export type UpdateWorkerBody = Partial<CreateWorkerBody>

export function useUpdateWorker(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateWorkerBody) =>
      apiFetch(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export function useDeleteWorker() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export type UpdateAdminBody = {
  username?: string
  password?: string
  rulesId?: string
}

export function useUpdateAdmin(adminId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateAdminBody) =>
      apiFetch(`/admin/users/${adminId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] })
    },
  })
}

export function useDeleteAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (adminId: string) =>
      apiFetch(`/admin/users/${adminId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] })
    },
  })
}

export function useCourseRegistrations(courseId: string) {
  return useQuery<Registration[]>({
    queryKey: ['admin', 'courses', courseId, 'registrations'],
    queryFn: () => apiFetch(`/admin/courses/${courseId}/registrations`).then(r => r.json()),
    enabled: !!courseId,
  })
}

export function useCancelRegistration(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (registrationId: string) =>
      apiFetch(`/admin/registrations/${registrationId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses', courseId, 'registrations'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
    },
  })
}

export function useAdminUser(userId: string) {
  return useQuery<UserDataDetail>({
    queryKey: ['admin', 'users', userId],
    queryFn: () => apiFetch(`/admin/users/${userId}`).then(r => r.json()),
    enabled: !!userId,
  })
}

export function useUpdateUserAddress(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateUserAddressBody) =>
      apiFetch(`/admin/users/${userId}/address`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] })
    },
  })
}

export function useCreateUserProperty(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; registration?: string; address?: Partial<UpdateUserAddressBody & { type: string }> }) =>
      apiFetch(`/admin/users/${userId}/properties`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] })
    },
  })
}

export function useDeleteUserProperty(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (propertyId: string) =>
      apiFetch(`/admin/users/${userId}/properties/${propertyId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] })
    },
  })
}

export function useCreateUserRelation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { targetId: string; label?: string }) =>
      apiFetch(`/admin/users/${userId}/relations`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] })
    },
  })
}

export function useDeleteUserRelation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (relationId: string) =>
      apiFetch(`/admin/users/${userId}/relations/${relationId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] })
    },
  })
}
