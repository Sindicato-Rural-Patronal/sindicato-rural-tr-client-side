import { upperNoAccents } from '@/utils/text-format'

// Telas da paleta de comando (Ctrl+K). `hint` = palavras extras que também
// encontram a tela na busca. `perm` null = qualquer admin.
export type NavItem = {
  label: string
  to: string
  perm: string | null
  hint?: string
  search?: Record<string, string>
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Painel Geral', to: '/admin/dashboard', perm: null, hint: 'inicio dashboard calendario agenda reunião evento reserva sala' },
  { label: 'Cursos', to: '/admin/cursos', perm: 'READ_COURSE', hint: 'inscricoes alunos' },
  { label: 'Notícias', to: '/admin/noticias', perm: 'READ_NEWS' },
  { label: 'Usuários', to: '/admin/usuarios', perm: 'READ_USER', hint: 'associados pessoas cadastro' },
  { label: 'Empresas', to: '/admin/usuarios', search: { tab: 'empresas' }, perm: 'READ_USER', hint: 'cnpj parceiros cadastro' },
  { label: 'Unimed', to: '/admin/unimed', perm: 'READ_USER', hint: 'plano de saude beneficiarios ficha termo contrato' },
  { label: 'Configurações · Salas', to: '/admin/configuracoes', search: { tab: 'salas' }, perm: 'READ_COURSE', hint: 'sala auditorio cozinha video conferencia apl capacidade lugares' },
  { label: 'Banners', to: '/admin/banners', perm: 'READ_BANNER' },
  { label: 'Cotações', to: '/admin/cotacoes', perm: 'READ_MARKET_QUOTE', hint: 'precos soja milho trigo mandioca dolar' },
  { label: 'Convênios', to: '/admin/convenios', perm: 'READ_CONVENIO', hint: 'tabela de valores documentos adesao' },
  { label: 'Mensagens', to: '/admin/mensagens', perm: 'READ_CONTACT', hint: 'contato' },
  { label: 'Auditoria', to: '/admin/auditoria', perm: 'READ_AUDIT', hint: 'historico alteracoes' },
  { label: 'Financeiro', to: '/admin/financeiro', perm: 'READ_FINANCE', hint: 'caixa lançamentos' },
  { label: 'Configurações · Dados do sindicato', to: '/admin/configuracoes', search: { tab: 'dados' }, perm: 'READ_BANNER', hint: 'endereço telefone email horário mapa sobre' },
  { label: 'Configurações · Redes sociais', to: '/admin/configuracoes', search: { tab: 'redes' }, perm: 'READ_BANNER', hint: 'facebook instagram whatsapp rodapé' },
  { label: 'Configurações · Galerias', to: '/admin/configuracoes', search: { tab: 'galerias' }, perm: 'READ_BANNER', hint: 'fotos sobre historia faep patrulha rural' },
  { label: 'Configurações · Parceiros', to: '/admin/configuracoes', search: { tab: 'parceiros' }, perm: 'READ_USER', hint: 'parcerias logos home empresas' },
  { label: 'Configurações · Contatos públicos', to: '/admin/configuracoes', search: { tab: 'contatos' }, perm: 'READ_USER', hint: 'nossa equipe contato' },
  { label: 'Minha conta', to: '/admin/minha-conta', perm: null, hint: 'perfil senha usuario foto idioma tema' },
  { label: 'Ajuda', to: '/admin/ajuda', perm: null, hint: 'ajuda duvida manual documentacao tutorial como usar suporte' },
]

// Busca sem diferenciar maiúsculas nem acentos ("noticias" acha "Notícias").
// Com várias palavras, todas precisam aparecer (no nome ou nas palavras extras).
export function filterNavItems(items: NavItem[], query: string, can: (perm: string) => boolean): NavItem[] {
  const words = upperNoAccents(query).split(/\s+/).filter(Boolean)
  return items
    .filter(item => !item.perm || can(item.perm))
    .filter(item => {
      if (words.length === 0) return true
      const text = upperNoAccents(`${item.label} ${item.hint ?? ''}`)
      return words.every(word => text.includes(word))
    })
}

// Abre a paleta de fora dela (ex.: botão "Buscar" da barra lateral).
export const OPEN_COMMAND_PALETTE_EVENT = 'command-palette:open'

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))
}
