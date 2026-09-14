// Opções compartilhadas dos selects da ficha de associado.
// Usadas em usuarios/$id.tsx (edição) e usuarios/novo.tsx (cadastro) —
// mantidas aqui para não duplicar os mesmos value/label nos dois formulários.

export type SelectOption = { value: string; label: string }

export const GENDER_OPTIONS: SelectOption[] = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Feminino' },
  { value: 'OTHER', label: 'Outro' },
]

export const ETHNICITY_OPTIONS: SelectOption[] = [
  { value: 'WHITE', label: 'Branca' },
  { value: 'BLACK', label: 'Preta' },
  { value: 'MIXED', label: 'Parda' },
  { value: 'ASIAN', label: 'Amarela' },
  { value: 'INDIGENOUS', label: 'Indígena' },
]

export const EDUCATION_OPTIONS: SelectOption[] = [
  { value: 'NO_FORMAL_EDUCATION', label: 'Sem escolaridade' },
  { value: 'INCOMPLETE_PRIMARY', label: 'Fund. incompleto' },
  { value: 'COMPLETE_PRIMARY', label: 'Fund. completo' },
  { value: 'INCOMPLETE_SECONDARY', label: 'Médio incompleto' },
  { value: 'COMPLETE_SECONDARY', label: 'Médio completo' },
  { value: 'INCOMPLETE_HIGHER', label: 'Superior incompleto' },
  { value: 'COMPLETE_HIGHER', label: 'Superior completo' },
  { value: 'POSTGRADUATE', label: 'Pós-graduação' },
]

export const MARITAL_STATUS_OPTIONS: SelectOption[] = [
  { value: 'SINGLE', label: 'Solteiro(a)' },
  { value: 'MARRIED', label: 'Casado(a)' },
  { value: 'DIVORCED', label: 'Divorciado(a)' },
  { value: 'WIDOWED', label: 'Viúvo(a)' },
  { value: 'DOMESTIC_PARTNERSHIP', label: 'União estável' },
]

export const CNH_CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
  { value: 'AB', label: 'AB' },
  { value: 'AC', label: 'AC' },
  { value: 'AD', label: 'AD' },
  { value: 'AE', label: 'AE' },
]
