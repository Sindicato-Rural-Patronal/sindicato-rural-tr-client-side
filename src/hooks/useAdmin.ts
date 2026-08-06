import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { apiFetch, apiUpload, API_BASE } from '@/lib/api'

// Invalida TODAS as listas onde um usuário aparece, para não ficarem defasadas
// após editar a ficha (associados, admins, instrutores, parceiros, contatos
// públicos e inscrições em cursos).
function invalidateUserViews(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['admin', 'users'] })
  qc.invalidateQueries({ queryKey: ['admin', 'admins'] })
  qc.invalidateQueries({ queryKey: ['admin', 'instructors'] })
  qc.invalidateQueries({ queryKey: ['partners'] })
  qc.invalidateQueries({ queryKey: ['contacts'] })
  qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
}

// Permissões do usuário logado vêm de /admin/me (em cache). Quando a regra dele
// muda (permissões da regra editadas, ou regra reatribuída), desloga para forçar
// re-login com permissões novas — evita a UI mostrar funcionalidades revogadas.
function logoutForPermissionChange() {
  localStorage.removeItem('token')
  window.location.href = '/login'
}

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
  registrationsLast30Days: number
}

export type Registration = {
  id: string
  courseId: string
  userDataId: string
  confirmed: boolean
  createdAt: string
  userData: {
    id: string
    name: string
    email: string
    phone: string
    cpf: string | null
    cnpj: string | null
    avatar: string | null
    birthDate: string | null
    isPartner: boolean
    boardMember: boolean
    boardPosition: string | null
    userAdmin: { publicTitle: string | null; isPublic: boolean } | null
  }
}

export type CreateWorkerBody = {
  name: string
  email: string
  phone: string
  cpf: string
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type AdminMe = {
  userId: string
  userDataId: string
  username: string
  rulesId: string
  ruleName: string
  permissions: string[]
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
  isPartner: boolean
  partnerUrl: string | null
  partnerOrder: number | null
  partnerLogo: string | null
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
  membershipValidUntil: string | null
  memberNotes: string | null
  memberNotesNumber: string | null
  primaryPropertyId: string | null
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
  notes: string | null
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
  createdAt: string
  target: { id: string; name: string; cpf: string | null }
}

export type UserInstructor = {
  id: string
  bio: string | null
  linkedin: string | null
  instagram: string | null
  facebook: string | null
}

export type UserDataDetail = UserData & {
  /** @deprecated endereço agora vive nas propriedades — use `properties[0].address` */
  address: UserAddress | null
  userInstructor: UserInstructor | null
  properties?: UserProperty[]
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
  notes?: string
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
  isPublic: boolean
  publicTitle: string | null
  createdAt: string
  updatedAt: string
  userData: { name: string; email: string; cpf: string | null; avatar: string | null }
  rules: { name: string; permissions: string[] }
}

export type Rule = {
  id: string
  name: string
  description: string
  permissions: string[]
  createdAt: string
  updatedAt: string
}

export type CreateRuleBody = {
  name: string
  description?: string
  permissions: string[]
}

export type CreateAdminBody = {
  username: string
  password: string
  userDataId: string
  userRole: string
}

export type AdminUsersFilters = {
  page?: number
  limit?: number
  search?: string
  memberType?: string
  memberClassification?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  ethnicity?: 'WHITE' | 'BLACK' | 'MIXED' | 'ASIAN' | 'INDIGENOUS'
  educationLevel?: 'NO_FORMAL_EDUCATION' | 'INCOMPLETE_PRIMARY' | 'COMPLETE_PRIMARY' |
    'INCOMPLETE_SECONDARY' | 'COMPLETE_SECONDARY' | 'INCOMPLETE_HIGHER' |
    'COMPLETE_HIGHER' | 'POSTGRADUATE'
  incompleteRegistration?: boolean
}

export function useAdminUsers(filters: AdminUsersFilters = {}) {
  const { page = 1, limit = 20, search, memberType, memberClassification, gender, ethnicity, educationLevel, incompleteRegistration } = filters
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (search?.trim()) params.set('search', search.trim())
  if (memberType) params.set('memberType', memberType)
  if (memberClassification) params.set('memberClassification', memberClassification)
  if (gender) params.set('gender', gender)
  if (ethnicity) params.set('ethnicity', ethnicity)
  if (educationLevel) params.set('educationLevel', educationLevel)
  if (incompleteRegistration !== undefined) params.set('incompleteRegistration', String(incompleteRegistration))

  return useQuery<PaginatedResponse<UserData>>({
    queryKey: ['admin', 'users', page, limit, search ?? '', memberType ?? '', memberClassification ?? '', gender ?? '', ethnicity ?? '', educationLevel ?? '', incompleteRegistration ?? ''],
    queryFn: () => apiFetch(`/admin/users?${params}`).then(r => r.json()),
  })
}

export type AdminAdminsFilters = {
  page?: number
  limit?: number
  search?: string
  rulesId?: string
  isPublic?: boolean
}

export function useAdminAdmins(filters: AdminAdminsFilters = {}) {
  const { page = 1, limit = 20, search, rulesId, isPublic } = filters
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (search?.trim()) params.set('search', search.trim())
  if (rulesId) params.set('rulesId', rulesId)
  if (isPublic !== undefined) params.set('isPublic', String(isPublic))

  return useQuery<PaginatedResponse<UserAdmin>>({
    queryKey: ['admin', 'admins', page, limit, search ?? '', rulesId ?? '', isPublic ?? ''],
    queryFn: () => apiFetch(`/admin/users/admins?${params}`).then(r => r.json()),
  })
}

export function useAdminRules(params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 100 } = params
  return useQuery<PaginatedResponse<Rule>>({
    queryKey: ['admin', 'rules', page, limit],
    queryFn: () =>
      apiFetch(`/admin/rules?page=${page}&limit=${limit}`).then(r => r.json()),
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'me'] })
      // Se a regra editada é a do próprio usuário logado, desloga.
      const me = queryClient.getQueryData<AdminMe>(['admin', 'me'])
      if (me?.rulesId === ruleId) logoutForPermissionChange()
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

