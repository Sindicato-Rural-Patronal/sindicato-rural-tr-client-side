import { lerCatalogo, type ExportCatalog } from '@/components/export/report-builder'

// Catálogos para os testes do montador, no formato REAL da API (SR-088, back
// 4127d5e: `GET /admin/export/:dataset/catalog`), recortados: as chaves, os
// rótulos, os grupos e os modelos são os de lá. É a resposta CRUA (antes de
// `lerCatalogo`). `modelos` não traz o Padrão: o front o monta de `padrao`.

const campo = (key: string, label: string, type: string, privacy: string, allowed = true) => ({
  key, label, type, privacy, allowed, reason: allowed ? null : 'Pede a permissão Visualizar usuários',
})

export const CATALOGO_PESSOAS_CRU = {
  dataset: 'people',
  title: 'Pessoas',
  groups: [
    {
      name: 'Identificação',
      fields: [
        campo('name', 'Nome', 'text', 'comum'),
        campo('nickname', 'Apelido', 'text', 'comum'),
        campo('birthDate', 'Nascimento', 'date', 'pessoal'),
        campo('age', 'Idade', 'number', 'pessoal'),
        campo('ethnicity', 'Etnia', 'text', 'sensivel'),
      ],
    },
    // Em `people` tudo sai com READ_USER; o RG desligado aqui imita a regra
    // sem a permissão (o mesmo `allowed: false` que `registrations` manda).
    { name: 'Documentos', fields: [campo('cpf', 'CPF', 'cpf', 'pessoal'), campo('rg', 'RG', 'text', 'pessoal', false)] },
    { name: 'Contato', fields: [campo('email', 'E-mail', 'text', 'pessoal'), campo('phone', 'Telefone', 'phone', 'pessoal')] },
    {
      name: 'Endereço',
      fields: [campo('addressCity', 'Endereço: Cidade', 'text', 'pessoal'), campo('addressLine', 'Endereço numa linha', 'text', 'pessoal')],
    },
    { name: 'Relatório', fields: [campo('ordinal', 'Nº de ordem', 'number', 'comum'), campo('signature', 'Assinatura', 'blank', 'comum')] },
  ],
  padrao: ['name', 'nickname', 'cpf', 'rg', 'birthDate', 'email', 'phone'],
  modelos: [
    { id: 'nome-cpf', name: 'Nome e CPF', fields: ['name', 'cpf'] },
    { id: 'nome-email', name: 'Nome e e-mail', fields: ['name', 'email'] },
    { id: 'lista-presenca', name: 'Lista de presença', fields: ['ordinal', 'name', 'cpf', 'signature'] },
    // Só para teste: a API garante que os de fábrica só usam chaves do
    // catálogo; isto imita o modelo salvo (fase 3) com campo retirado.
    { id: 'antigo', name: 'Com campo que sumiu', fields: ['name', 'campoQueSumiu', 'rg'] },
  ],
  filterLabels: {
    search: 'Busca',
    memberType: 'Tipo de membro',
    gender: 'Sexo',
    ethnicity: 'Etnia',
    educationLevel: 'Escolaridade',
    incompleteRegistration: 'Cadastro incompleto',
    activeMember: 'Só associados em dia',
  },
  limits: { rows: 20000, pdfRows: 2000, fields: 80 },
}

export const CATALOGO_INSCRICOES_CRU = {
  dataset: 'registrations',
  title: 'Inscrições',
  groups: [
    {
      name: 'Inscrição',
      fields: [
        campo('course', 'Curso', 'text', 'comum'),
        campo('confirmed', 'Confirmada', 'boolean', 'comum'),
        campo('registeredAt', 'Inscrito em', 'datetime', 'comum'),
      ],
    },
    { name: 'Identificação', fields: [campo('name', 'Nome', 'text', 'comum'), campo('nickname', 'Apelido', 'text', 'comum', false)] },
    { name: 'Documentos', fields: [campo('cpf', 'CPF', 'cpf', 'pessoal'), campo('rg', 'RG', 'text', 'pessoal', false)] },
    { name: 'Contato', fields: [campo('email', 'E-mail', 'text', 'pessoal'), campo('phone', 'Telefone', 'phone', 'pessoal')] },
    { name: 'Relatório', fields: [campo('ordinal', 'Nº de ordem', 'number', 'comum'), campo('signature', 'Assinatura', 'blank', 'comum')] },
  ],
  padrao: ['course', 'name', 'cpf', 'email', 'phone', 'confirmed', 'registeredAt'],
  modelos: [
    { id: 'nome-cpf', name: 'Nome e CPF', fields: ['name', 'cpf'] },
    { id: 'nome-email', name: 'Nome e e-mail', fields: ['name', 'email'] },
    { id: 'contato', name: 'Contato', fields: ['name', 'phone', 'email'] },
    { id: 'lista-presenca', name: 'Lista de presença', fields: ['ordinal', 'name', 'cpf', 'signature'], confirmed: true },
  ],
  filterLabels: { courseIds: 'Cursos', confirmed: 'Só confirmadas' },
  limits: { rows: 20000, pdfRows: 2000, fields: 80 },
}

export function catalogoPessoas(over: Partial<ExportCatalog> = {}): ExportCatalog {
  return { ...lerCatalogo(CATALOGO_PESSOAS_CRU)!, ...over }
}

export function catalogoInscricoes(over: Partial<ExportCatalog> = {}): ExportCatalog {
  return { ...lerCatalogo(CATALOGO_INSCRICOES_CRU)!, ...over }
}
