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

// Fase 2, parte B (SR-102, back 6e2758e): recortes das respostas reais.
export const CATALOGO_LANCAMENTOS_CRU = {
  dataset: 'finance-transactions',
  title: 'Lançamentos',
  groups: [
    {
      name: 'Lançamento',
      fields: [
        campo('number', 'Nº', 'number', 'comum'),
        campo('date', 'Data', 'date', 'comum'),
        campo('type', 'Tipo', 'text', 'comum'),
        campo('account', 'Caixa', 'text', 'comum'),
        campo('category', 'Categoria', 'text', 'comum'),
        campo('description', 'Descrição', 'text', 'comum'),
        campo('method', 'Método', 'text', 'comum'),
      ],
    },
    { name: 'Valores', fields: [campo('amount', 'Valor (R$)', 'money', 'comum')] },
    {
      name: 'Favorecido',
      fields: [campo('payeeName', 'Nome / Razão social', 'text', 'comum'), campo('payeeDocument', 'CNPJ / CPF', 'text', 'pessoal')],
    },
    { name: 'Relatório', fields: [campo('ordinal', 'Nº de ordem', 'number', 'comum'), campo('signature', 'Assinatura', 'blank', 'comum')] },
  ],
  padrao: ['number', 'date', 'type', 'account', 'category', 'description', 'payeeName', 'payeeDocument', 'method', 'amount'],
  modelos: [{ id: 'resumido', name: 'Resumido', fields: ['number', 'date', 'description', 'payeeName', 'amount'] }],
  filterLabels: {
    from: 'De', to: 'Até', type: 'Tipo', categoryId: 'Categoria', accountId: 'Caixa', method: 'Forma de pagamento', search: 'Busca', orderBy: 'Ordem',
  },
  limits: { rows: 20000, pdfRows: 2000, fields: 80 },
}

export const CATALOGO_AUDITORIA_CRU = {
  dataset: 'audit-logs',
  title: 'Auditoria',
  groups: [
    {
      name: 'Registro',
      fields: [
        campo('createdAt', 'Data e hora', 'datetime', 'comum'),
        campo('actor', 'Quem', 'text', 'comum'),
        campo('action', 'Ação', 'text', 'comum'),
        campo('entity', 'Área', 'text', 'comum'),
        campo('target', 'Alvo', 'text', 'comum'),
        campo('path', 'Caminho', 'text', 'comum'),
      ],
    },
    {
      name: 'De onde veio',
      fields: [campo('ip', 'IP', 'text', 'pessoal'), campo('location', 'Local', 'text', 'pessoal'), campo('device', 'Aparelho', 'text', 'pessoal')],
    },
    {
      name: 'Detalhes',
      fields: [campo('changes', 'Alterações', 'text', 'comum'), campo('exportDetails', 'Detalhes da exportação', 'text', 'comum')],
    },
  ],
  padrao: ['createdAt', 'actor', 'action', 'entity', 'target', 'path', 'ip', 'location', 'device', 'changes'],
  modelos: [{ id: 'resumida', name: 'Resumida', fields: ['createdAt', 'actor', 'action', 'target'] }],
  filterLabels: { action: 'Ação', entity: 'Tipo', actorId: 'Quem', ip: 'IP', from: 'De', to: 'Até', q: 'Busca' },
  limits: { rows: 20000, pdfRows: 2000, fields: 80 },
}

export const CATALOGO_RESERVAS_CRU = {
  dataset: 'room-bookings',
  title: 'Reservas de sala',
  groups: [
    { name: 'Reserva', fields: [campo('type', 'Tipo', 'text', 'comum'), campo('title', 'Título', 'text', 'comum')] },
    { name: 'Quando e onde', fields: [campo('room', 'Sala', 'text', 'comum'), campo('startTime', 'Início', 'wallclock', 'comum')] },
    { name: 'Responsável', fields: [campo('responsible', 'Responsável', 'text', 'pessoal')] },
  ],
  padrao: ['type', 'title', 'room', 'startTime', 'responsible'],
  modelos: [],
  filterLabels: { from: 'De', to: 'Até', roomId: 'Sala', type: 'Tipo', search: 'Busca' },
  limits: { rows: 20000, pdfRows: 2000, fields: 80 },
}

export function catalogoLancamentos(over: Partial<ExportCatalog> = {}): ExportCatalog {
  return { ...lerCatalogo(CATALOGO_LANCAMENTOS_CRU)!, ...over }
}

export function catalogoAuditoria(over: Partial<ExportCatalog> = {}): ExportCatalog {
  return { ...lerCatalogo(CATALOGO_AUDITORIA_CRU)!, ...over }
}

export function catalogoPessoas(over: Partial<ExportCatalog> = {}): ExportCatalog {
  return { ...lerCatalogo(CATALOGO_PESSOAS_CRU)!, ...over }
}

export function catalogoInscricoes(over: Partial<ExportCatalog> = {}): ExportCatalog {
  return { ...lerCatalogo(CATALOGO_INSCRICOES_CRU)!, ...over }
}
