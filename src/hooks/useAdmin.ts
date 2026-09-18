import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { apiFetch, apiUpload, API_BASE } from '@/lib/api'
import { openBlob } from '@/utils/download'

// Invalida TODAS as listas onde um usuário aparece, para não ficarem defasadas
// após editar a ficha (associados, admins, instrutores, parceiros, contatos
// públicos, vínculos com empresas e inscrições em cursos).
export function invalidateUserViews(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['admin', 'users'] })
  qc.invalidateQueries({ queryKey: ['admin', 'admins'] })
  qc.invalidateQueries({ queryKey: ['admin', 'instructors'] })
  qc.invalidateQueries({ queryKey: ['admin', 'companies'] })
  qc.invalidateQueries({ queryKey: ['admin', 'public-contacts'] })
  qc.invalidateQueries({ queryKey: ['partners'] })
  qc.invalidateQueries({ queryKey: ['contacts'] })
  qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
}

// Permissões do usuário logado vêm de /admin/me. Quando a regra dele muda
// (permissões editadas, ou regra reatribuída), invalidamos ['admin','me'] →
// sidebar e guards atualizam ao vivo, sem precisar recarregar/deslogar. O
// backend valida permissão por request, então a UI só precisa refletir.

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
  /** Presença: true = presente, false = faltou, null = sem marcar. */
  attended: boolean | null
  createdAt: string
  userData: {
    id: string
    name: string
    email: string | null
    phone: string
    cpf: string | null
    avatar: string | null
    birthDate: string | null
    boardMember: boolean
    boardPosition: string | null
    memberStatus: 'ACTIVE' | 'INACTIVE' | null
    membershipValidUntil: string | null
    /** Cargo em "Nossa Equipe", se a pessoa for contato público. */
    publicContact: { title: string | null } | null
    /** Só vínculos com empresas parceiras ativas. */
    companyMemberships: { company: { name: string; tradeName: string | null } }[]
  }
  ficha: { id: string; filename: string; createdAt: string } | null
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
  name: string
  avatar: string | null
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

// Self-service: admin logado edita os próprios dados (nome/usuário/senha).
export function useUpdateMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { name?: string; username?: string; password?: string }) =>
      apiFetch('/admin/me', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'me'] })
    },
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
  // Opcional e pode repetir entre pessoas (só o CPF é único).
  email: string | null
  phone: string
  cpf: string | null
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
  cadPro: string[]
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
  /** Empresas às quais a pessoa está vinculada (título = cargo dela na empresa). */
  companyMemberships?: PersonCompanyMembership[]
}

