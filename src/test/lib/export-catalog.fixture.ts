import { lerCatalogo, type ExportCatalog } from '@/components/export/report-builder'

// Catálogo de mentira no formato da decisão 006 (seção 3), para os testes do
// montador. É a resposta CRUA da API (antes de `lerCatalogo`).

export const CATALOGO_PESSOAS_CRU = {
  dataset: 'people',
  title: 'Pessoas',
  groups: [
    {
      name: 'Identificação',
      fields: [
        { key: 'ordem', label: 'Nº', type: 'number', privacy: 'comum', allowed: true, reason: null },
        { key: 'name', label: 'Nome', type: 'text', privacy: 'comum', allowed: true, reason: null },
        { key: 'nickname', label: 'Apelido', type: 'text', privacy: 'comum', allowed: true, reason: null },
        { key: 'birthDate', label: 'Nascimento', type: 'date', privacy: 'pessoal', allowed: true, reason: null },
        { key: 'ethnicity', label: 'Etnia', type: 'text', privacy: 'sensivel', allowed: true, reason: null },
      ],
    },
    {
      name: 'Documentos',
      fields: [
        { key: 'cpf', label: 'CPF', type: 'cpf', privacy: 'pessoal', allowed: true, reason: null },
        { key: 'rg', label: 'RG', type: 'text', privacy: 'pessoal', allowed: false, reason: 'Pede a permissão Visualizar usuários' },
      ],
    },
    {
      name: 'Contato',
      fields: [
        { key: 'email', label: 'E-mail', type: 'text', privacy: 'pessoal', allowed: true, reason: null },
        { key: 'phone', label: 'Telefone', type: 'phone', privacy: 'pessoal', allowed: true, reason: null },
      ],
    },
    {
      name: 'Endereço',
      fields: [
        { key: 'addressCity', label: 'Cidade', type: 'text', privacy: 'pessoal', allowed: true, reason: null },
        { key: 'addressLine', label: 'Endereço numa linha', type: 'text', privacy: 'pessoal', allowed: true, reason: null },
      ],
    },
    {
      name: 'Outros',
      fields: [
        { key: 'signature', label: 'Assinatura', type: 'blank', privacy: 'comum', allowed: true, reason: null },
      ],
    },
  ],
  padrao: ['name', 'nickname', 'cpf', 'rg', 'birthDate', 'email', 'phone'],
  modelos: [
    { id: 'nome-cpf', name: 'Nome e CPF', fields: ['name', 'cpf'] },
    { id: 'nome-email', name: 'Nome e e-mail', fields: ['name', 'email'] },
    { id: 'lista-presenca', name: 'Lista de presença', fields: ['ordem', 'name', 'cpf', 'signature'], confirmed: true },
    { id: 'antigo', name: 'Com campo que sumiu', fields: ['name', 'campoQueSumiu', 'rg'] },
  ],
  filterLabels: { search: 'Busca', activeMember: 'Só associados em dia', gender: 'Sexo', ownerIds: 'Donos' },
  limits: { rows: 20000, pdfRows: 2000, fields: 80 },
}

export function catalogoPessoas(over: Partial<ExportCatalog> = {}): ExportCatalog {
  return { ...lerCatalogo(CATALOGO_PESSOAS_CRU)!, ...over }
}