export type UpdateWorkerBody = {
  name?: string
  email?: string
  phone?: string
  cpf?: string | null
  cnpj?: string | null
  nickname?: string | null
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'DOMESTIC_PARTNERSHIP' | null
  phone2?: string | null
  phone3?: string | null
  rg?: string | null
  rgIssuer?: string | null
  rgIssuedAt?: string | null
  birthDate?: string | null
  driverLicense?: string | null
  driverLicenseCategory?: string | null
  birthPlace?: string | null
  nationality?: string | null
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null
  ethnicity?: 'WHITE' | 'BLACK' | 'MIXED' | 'ASIAN' | 'INDIGENOUS' | null
  educationLevel?: 'NO_FORMAL_EDUCATION' | 'INCOMPLETE_PRIMARY' | 'COMPLETE_PRIMARY' | 'INCOMPLETE_SECONDARY' | 'COMPLETE_SECONDARY' | 'INCOMPLETE_HIGHER' | 'COMPLETE_HIGHER' | 'POSTGRADUATE' | null
  functionalCategory?: string | null
  specialNeeds?: boolean
  memberClassification?: string | null
  cadPro?: string | null
  familyIncome?: string | null
  memberType?: string | null
  boardPosition?: string | null
  boardMember?: boolean
  memberStatus?: 'ACTIVE' | 'INACTIVE' | null
  memberSince?: string | null
  membershipValidUntil?: string | null
  memberNotes?: string | null
  memberNotesNumber?: string | null
  primaryPropertyId?: string | null
  avatar?: string | null
  isPartner?: boolean
  partnerUrl?: string | null
  partnerOrder?: number | null
}

export function useUpdateWorker(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateWorkerBody) =>
      apiFetch(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      invalidateUserViews(queryClient)
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] })
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
  isPublic?: boolean
  publicTitle?: string | null
}

export function useUpdateAdmin(adminId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateAdminBody) =>
      apiFetch(`/admin/users/${adminId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'me'] })
      // Se reatribuiu a regra do próprio usuário logado, desloga.
      const me = queryClient.getQueryData<AdminMe>(['admin', 'me'])
      if (me?.userId === adminId && variables.rulesId) logoutForPermissionChange()
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

export function useCourseRegistrations(courseId: string, params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 100 } = params
  return useQuery<PaginatedResponse<Registration>>({
    queryKey: ['admin', 'courses', courseId, 'registrations', page, limit],
    queryFn: () => apiFetch(`/admin/courses/${courseId}/registrations?page=${page}&limit=${limit}`).then(r => r.json()),
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

export function useConfirmRegistration(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, confirmed }: { id: string; confirmed: boolean }) =>
      apiFetch(`/admin/registrations/${id}/confirm`, { method: 'PATCH', body: JSON.stringify({ confirmed }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses', courseId, 'registrations'] })
    },
  })
}

export function useStartCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (courseId: string) => apiFetch(`/admin/courses/${courseId}/start`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
    },
  })
}

export function useAdminUser(userId: string) {
  return useQuery<UserDataDetail>({
    queryKey: ['admin', 'users', userId],
    queryFn: () => apiFetch(`/admin/users/${userId}`).then(r => r.json()),
    enabled: !!userId,
    retry: false,
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

export type CreatePropertyBody = {
  name: string
  registration?: string
  address: UpdateUserAddressBody & { type: 'URBAN' | 'RURAL' }
}

export function useUserProperties(userId: string, params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 10 } = params
  return useQuery<PaginatedResponse<UserProperty>>({
    queryKey: ['admin', 'users', userId, 'properties', page, limit],
    queryFn: () => apiFetch(`/admin/users/${userId}/properties?page=${page}&limit=${limit}`).then(r => r.json()),
    enabled: !!userId,
  })
}

export function useCreateUserProperty(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePropertyBody) =>
      apiFetch(`/admin/users/${userId}/properties`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId, 'properties'] })
    },
  })
}

export function useDeleteUserProperty(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (propertyId: string) =>
      apiFetch(`/admin/users/${userId}/properties/${propertyId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId, 'properties'] })
    },
  })
}