export type PersonCompanyMembership = {
  id: string
  title: string
  company: { id: string; name: string; tradeName: string | null; cnpj: string | null; type: 'PRIVATE' | 'PUBLIC'; isPartner: boolean }
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
  createdAt: string
  updatedAt: string
  userData: { name: string; email: string | null; cpf: string | null; avatar: string | null }
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

// A busca no backend ignora acento e maiúscula ("joao" acha "João") e aceita CPF
// com ou sem máscara. `placeholderData` mantém a lista anterior na tela enquanto
// a nova página/busca carrega (sem piscar skeleton a cada tecla). `enabled: false`
// não busca (ex.: sem permissão READ_USER).
export function useAdminUsers(filters: AdminUsersFilters = {}, options: { enabled?: boolean } = {}) {
  const { page = 1, limit = 20, search, memberType, memberClassification, gender, ethnicity, educationLevel, incompleteRegistration } = filters
  const term = search?.trim() ?? ''
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (term) params.set('search', term)
  if (memberType) params.set('memberType', memberType)
  if (memberClassification) params.set('memberClassification', memberClassification)
  if (gender) params.set('gender', gender)
  if (ethnicity) params.set('ethnicity', ethnicity)
  if (educationLevel) params.set('educationLevel', educationLevel)
  if (incompleteRegistration !== undefined) params.set('incompleteRegistration', String(incompleteRegistration))

  return useQuery<PaginatedResponse<UserData>>({
    queryKey: ['admin', 'users', page, limit, term, memberType ?? '', memberClassification ?? '', gender ?? '', ethnicity ?? '', educationLevel ?? '', incompleteRegistration ?? ''],
    queryFn: () => apiFetch(`/admin/users?${params}`).then(r => r.json()),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

export type AdminAdminsFilters = {
  page?: number
  limit?: number
  search?: string
  rulesId?: string
}

export function useAdminAdmins(filters: AdminAdminsFilters = {}) {
  const { page = 1, limit = 20, search, rulesId } = filters
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (search?.trim()) params.set('search', search.trim())
  if (rulesId) params.set('rulesId', rulesId)

  return useQuery<PaginatedResponse<UserAdmin>>({
    queryKey: ['admin', 'admins', page, limit, search ?? '', rulesId ?? ''],
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
      // Refetch /admin/me → sidebar e guards atualizam ao vivo (sem deslogar).
      // O backend valida permissão por request, então é seguro.
      queryClient.invalidateQueries({ queryKey: ['admin', 'me'] })
    },
  })
}

export function useDeleteRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ruleId: string) => apiFetch(`/rules/${ruleId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rules'] })
    },
  })
}

// Convite de admin: gestor escolhe pessoa + regra → gera token/link.
export function useCreateAdminInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { userDataId: string; rulesId: string }) =>
      apiFetch('/admin/invites', { method: 'POST', body: JSON.stringify(body) }).then(
        r => r.json() as Promise<{ token: string; expiresAt: string }>,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invites'] })
    },
  })
}

export type PendingInvite = {
  id: string
  userName: string
  ruleName: string
  expiresAt: string
  createdAt: string
  expired: boolean
}

/** Convites pendentes (sem expor token). */
export function useAdminInvites() {
  return useQuery<PendingInvite[]>({
    queryKey: ['admin', 'invites'],
    queryFn: () => apiFetch('/admin/invites').then(r => r.json()),
  })
}

export function useRevokeAdminInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/invites/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invites'] })
    },
  })
}

export type UpdateWorkerBody = {
  name?: string
  email?: string | null
  phone?: string
  cpf?: string | null
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
  cadPro?: string[]
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
      // O usuário pode ser também instrutor/parceiro/contato/admin — invalida
      // todas as listagens onde ele aparece, não só ['admin','users'].
      invalidateUserViews(queryClient)
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
      // Refetch /admin/me → se reatribuiu a regra do próprio usuário, a sidebar
      // e os guards atualizam ao vivo (sem deslogar). Backend valida por request.
      queryClient.invalidateQueries({ queryKey: ['admin', 'me'] })
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
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
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
      queryClient.invalidateQueries({ queryKey: ['courses'] }) // contagem de vagas pública
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
    },
  })
}

export function useStartCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (courseId: string) => apiFetch(`/admin/courses/${courseId}/start`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] }) // IN_PROGRESS sai da home
    },
  })
}

// Anexo da ficha escaneada/preenchida (PDF) na inscrição.
export function useUploadRegistrationFicha(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      apiUpload(`/admin/registrations/${id}/ficha`, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses', courseId, 'registrations'] })
    },
  })
}

export function useDeleteRegistrationFicha(courseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/registrations/${id}/ficha`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses', courseId, 'registrations'] })
    },
  })
}

// Baixa/abre o PDF anexado (endpoint exige Bearer, então não dá pra usar <a href>).
export async function openRegistrationFicha(registrationId: string) {
  const blob = await apiFetch(`/admin/registrations/${registrationId}/ficha`).then(r => r.blob())
  openBlob(blob)
}

export function useAdminUser(userId: string) {
  return useQuery<UserDataDetail>({
    queryKey: ['admin', 'users', userId],
    queryFn: () => apiFetch(`/admin/users/${userId}`).then(r => r.json()),
    enabled: !!userId,
    retry: false,
  })
}

export type CreatePropertyBody = {
  name: string
  registration?: string
  address: UpdateUserAddressBody & { type: 'URBAN' | 'RURAL' }
}

/** Edição: só o que vier muda (campo de texto vazio limpa o que estava gravado). */
export type UpdatePropertyBody = {
  name?: string
  registration?: string | null
  address?: Partial<UpdateUserAddressBody> & { type?: 'URBAN' | 'RURAL' }
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

export function useUpdateUserProperty(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ propertyId, ...body }: UpdatePropertyBody & { propertyId: string }) =>
      apiFetch(`/admin/users/${userId}/properties/${propertyId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId, 'properties'] })
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId, 'properties'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] })
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

// Self-service: o admin logado troca a própria foto.
export function useUploadMyAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiUpload('/admin/me/avatar', file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'me'] })
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
    email: string | null
    phone: string
    avatar: string | null
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
  partnerLogoUrl: string | null
  partnerUrl: string | null
}

// Público (home): o backend manda a lista pura. Fetch cru (sem token); erro vira lista vazia.
export function usePartners() {
  return useQuery<PublicPartner[]>({
    queryKey: ['partners'],
    queryFn: () => fetch(`${API_BASE}/partners`).then(r => (r.ok ? r.json() : [])),
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

export function useContactMessages(filters: ContactMessagesFilters = {}, options: { refetchInterval?: number } = {}) {
  const { page = 1, limit = 20, read, search } = filters
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (read !== null && read !== undefined) params.set('read', String(read))
  if (search?.trim()) params.set('search', search.trim())

  return useQuery<{ data: ContactMessage[]; total: number; page: number; limit: number; totalPages: number }>({
    queryKey: ['admin', 'contacts', 'messages', page, limit, read ?? null, search ?? ''],
    queryFn: () => apiFetch(`/admin/contacts/messages?${params}`).then(r => r.json()),
    refetchInterval: options.refetchInterval,
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

