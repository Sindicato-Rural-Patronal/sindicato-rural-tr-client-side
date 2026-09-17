// "O que mudou" na auditoria: nome dos campos em português e valores legíveis.
// O backend guarda [{ field, before, after }] com o nome da coluna/campo da API
// (lib/audit-diff.ts); campo sem tradução aparece como veio.

export type AuditValue = string | number | boolean | null

export type AuditChange = {
  field: string
  before: AuditValue
  after: AuditValue
}

export const AUDIT_FIELD_LABELS: Record<string, string> = {
  // Pessoa / empresa
  name: 'Nome',
  nickname: 'Apelido',
  tradeName: 'Nome fantasia',
  email: 'E-mail',
  phone: 'Telefone',
  phone2: 'Telefone 2',
  phone3: 'Telefone 3',
  cpf: 'CPF',
  cnpj: 'CNPJ',
  rg: 'RG',
  rgIssuer: 'Órgão emissor',
  birthDate: 'Nascimento',
  birthPlace: 'Naturalidade',
  nationality: 'Nacionalidade',
  gender: 'Sexo',
  ethnicity: 'Etnia',
  educationLevel: 'Escolaridade',
  maritalStatus: 'Estado civil',
  avatar: 'Foto',
  memberType: 'Tipo de membro',
  memberClassification: 'Classificação',
  memberStatus: 'Situação do associado',
  memberSince: 'Associado desde',
  membershipValidUntil: 'Validade da associação',
  memberNotes: 'Observações do associado',
  boardMember: 'Diretoria',
  boardPosition: 'Cargo na diretoria',
  cadPro: 'CAD/PRO',
  stateRegistration: 'Inscrição estadual',
  website: 'Site',
  isPartner: 'Parceira',
  partnerUrl: 'Link da parceira',
  partnerLogo: 'Logo da parceira',
  address: 'Endereço',
  registration: 'Matrícula',
  person: 'Pessoa',
  // Acesso
  username: 'Usuário',
  password: 'Senha',
  rule: 'Regra',
  permissions: 'Permissões',
  expiresAt: 'Expira em',
  usedAt: 'Usado em',
  // Cursos e inscrições
  status: 'Situação',
  title: 'Título',
  subtitle: 'Subtítulo',
  description: 'Descrição',
  price: 'Preço',
  priceCents: 'Preço',
  startTime: 'Início',
  endTime: 'Término',
  startDate: 'Início',
  endDate: 'Término',
  registrationDeadline: 'Prazo de inscrição',
  workloadHours: 'Carga horária',
  minStudents: 'Mínimo de alunos',
  eventNumber: 'Número do evento',
  observations: 'Observações',
  course: 'Curso',
  room: 'Sala',
  maxCapacity: 'Capacidade',
  instructor: 'Instrutor',
  confirmed: 'Confirmada',
  attended: 'Presença',
  filename: 'Arquivo',
  bio: 'Biografia',
  // Site
  content: 'Conteúdo',
  summary: 'Resumo',
  bannerUrl: 'Imagem',
  imageUrl: 'Imagem',
  logoUrl: 'Logo',
  url: 'Imagem',
  caption: 'Legenda',
  buttons: 'Botões',
  active: 'Ativo',
  isActive: 'Ativo',
  order: 'Ordem',
  read: 'Lida',
  subject: 'Assunto',
  message: 'Mensagem',
  slug: 'Endereço da página',
  priceRows: 'Tabela de valores',
  documents: 'Documentos',
  highlights: 'Destaques',
  aboutText: 'Texto do Sobre',
  orgPhone: 'Telefone do sindicato',
  orgEmail: 'E-mail do sindicato',
  orgStreet: 'Rua do sindicato',
  orgDistrict: 'Bairro do sindicato',
  orgCity: 'Cidade do sindicato',
  orgState: 'UF do sindicato',
  orgZip: 'CEP do sindicato',
  orgHours: 'Horário de atendimento',
  orgMapQuery: 'Busca do mapa',
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  // Cotações
  unit: 'Unidade',
  value: 'Valor',
  variation: 'Variação',
  period: 'Período',
  referenceDate: 'Data de referência',
  quotesSource: 'Fonte das cotações',
  // Financeiro
  amountCents: 'Valor',
  date: 'Data',
  type: 'Tipo',
  method: 'Forma de pagamento',
  category: 'Categoria',
  account: 'Caixa',
  color: 'Cor',
  notes: 'Observações',
}

export function auditFieldLabel(field: string): string {
  return Object.hasOwn(AUDIT_FIELD_LABELS, field) ? AUDIT_FIELD_LABELS[field] : field
}

// Campos gravados como "relógio local com Z" (horário do curso): mostra como está.
const WALL_CLOCK_FIELDS = new Set(['startTime', 'endTime', 'registrationDeadline'])

const VALUE_LABELS: Record<string, string> = {
  PUBLIC: 'Público',
  PRIVATE: 'Privado',
  UNPUBLISHED: 'Não publicado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
  PUBLISHED: 'Publicado',
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  MORNING: 'Manhã',
  AFTERNOON: 'Tarde',
  IN: 'Entrada',
  OUT: 'Saída',
}

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):\d{2}(?:\.\d+)?Z$/

/** Valor para a tabela "O que mudou": vazio → "—", sim/não, datas em pt-BR. */
export function formatAuditValue(field: string, value: AuditValue | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') {
    if (field === 'attended') return value ? 'Presente' : 'Faltou'
    return value ? 'Sim' : 'Não'
  }
  if (typeof value === 'number') {
    if (field.endsWith('Cents')) return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    return value.toLocaleString('pt-BR')
  }
  const iso = value.match(ISO_RE)
  if (iso) {
    const [, y, m, d, hh, mm] = iso
    // Meia-noite UTC = só a data (nascimento, validade...).
    if (hh === '00' && mm === '00' && value.includes('T00:00:00')) return `${d}/${m}/${y}`
    if (WALL_CLOCK_FIELDS.has(field)) return `${d}/${m}/${y} ${hh}:${mm}`
    return new Date(value).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return Object.hasOwn(VALUE_LABELS, value) ? VALUE_LABELS[value] : value
}

/** Linhas válidas de `changes` (resposta antiga ou malformada → lista vazia). */
export function auditChanges(changes: unknown): AuditChange[] {
  if (!Array.isArray(changes)) return []
  return changes.filter(
    (c): c is AuditChange => !!c && typeof c === 'object' && typeof (c as AuditChange).field === 'string',
  )
}