export function useUploadAvatar(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiUpload(`/admin/users/${userId}/avatar`, file),
    onSuccess: () => {
      invalidateUserViews(queryClient)
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] })
    },
  })
}

export function useUploadPartnerLogo(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiUpload(`/admin/users/${userId}/partner-logo`, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] })
      queryClient.invalidateQueries({ queryKey: ['partners'] })
    },
  })
}

export function useReorderPartners() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (order: string[]) =>
      apiFetch('/admin/partners/reorder', { method: 'PATCH', body: JSON.stringify({ order }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
    },
  })
}

export function useUserRelations(userId: string, params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = params
  return useQuery<PaginatedResponse<UserRelation>>({
    queryKey: ['admin', 'users', userId, 'relations', page, limit],
    queryFn: () => apiFetch(`/admin/users/${userId}/relations?page=${page}&limit=${limit}`).then(r => r.json()),
    enabled: !!userId,
  })
}

export function useCreateUserRelation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { targetId: string; label?: string }) =>
      apiFetch(`/admin/users/${userId}/relations`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId, 'relations'] })
    },
  })
}

export function useDeleteUserRelation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (relationId: string) =>
      apiFetch(`/admin/users/${userId}/relations/${relationId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId, 'relations'] })
    },
  })
}

export type CEPResult = {
  id: string
  type: string
  zipCode: string
  street: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
}

export type InstructorItem = {
  id: string
  bio: string | null
  linkedin: string | null
  instagram: string | null
  facebook: string | null
  userData: {
    id: string
    name: string
  }
}

export function useInstructors() {
  return useQuery<InstructorItem[]>({
    queryKey: ['admin', 'instructors'],
    queryFn: () => apiFetch('/admin/instructors').then(r => r.json()).then(d => Array.isArray(d) ? d : (d.data ?? [])),
  })
}

export function usePromoteInstructor(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (bio?: string) =>
      apiFetch(`/admin/users/${userId}/instructor`, { method: 'POST', body: JSON.stringify({ bio }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'instructors'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] })
    },
  })
}

export function useUpdateInstructor(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { bio?: string; linkedin?: string | null; instagram?: string | null; facebook?: string | null }) =>
      apiFetch(`/admin/users/${userId}/instructor`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'instructors'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] })
    },
  })
}

export function useRemoveInstructor(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch(`/admin/users/${userId}/instructor`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'instructors'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] })
    },
  })
}

export function useCEPLookup() {
  return useMutation({
    mutationFn: (cep: string) =>
      apiFetch(`/address/cep/${cep.replace(/\D/g, '')}`).then(r => r.json()) as Promise<CEPResult>,
  })
}

export type PublicContactItem = {
  publicTitle: string | null
  userData: {
    name: string
    email: string
    phone: string
  }
}

export function usePublicContacts() {
  return useQuery<PublicContactItem[]>({
    queryKey: ['contacts'],
    queryFn: () =>
      apiFetch('/contacts').then(r => r.json()).then(d => Array.isArray(d) ? d : (d.data ?? [])),
  })
}

export type PublicPartner = {
  id: string
  name: string
  avatarUrl: string | null
  partnerLogoUrl: string | null
  partnerUrl: string | null
  cnpj: string | null
}

export function usePartners() {
  return useQuery<PublicPartner[]>({
    queryKey: ['partners'],
    queryFn: () =>
      fetch(`${API_BASE}/partners`)
        .then(r => r.json())
        .then(d => Array.isArray(d) ? d : (d.data ?? [])),
  })
}

export type ContactMessage = {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  read: boolean
  createdAt: string
}

type ContactMessagesFilters = {
  page?: number
  limit?: number
  read?: boolean | null
  search?: string
}

export function useContactMessages(filters: ContactMessagesFilters = {}) {
  const { page = 1, limit = 20, read, search } = filters
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (read !== null && read !== undefined) params.set('read', String(read))
  if (search?.trim()) params.set('search', search.trim())

  return useQuery<{ data: ContactMessage[]; total: number; page: number; limit: number; totalPages: number }>({
    queryKey: ['admin', 'contacts', 'messages', page, limit, read ?? null, search ?? ''],
    queryFn: () => apiFetch(`/admin/contacts/messages?${params}`).then(r => r.json()),
  })
}

export function useMarkContactMessageRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, read }: { messageId: string; read: boolean }) =>
      apiFetch(`/admin/contacts/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ read }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contacts', 'messages'] })
    },
  })
}

export function useDeleteContactMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) =>
      apiFetch(`/admin/contacts/messages/${messageId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contacts', 'messages'] })
    },
  })
}

export function useSendContactMessage() {
  return useMutation({
    mutationFn: (body: { name: string; email: string; phone?: string; subject?: string; message: string }) =>
      fetch(`${API_BASE}/contacts/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(async r => {
        if (!r.ok) {
          const data = await r.json().catch(() => null)
          throw new Error(data?.error ?? `HTTP ${r.status}`)
        }
        return r
      }),
  })
}
