import { CPF_LABEL } from '@/lib/cin'

// Os campos do cadastro de pessoa como DADO: nome do campo e rótulo.
//
// Separado de `components/cadastro/person-form-fields.tsx` (que desenha os
// campos) porque as telas também usam estes rótulos em lista — o "o que falta
// neste cadastro" do modo Completar cadastro —, e porque um arquivo que exporta
// componentes não pode exportar constantes sem quebrar o fast refresh do Vite.

/** Os campos de pessoa que as duas telas do cadastro têm. */
export type PersonFormValues = {
  name: string
  nickname: string
  email: string
  phone: string
  phone2: string
  phone3: string
  cpf: string
  rg: string
  rgIssuer: string
  rgIssuedAt: string
  birthDate: string
  driverLicense: string
  driverLicenseCategory: string
  birthPlace: string
  nationality: string
  gender: string
  ethnicity: string
  maritalStatus: string
  educationLevel: string
  functionalCategory: string
  cadPro: string[]
  familyIncome: string
  specialNeeds: boolean
  memberType: string
  memberStatus: string
  memberClassification: string
  memberSince: string
  membershipValidUntil: string
  memberNotes: string
  memberNotesNumber: string
  boardMember: boolean
  boardPosition: string
}

export type PersonFieldName = keyof PersonFormValues

export type PersonFieldsCtx = {
  values: PersonFormValues
  set: <K extends PersonFieldName>(campo: K, valor: PersonFormValues[K]) => void
  /** Ficha em modo leitura: campos desabilitados, mas legíveis. */
  disabled?: boolean
  errors?: Partial<Record<PersonFieldName, string>>
  /** Destaque âmbar do "Completar cadastro". */
  highlight?: (campo: PersonFieldName) => boolean
  /** Prefixo dos ids ("novo-", "pessoa-"): as duas telas coexistem na app. */
  idPrefix: string
}

/**
 * O rótulo de cada campo, em um lugar só. As duas telas já tinham divergido:
 * "Nº cooperado" no cadastro novo e "Nº observação" na ficha, para a mesma
 * coluna `memberNotesNumber`. Ficou o primeiro, que diz o que o número é.
 */
export const PERSON_LABELS: Record<PersonFieldName, string> = {
  name: 'Nome',
  nickname: 'Apelido',
  email: 'E-mail',
  phone: 'Telefone',
  phone2: 'Telefone 2',
  phone3: 'Telefone 3',
  cpf: CPF_LABEL,
  rg: 'RG',
  rgIssuer: 'Órgão emissor RG',
  rgIssuedAt: 'Data emissão RG',
  birthDate: 'Data nascimento',
  driverLicense: 'CNH',
  driverLicenseCategory: 'Categoria CNH',
  birthPlace: 'Naturalidade',
  nationality: 'Nacionalidade',
  gender: 'Gênero',
  ethnicity: 'Etnia',
  maritalStatus: 'Estado civil',
  educationLevel: 'Escolaridade',
  functionalCategory: 'Categoria funcional',
  cadPro: 'CAD/PRO (até 5)',
  familyIncome: 'Renda familiar',
  specialNeeds: 'Necessidades especiais',
  memberType: 'Tipo de membro',
  memberStatus: 'Situação',
  memberClassification: 'Classificação',
  memberSince: 'Associado desde',
  membershipValidUntil: 'Validade da associação',
  memberNotes: 'Observações',
  memberNotesNumber: 'Nº cooperado',
  boardMember: 'Membro da diretoria',
  boardPosition: 'Cargo na diretoria',
}

/** Todos os campos que as duas telas precisam ter. */
export const PERSON_FIELD_NAMES = Object.keys(PERSON_LABELS) as PersonFieldName[]

/**
 * Modo leitura da ficha: campo desabilitado, mas legível. O padrão do Input é
 * 50% de opacidade, e a ficha em leitura fica impossível de ler assim.
 */
export const READ_MODE_FIELD =
  'disabled:opacity-100 disabled:cursor-default disabled:bg-muted/40 dark:disabled:bg-muted/40'
