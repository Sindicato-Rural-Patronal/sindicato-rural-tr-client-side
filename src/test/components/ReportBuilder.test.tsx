import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'
import { RelatorioVazioError } from '@/lib/export'
import { catalogoInscricoes, catalogoPessoas, modeloDaEquipeCru } from '../lib/export-catalog.fixture'
import type { ReportBuilderProps } from '@/components/export/ReportBuilder'
import '@/i18n'

// "Montar relatório" (decisão 006): no computador, diálogo de duas colunas;
// no celular, folha de altura cheia com ↑↓ de 44 px e sem "Imprimir".

let celular = false
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => celular }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const exportarRelatorio = vi.fn()
vi.mock('@/lib/export', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/export')>()),
  exportarRelatorio: (...args: unknown[]) => exportarRelatorio(...args),
}))
// A API dos modelos da equipe (fase 3, SR-114): a lista e salvar/mudar/excluir.
const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))
// O "?" da Ajuda é um Link do roteador.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: { children: ReactNode; to: string; search?: { topico?: string } }) =>
    <a href={`${to}?topico=${search?.topico ?? ''}`} {...props}>{children}</a>,
}))

const { ReportBuilder } = await import('@/components/export/ReportBuilder')

const onOpenChange = vi.fn()

function abrir(over: Partial<ReportBuilderProps> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ReportBuilder
        open
        onOpenChange={onOpenChange}
        dataset="people"
        catalog={catalogoPessoas()}
        filters={{ search: 'silva', activeMember: true }}
        selectedIds={[]}
        total={123}
        filtered
        {...over}
      />
    </QueryClientProvider>,
  )
}

/** Resposta do `apiFetch` com corpo JSON. */
function json(data: unknown) {
  return Promise.resolve({ json: () => Promise.resolve(data) })
}

type Pedido = { metodo: string; path: string; body: Record<string, unknown> | null }

type ModeloCru = { id: string; name: string } & Record<string, unknown>

/**
 * A API dos modelos, como o servidor: `lista` responde o GET (ou um erro), e
 * `mudanca` responde POST, PATCH e DELETE. O que der certo muda a lista (o
 * montador pede a lista de novo depois de salvar). Devolve os pedidos que
 * mudam algo, na ordem.
 */
function simularModelos(
  lista: ModeloCru[] | Error = [],
  mudanca: (p: Pedido) => Promise<unknown> = () => Promise.reject(new Error('inesperado')),
): Pedido[] {
  const pedidos: Pedido[] = []
  let atual = lista
  apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    const metodo = init?.method ?? 'GET'
    if (!path.startsWith('/admin/report-templates/')) throw new Error(`inesperado: ${path}`)
    if (metodo === 'GET') {
      if (atual instanceof Error) throw atual
      return json(atual)
    }
    const pedido = { metodo, path, body: init?.body ? JSON.parse(init.body as string) : null }
    pedidos.push(pedido)
    const resposta = await mudanca(pedido)
    if (Array.isArray(atual)) {
      const id = path.split('/')[4]
      if (metodo === 'DELETE') atual = atual.filter(t => t.id !== id)
      else {
        const modelo = await (resposta as { json: () => Promise<ModeloCru> }).json()
        atual = [...atual.filter(t => t.id !== modelo.id), modelo]
      }
    }
    return resposta
  })
  return pedidos
}

/** Rótulos das colunas escolhidas, na ordem. */
function colunas(): string[] {
  const lista = screen.getByRole('list', { name: 'Colunas, nesta ordem' })
  return within(lista).getAllByRole('listitem').map(li => li.getAttribute('data-coluna') ?? '')
}

/** Abre o grupo de campos (os que já têm campo escolhido começam abertos). */
async function abrirGrupo(nome: string) {
  const botao = screen.getByRole('button', { name: new RegExp(`^${nome}`) })
  if (botao.getAttribute('aria-expanded') !== 'true') await userEvent.click(botao)
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  celular = false
  exportarRelatorio.mockResolvedValue({ count: 123, abriuAba: false })
  simularModelos()
})

describe('montador no computador', () => {
  it('na primeira vez abre no Padrão, sem o campo que a pessoa não pode exportar', () => {
    abrir()
    expect(screen.getByRole('dialog', { name: 'Montar relatório · Pessoas' })).toBeInTheDocument()
    expect(screen.getByLabelText('Modelo')).toHaveValue('padrao')
    expect(colunas()).toEqual(['name', 'nickname', 'cpf', 'birthDate', 'email', 'phone'])
    expect(screen.getByText(/Ficaram de fora campos do modelo que você não pode exportar: RG/)).toBeInTheDocument()
  })

  it('o campo sem permissão aparece desligado, com o motivo', async () => {
    abrir()
    await abrirGrupo('Documentos')
    const rg = screen.getByRole('checkbox', { name: /RG/ })
    expect(rg).toBeDisabled()
    expect(screen.getAllByText('Pede a permissão Visualizar usuários').length).toBeGreaterThan(0)
  })

  it('escolher o modelo preenche as colunas; mexer mostra "(alterado)"', async () => {
    abrir()
    await userEvent.selectOptions(screen.getByLabelText('Modelo'), 'nome-cpf')
    expect(colunas()).toEqual(['name', 'cpf'])
    expect(screen.getByText('Prévia: Nome | CPF')).toBeInTheDocument()

    await abrirGrupo('Contato')
    await userEvent.click(screen.getByRole('checkbox', { name: /E-mail/ }))
    expect(colunas()).toEqual(['name', 'cpf', 'email'])
    expect(screen.getByRole('option', { name: 'Nome e CPF (alterado)' })).toBeInTheDocument()

    // Escolher o mesmo modelo de novo volta ao que ele era.
    await userEvent.selectOptions(screen.getByLabelText('Modelo'), 'nome-cpf')
    expect(colunas()).toEqual(['name', 'cpf'])
  })

  it('↑ e ↓ mudam a ordem e o foco fica no botão da coluna', async () => {
    abrir()
    await userEvent.selectOptions(screen.getByLabelText('Modelo'), 'nome-cpf')
    await userEvent.click(screen.getByRole('button', { name: 'Subir CPF' }))
    expect(colunas()).toEqual(['cpf', 'name'])
    // CPF chegou ao topo: "Subir" desliga e o foco vai para "Descer".
    expect(screen.getByRole('button', { name: 'Subir CPF' })).toBeDisabled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Descer CPF' })).toHaveFocus())
    expect(screen.getByRole('button', { name: 'Arrastar CPF' })).toBeInTheDocument()
  })

  it('tirar uma coluna e marcar de novo a põe no fim', async () => {
    abrir()
    await userEvent.selectOptions(screen.getByLabelText('Modelo'), 'nome-email')
    await userEvent.click(screen.getByRole('button', { name: 'Tirar Nome' }))
    expect(colunas()).toEqual(['email'])
    await userEvent.click(screen.getByRole('checkbox', { name: /^Nome/ }))
    expect(colunas()).toEqual(['email', 'name'])
  })

  it('a busca acha o campo sem acento', async () => {
    abrir()
    await userEvent.type(screen.getByLabelText('Procurar campo'), 'endereco linha')
    expect(screen.getByRole('checkbox', { name: /Endereço numa linha/ })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Apelido/ })).not.toBeInTheDocument()
  })

  it('mostra os filtros em palavras e avisa os dados pessoais', () => {
    abrir()
    expect(screen.getByText('Filtros: Busca: silva · Só associados em dia')).toBeInTheDocument()
    expect(screen.getByText('Leva dados pessoais: CPF, Nascimento, E-mail, Telefone.')).toBeInTheDocument()
  })

  it('baixa o PDF com os campos, o formato e o modelo, e lembra o último', async () => {
    abrir()
    await userEvent.selectOptions(screen.getByLabelText('Modelo'), 'nome-cpf')
    await userEvent.click(screen.getByRole('radio', { name: 'PDF' }))
    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF (123)' }))

    expect(exportarRelatorio).toHaveBeenCalledWith(
      'people',
      { search: 'silva', activeMember: true },
      'pdf',
      expect.objectContaining({ fields: ['name', 'cpf'], modelo: 'Nome e CPF', print: false, printWindow: null }),
    )
    // O modelo aberto vai junto (SR-115), para reabrir com ele.
    expect(JSON.parse(localStorage.getItem('sr:relatorio:people')!))
      .toEqual({ fields: ['name', 'cpf'], format: 'pdf', modelo: 'nome-cpf', alterado: false })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('Excel (SR-106): ao lado da planilha CSV; baixa .xlsx com os campos, sem o limite do PDF, e lembra', async () => {
    exportarRelatorio.mockResolvedValue({ count: 2500, abriuAba: false })
    abrir({ total: 2500 })
    const formatos = within(screen.getByRole('group', { name: 'Formato' })).getAllByRole('radio').map(r => r.getAttribute('aria-label') ?? r.parentElement?.textContent)
    expect(formatos).toEqual(['Planilha CSV', 'Planilha do Excel (.xlsx)', 'PDF', 'Imprimir'])
    await userEvent.selectOptions(screen.getByLabelText('Modelo'), 'nome-cpf')
    await userEvent.click(screen.getByRole('radio', { name: 'Planilha do Excel (.xlsx)' }))
    // 2.500 linhas passam do PDF, não da planilha.
    expect(screen.queryByText(/O PDF aceita/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Baixar planilha do Excel (2.500)' }))

    expect(exportarRelatorio).toHaveBeenCalledWith(
      'people', { search: 'silva', activeMember: true }, 'xlsx',
      expect.objectContaining({ fields: ['name', 'cpf'], modelo: 'Nome e CPF', print: false }),
    )
    expect(JSON.parse(localStorage.getItem('sr:relatorio:people')!))
      .toEqual({ fields: ['name', 'cpf'], format: 'xlsx', modelo: 'nome-cpf', alterado: false })
    const { toast } = await import('sonner')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Planilha do Excel com 2.500 registros baixada.'))
  })

  it('reabre no Excel quando foi o último formato', () => {
    localStorage.setItem('sr:relatorio:people', JSON.stringify({ fields: ['name'], format: 'xlsx' }))
    abrir()
    expect(screen.getByRole('radio', { name: 'Planilha do Excel (.xlsx)' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Baixar planilha do Excel (123)' })).toBeEnabled()
  })

  it('o aviso de letra pequena (9 colunas ou mais) é só do PDF, não do Excel', async () => {
    const nove = ['name', 'nickname', 'birthDate', 'age', 'ethnicity', 'cpf', 'email', 'phone', 'addressCity']
    localStorage.setItem('sr:relatorio:people', JSON.stringify({ fields: nove, format: 'xlsx' }))
    abrir()
    expect(screen.queryByText(/sai deitado e com letra menor/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'PDF' }))
    expect(screen.getByText(/Com 9 colunas o PDF sai deitado e com letra menor/)).toBeInTheDocument()
  })

  it('reabre no último usado, com o nome do modelo', () => {
    localStorage.setItem('sr:relatorio:people', JSON.stringify({ fields: ['name', 'email'], format: 'pdf' }))
    abrir()
    expect(screen.getByLabelText('Modelo')).toHaveValue('nome-email')
    expect(screen.getByRole('radio', { name: 'PDF' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Baixar PDF (123)' })).toBeEnabled()
  })

  it('Imprimir abre a aba no clique e manda o PDF para ela', async () => {
    const aba = { opener: {}, close: vi.fn(), document: document.implementation.createHTMLDocument('') }
    const open = vi.spyOn(window, 'open').mockReturnValue(aba as unknown as Window)
    abrir()
    await userEvent.click(screen.getByRole('radio', { name: 'Imprimir' }))
    await userEvent.click(screen.getByRole('button', { name: 'Imprimir (123)' }))

    expect(open).toHaveBeenCalledWith('', '_blank')
    expect(aba.opener).toBeNull()
    expect(exportarRelatorio).toHaveBeenCalledWith('people', expect.anything(), 'pdf', expect.objectContaining({ print: true, printWindow: aba }))
    open.mockRestore()
  })

  it('"Selecionados" com milhar', () => {
    abrir({ selectedIds: Array.from({ length: 1500 }, (_, i) => `p${i}`) })
    expect(screen.getByRole('radio', { name: 'Selecionados (1.500)' })).toBeChecked()
  })

  it('com seleção na lista, começa em "Selecionados" e manda os ids', async () => {
    abrir({ selectedIds: ['p1', 'p2'] })
    expect(screen.getByRole('radio', { name: 'Selecionados (2)' })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Baixar planilha (2)' }))
    expect(exportarRelatorio).toHaveBeenCalledWith('people', { ids: ['p1', 'p2'] }, 'csv', expect.objectContaining({ fields: expect.any(Array) }))
  })

  it('PDF com mais de 2.000 linhas não baixa e diz por quê', async () => {
    abrir({ total: 2500 })
    await userEvent.click(screen.getByRole('radio', { name: 'PDF' }))
    expect(screen.getByRole('button', { name: 'Baixar PDF (2.500)' })).toBeDisabled()
    expect(screen.getByText('O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.')).toBeInTheDocument()
  })

  it('o erro da API aparece no montador, que continua aberto', async () => {
    exportarRelatorio.mockRejectedValue(new ApiError(403, 'Sem permissão para exportar: RG, Endereço.'))
    abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Baixar planilha (123)' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem permissão para exportar: RG, Endereço.')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('sem nenhuma coluna não baixa', async () => {
    abrir()
    await userEvent.selectOptions(screen.getByLabelText('Modelo'), 'nome-cpf')
    await userEvent.click(screen.getByRole('button', { name: 'Tirar Nome' }))
    await userEvent.click(screen.getByRole('button', { name: 'Tirar CPF' }))
    expect(screen.getByText('Escolha pelo menos um campo.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Baixar planilha (123)' })).toBeDisabled()
  })

  it('inscrições: a Lista de presença liga "Só confirmadas" e manda confirmed', async () => {
    abrir({ dataset: 'registrations', catalog: catalogoInscricoes(), selectedIds: undefined, filters: { courseIds: ['c1'] }, total: 12, filtered: false })
    expect(screen.queryByRole('radio', { name: /Selecionados/ })).not.toBeInTheDocument()
    const confirmadas = screen.getByRole('checkbox', { name: 'Só confirmadas' })
    expect(confirmadas).not.toBeChecked()
    await userEvent.selectOptions(screen.getByLabelText('Modelo'), 'lista-presenca')
    expect(confirmadas).toBeChecked()
    // Sem saber quantas estão confirmadas, o total é só o teto.
    expect(screen.getByRole('radio', { name: 'Todos (até 12)' })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Baixar planilha (até 12)' }))
    expect(exportarRelatorio).toHaveBeenCalledWith(
      'registrations', { courseIds: ['c1'] }, 'csv',
      expect.objectContaining({
        fields: ['ordinal', 'name', 'cpf', 'signature'], confirmed: true, modelo: 'Lista de presença', recusarVazio: true,
      }),
    )
  })

  it('filtros de lista fixa saem com o rótulo da tela, não com o valor gravado', () => {
    abrir({ filters: { search: 'cristina', gender: 'FEMALE', educationLevel: 'COMPLETE_HIGHER' } })
    expect(screen.getByText('Filtros: Busca: cristina · Sexo: Feminino · Escolaridade: Superior completo')).toBeInTheDocument()
  })
})

describe('montador das inscrições de um curso', () => {
  const inscricoes = {
    dataset: 'registrations' as const, catalog: catalogoInscricoes(), selectedIds: undefined,
    filters: { courseIds: ['c1'] }, total: 5, filtered: false,
    filterTexts: { courseIds: 'Curso: Primeiros Socorros' },
  }

  it('a linha "Filtros:" diz o nome do curso', () => {
    abrir(inscricoes)
    expect(screen.getByText('Filtros: Curso: Primeiros Socorros')).toBeInTheDocument()
  })

  it('com a contagem da tela, "Só confirmadas" muda o número do Todos e do botão', async () => {
    abrir({ ...inscricoes, totalConfirmadas: 3 })
    expect(screen.getByRole('radio', { name: 'Todos (5)' })).toBeChecked()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Só confirmadas (3)' }))
    expect(screen.getByRole('radio', { name: 'Todos (3)' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Baixar planilha (3)' })).toBeEnabled()
  })

  it('trocar da Lista de presença para outro modelo desmarca "Só confirmadas"', async () => {
    abrir({ ...inscricoes, totalConfirmadas: 3 })
    const confirmadas = screen.getByRole('checkbox', { name: 'Só confirmadas (3)' })
    await userEvent.selectOptions(screen.getByLabelText('Modelo'), 'lista-presenca')
    expect(confirmadas).toBeChecked()
    await userEvent.selectOptions(screen.getByLabelText('Modelo'), 'nome-cpf')
    expect(confirmadas).not.toBeChecked()
    // À mão continua valendo.
    await userEvent.click(confirmadas)
    expect(confirmadas).toBeChecked()
  })

  it('nenhuma confirmada: o botão desliga e diz por quê, em vez de baixar um PDF vazio', async () => {
    abrir({ ...inscricoes, totalConfirmadas: 0 })
    await userEvent.selectOptions(screen.getByLabelText('Modelo'), 'lista-presenca')
    await userEvent.click(screen.getByRole('radio', { name: 'PDF' }))
    expect(screen.getByRole('button', { name: 'Baixar PDF (0)' })).toBeDisabled()
    expect(screen.getByText('Nenhuma inscrição confirmada. Desmarque "Só confirmadas" para levar todas.')).toBeInTheDocument()
  })

  it('sem a contagem e a API sem nenhuma: avisa no montador, que fica aberto', async () => {
    exportarRelatorio.mockRejectedValue(new RelatorioVazioError())
    abrir({ ...inscricoes, filterTexts: undefined })
    await userEvent.selectOptions(screen.getByLabelText('Modelo'), 'lista-presenca')
    await userEvent.click(screen.getByRole('button', { name: 'Baixar planilha (até 5)' }))
    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Nenhuma inscrição confirmada. Desmarque "Só confirmadas" para levar todas.')
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})

describe('avisos, Ajuda e botão de fechar', () => {
  it('Imprimir com a aba bloqueada: o aviso diz que o arquivo foi baixado', async () => {
    const { toast } = await import('sonner')
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    exportarRelatorio.mockResolvedValue({ count: 123, abriuAba: false })
    abrir()
    await userEvent.click(screen.getByRole('radio', { name: 'Imprimir' }))
    await userEvent.click(screen.getByRole('button', { name: 'Imprimir (123)' }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(
      'O navegador não abriu outra aba: o relatório foi baixado. Abra o arquivo para imprimir.',
    ))
    open.mockRestore()
  })

  it('Imprimir com a aba aberta: o aviso diz que abriu em outra aba', async () => {
    const { toast } = await import('sonner')
    const aba = { opener: {}, close: vi.fn(), document: document.implementation.createHTMLDocument('') }
    const open = vi.spyOn(window, 'open').mockReturnValue(aba as unknown as Window)
    exportarRelatorio.mockResolvedValue({ count: 123, abriuAba: true })
    abrir()
    await userEvent.click(screen.getByRole('radio', { name: 'Imprimir' }))
    await userEvent.click(screen.getByRole('button', { name: 'Imprimir (123)' }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Relatório aberto em outra aba para imprimir.'))
    open.mockRestore()
  })

  it('o título tem o "?" da Ajuda e o botão de fechar diz "Fechar"', () => {
    abrir()
    expect(screen.getByRole('link', { name: 'Ajuda sobre Montar relatório (abre em outra aba)' }))
      .toHaveAttribute('href', '/admin/ajuda?topico=montar-relatorio')
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })

  it('o "?" abre a Ajuda em outra aba e o montador fica aberto com as colunas', async () => {
    abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Tirar CPF' }))
    const antes = colunas()
    const ajuda = screen.getByRole('link', { name: 'Ajuda sobre Montar relatório (abre em outra aba)' })
    expect(ajuda).toHaveAttribute('target', '_blank')
    expect(ajuda).toHaveAttribute('rel', 'noopener noreferrer')
    expect(ajuda).toHaveAttribute('title', 'Como usar esta tela (abre em outra aba)')
    // O jsdom não abre abas: o clique só não pode fechar o montador.
    ajuda.addEventListener('click', e => e.preventDefault(), { once: true })
    await userEvent.click(ajuda)
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Montar relatório · Pessoas' })).toBeInTheDocument()
    expect(colunas()).toEqual(antes)
    expect(antes).toEqual(['name', 'nickname', 'birthDate', 'email', 'phone'])
  })
})

describe('montador no celular', () => {
  beforeEach(() => { celular = true })

  it('folha sem "Imprimir" e sem arrastar; ↑↓ com alvo de 44 px', () => {
    abrir()
    expect(screen.getByRole('dialog', { name: 'Montar relatório · Pessoas' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Imprimir' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'PDF' })).toBeInTheDocument()
    // O Excel aparece também no celular (SR-106).
    expect(screen.getByRole('radio', { name: 'Planilha do Excel (.xlsx)' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Arrastar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir CPF' })).toHaveClass('size-11')
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveClass('size-11')
    expect(screen.getByRole('link', { name: 'Ajuda sobre Montar relatório (abre em outra aba)' }))
      .toHaveAttribute('target', '_blank')
  })

  it('a folha tem a altura toda (o h-auto do ui/sheet não ganha)', () => {
    abrir()
    const folha = screen.getByRole('dialog', { name: 'Montar relatório · Pessoas' })
    expect(folha).toHaveClass('data-[side=bottom]:h-dvh')
    expect(folha).not.toHaveClass('data-[side=bottom]:h-auto')
  })

  it('com a lista comprida, modelo, "O que entra", formato e "+ Adicionar campo" vêm antes das colunas', () => {
    abrir()
    const primeiraColuna = within(screen.getByRole('list', { name: 'Colunas, nesta ordem' })).getAllByRole('listitem')[0]
    const antes = (el: HTMLElement) =>
      expect(el.compareDocumentPosition(primeiraColuna) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    antes(screen.getByLabelText('Modelo'))
    antes(screen.getByRole('group', { name: 'O que entra' }))
    antes(screen.getByRole('group', { name: 'Formato' }))
    antes(screen.getByRole('button', { name: 'Adicionar campo' }))
  })

  it('"Imprimir" guardado no computador vira PDF no celular', () => {
    localStorage.setItem('sr:relatorio:people', JSON.stringify({ fields: ['name'], format: 'print' }))
    abrir()
    expect(screen.getByRole('radio', { name: 'PDF' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Baixar PDF (123)' })).toBeInTheDocument()
  })

  it('"+ Adicionar campo" abre a lista; "Pronto" volta com a coluna no fim', async () => {
    abrir()
    await userEvent.selectOptions(screen.getByLabelText('Modelo'), 'nome-cpf')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar campo' }))
    expect(screen.getByRole('heading', { name: 'Adicionar campo' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Procurar campo'), 'telefone')
    await userEvent.click(screen.getByRole('checkbox', { name: /Telefone/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Pronto (3 colunas)' }))
    expect(colunas()).toEqual(['name', 'cpf', 'phone'])
  })
})

describe('modelos da equipe (fase 3, SR-115)', () => {
  const modelo = modeloDaEquipeCru

  /** As opções do seletor, na ordem, com o grupo de cada uma ("grupo|nome"). */
  function opcoesDoSeletor() {
    return within(screen.getByLabelText('Modelo')).getAllByRole('option')
      .filter(o => !(o as HTMLOptionElement).disabled)
      .map(o => `${(o.parentElement as HTMLOptGroupElement).label ?? ''}|${o.textContent}`)
  }

  async function abrirModeloDaEquipe(nome = 'Telefones da equipe') {
    await userEvent.selectOptions(screen.getByLabelText('Modelo'), await screen.findByRole('option', { name: nome }))
  }

  it('o seletor tem o grupo "Modelos da equipe" depois dos de fábrica, com o Padrão primeiro', async () => {
    simularModelos([modelo({ id: 't2', name: 'Aniversariantes' }), modelo()])
    abrir()
    expect(await screen.findByRole('option', { name: 'Telefones da equipe' })).toBeInTheDocument()
    expect(opcoesDoSeletor()).toEqual([
      'Modelos de fábrica|Padrão (como hoje)',
      'Modelos de fábrica|Nome e CPF',
      'Modelos de fábrica|Nome e e-mail',
      'Modelos de fábrica|Lista de presença',
      'Modelos de fábrica|Com campo que sumiu',
      'Modelos da equipe|Aniversariantes',
      'Modelos da equipe|Telefones da equipe',
    ])
    expect(apiFetch).toHaveBeenCalledWith('/admin/report-templates/people')
  })

  it('sem modelo da equipe, o seletor fica como antes, sem grupos', async () => {
    abrir()
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/report-templates/people'))
    expect(screen.queryByRole('group', { name: 'Modelos da equipe' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar como modelo…' })).toBeInTheDocument()
  })

  it('com o montador fechado a lista não é buscada', () => {
    abrir({ open: false })
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('abrir um modelo da equipe aplica as colunas e o formato, e diz quem criou e quem editou', async () => {
    simularModelos([modelo({ updatedBy: { id: 'a2', username: 'bali' }, updatedAt: '2026-11-11T22:30:00.000Z' })])
    abrir()
    await abrirModeloDaEquipe()
    expect(colunas()).toEqual(['name', 'phone'])
    expect(screen.getByRole('radio', { name: 'PDF' })).toBeChecked()
    // 22h30 em UTC ainda é dia 11 em Brasília.
    expect(screen.getByText('Modelo da equipe, criado por gestor em 10/11/2026 e editado por bali em 11/11/2026.'))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Renomear o modelo "Telefones da equipe"' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Excluir o modelo "Telefones da equipe"' })).toBeEnabled()
    // Sem mudança, não oferece salvar por cima.
    expect(screen.queryByRole('button', { name: 'Salvar alterações no modelo' })).not.toBeInTheDocument()
  })

  it('campo sem permissão sai com aviso, e renomear e excluir ficam desligados com o motivo', async () => {
    simularModelos([modelo({ fields: ['name', 'rg', 'phone'] })])
    abrir()
    await abrirModeloDaEquipe()
    expect(colunas()).toEqual(['name', 'phone'])
    expect(screen.getByText(/Ficaram de fora campos do modelo que você não pode exportar: RG\./)).toBeInTheDocument()
    // O que saiu por permissão não conta como mudança: é o modelo possível.
    expect(screen.getByLabelText('Modelo')).toHaveValue('equipe:t1')
    const motivo = 'Você não pode mudar nem excluir este modelo, porque ele tem campos que você não pode exportar: RG.'
    expect(screen.getByText(motivo)).toBeInTheDocument()
    const renomear = screen.getByRole('button', { name: 'Renomear o modelo "Telefones da equipe"' })
    expect(renomear).toBeDisabled()
    expect(renomear.parentElement).toHaveAttribute('title', motivo)
    expect(screen.getByRole('button', { name: 'Excluir o modelo "Telefones da equipe"' })).toBeDisabled()
    // Nem oferece salvar por cima depois de mexer.
    await userEvent.click(screen.getByRole('button', { name: 'Tirar Nome' }))
    expect(screen.queryByRole('button', { name: 'Salvar alterações no modelo' })).not.toBeInTheDocument()
  })

  it('campo que saiu do catálogo: avisa e abre sem ele', async () => {
    simularModelos([modelo({ fields: ['name'], missingFields: ['campoAntigo'] })])
    abrir()
    await abrirModeloDaEquipe()
    expect(colunas()).toEqual(['name'])
    expect(screen.getByText(/1 campo do modelo não existe mais e saiu\./)).toBeInTheDocument()
    expect(screen.getByLabelText('Modelo')).toHaveValue('equipe:t1')
  })

  it('mexer mostra "(alterado)" e oferece salvar por cima, que manda as colunas e o formato', async () => {
    const pedidos = simularModelos([modelo()], p => json(modelo({
      fields: p.body!.fields, format: p.body!.format, updatedBy: { id: 'a2', username: 'bali' },
    })))
    abrir()
    await abrirModeloDaEquipe()
    await abrirGrupo('Contato')
    await userEvent.click(screen.getByRole('checkbox', { name: /E-mail/ }))
    expect(screen.getByRole('option', { name: 'Telefones da equipe (alterado)' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações no modelo' }))
    expect(screen.getByText('Salvar no modelo "Telefones da equipe" as colunas e o formato de agora? Ele muda para toda a equipe.'))
      .toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar no modelo' }))

    expect(pedidos).toEqual([{
      metodo: 'PATCH', path: '/admin/report-templates/people/t1', body: { fields: ['name', 'phone', 'email'], format: 'pdf' },
    }])
    const { toast } = await import('sonner')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Modelo "Telefones da equipe" atualizado.'))
    // A lista guardada já tem o modelo novo: não está mais "(alterado)".
    await waitFor(() => expect(screen.getByLabelText('Modelo')).toHaveValue('equipe:t1'))
    expect(screen.queryByRole('button', { name: 'Salvar alterações no modelo' })).not.toBeInTheDocument()
  })

  it('trocar só o formato também oferece salvar por cima, sem "(alterado)"', async () => {
    simularModelos([modelo()])
    abrir()
    await abrirModeloDaEquipe()
    await userEvent.click(screen.getByRole('radio', { name: 'Planilha CSV' }))
    expect(screen.getByLabelText('Modelo')).toHaveValue('equipe:t1')
    expect(screen.getByRole('button', { name: 'Salvar alterações no modelo' })).toBeInTheDocument()
    // "Imprimir" é o mesmo PDF do modelo: não conta como mudança.
    await userEvent.click(screen.getByRole('radio', { name: 'Imprimir' }))
    expect(screen.queryByRole('button', { name: 'Salvar alterações no modelo' })).not.toBeInTheDocument()
  })

  it('"Salvar como modelo…" manda o nome, as colunas e o formato, e o modelo novo fica aberto', async () => {
    const pedidos = simularModelos([], p => json(modelo({
      id: 'novo', name: p.body!.name, fields: p.body!.fields, format: p.body!.format,
    })))
    abrir()
    await userEvent.selectOptions(screen.getByLabelText('Modelo'), 'nome-cpf')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar como modelo…' }))
    expect(screen.getByText('O modelo fica para toda a equipe, com as colunas e o formato de agora.')).toBeInTheDocument()
    const nome = screen.getByLabelText('Nome do modelo')
    expect(nome).toHaveFocus()
    expect(nome).toHaveAttribute('maxLength', '64')
    await userEvent.type(nome, '  CPFs   da diretoria ')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar modelo' }))

    expect(pedidos).toEqual([{
      metodo: 'POST', path: '/admin/report-templates/people',
      body: { name: 'CPFs da diretoria', fields: ['name', 'cpf'], format: 'csv' },
    }])
    const { toast } = await import('sonner')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Modelo "CPFs da diretoria" salvo para a equipe.'))
    expect(screen.getByLabelText('Modelo')).toHaveValue('equipe:novo')
    expect(screen.getByRole('group', { name: 'Modelos da equipe' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome do modelo')).not.toBeInTheDocument()
  })

  it('nome vazio não chega à API', async () => {
    const pedidos = simularModelos()
    abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar como modelo…' }))
    await userEvent.type(screen.getByLabelText('Nome do modelo'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar modelo' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome do modelo.')
    expect(pedidos).toEqual([])
  })

  it.each([
    [409, 'Já existe um modelo da equipe com esse nome.'],
    [409, 'Já existe um modelo de fábrica com esse nome.'],
    [409, 'Este relatório já tem 100 modelos da equipe. Exclua um antes de salvar outro.'],
    [403, 'Sem permissão para exportar: RG.'],
    [400, 'No máximo 80 campos por relatório.'],
  ])('o %i da API ao salvar aparece como veio, e o montador continua aberto (%s)', async (status, mensagem) => {
    simularModelos([], () => Promise.reject(new ApiError(status, mensagem)))
    abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar como modelo…' }))
    await userEvent.type(screen.getByLabelText('Nome do modelo'), 'Nome e CPF')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar modelo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(mensagem)
    expect(screen.getByLabelText('Nome do modelo')).toHaveValue('Nome e CPF')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('Esc com o painel aberto fecha só o painel', async () => {
    abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Salvar como modelo…' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByLabelText('Nome do modelo')).not.toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Montar relatório · Pessoas' })).toBeInTheDocument()
  })

  it('renomear manda só o nome', async () => {
    const pedidos = simularModelos([modelo()], p => json(modelo({ name: p.body!.name })))
    abrir()
    await abrirModeloDaEquipe()
    await userEvent.click(screen.getByRole('button', { name: 'Renomear o modelo "Telefones da equipe"' }))
    const nome = screen.getByLabelText('Novo nome do modelo')
    expect(nome).toHaveValue('Telefones da equipe')
    await userEvent.clear(nome)
    await userEvent.type(nome, 'Telefones{Enter}')
    expect(pedidos).toEqual([{ metodo: 'PATCH', path: '/admin/report-templates/people/t1', body: { name: 'Telefones' } }])
    const { toast } = await import('sonner')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Modelo renomeado para "Telefones".'))
    expect(await screen.findByRole('option', { name: 'Telefones' })).toBeInTheDocument()
  })

  it('renomear com o mesmo nome não chama a API', async () => {
    const pedidos = simularModelos([modelo()])
    abrir()
    await abrirModeloDaEquipe()
    await userEvent.click(screen.getByRole('button', { name: 'Renomear o modelo "Telefones da equipe"' }))
    await userEvent.click(screen.getByRole('button', { name: 'Renomear' }))
    expect(pedidos).toEqual([])
    expect(screen.queryByLabelText('Novo nome do modelo')).not.toBeInTheDocument()
  })

  it('excluir pede confirmação sem dizer que é para sempre; as colunas ficam', async () => {
    const pedidos = simularModelos([modelo()], () => Promise.resolve({ status: 204 }))
    abrir()
    await abrirModeloDaEquipe()
    await userEvent.click(screen.getByRole('button', { name: 'Excluir o modelo "Telefones da equipe"' }))
    const painel = screen.getByRole('group', { name: 'Excluir o modelo' })
    const pergunta = within(painel).getByText('Excluir o modelo "Telefones da equipe"? Ele sai da lista de modelos para toda a equipe.')
    expect(pergunta.textContent).not.toMatch(/sempre|definitiv|desfazer/i)
    // O foco começa em "Cancelar": excluir pede o clique de propósito.
    expect(within(painel).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await userEvent.click(within(painel).getByRole('button', { name: 'Excluir modelo' }))

    expect(pedidos).toEqual([{ metodo: 'DELETE', path: '/admin/report-templates/people/t1', body: null }])
    const { toast } = await import('sonner')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Modelo "Telefones da equipe" excluído.'))
    expect(colunas()).toEqual(['name', 'phone'])
    expect(screen.getByRole('option', { name: 'Montado à mão' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Telefones da equipe' })).not.toBeInTheDocument()
  })

  it('o 403 de quem não pode mexer no modelo aparece como veio', async () => {
    simularModelos([modelo()], () => Promise.reject(new ApiError(403, 'Este modelo tem campos que você não pode exportar: RG.')))
    abrir()
    await abrirModeloDaEquipe()
    await userEvent.click(screen.getByRole('button', { name: 'Excluir o modelo "Telefones da equipe"' }))
    await userEvent.click(screen.getByRole('button', { name: 'Excluir modelo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Este modelo tem campos que você não pode exportar: RG.')
  })

  it('exportar com o modelo da equipe manda o nome dele, com "(alterado)" se mudou, e lembra o modelo', async () => {
    simularModelos([modelo()])
    abrir()
    await abrirModeloDaEquipe()
    await userEvent.click(screen.getByRole('button', { name: 'Tirar Telefone' }))
    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF (123)' }))
    expect(exportarRelatorio).toHaveBeenCalledWith(
      'people', { search: 'silva', activeMember: true }, 'pdf',
      expect.objectContaining({ fields: ['name'], modelo: 'Telefones da equipe (alterado)' }),
    )
    expect(JSON.parse(localStorage.getItem('sr:relatorio:people')!))
      .toEqual({ fields: ['name'], format: 'pdf', modelo: 'equipe:t1', alterado: true })
  })

  it('o último usado, sem mexer, reabre o modelo da equipe como ele está agora', async () => {
    localStorage.setItem('sr:relatorio:people', JSON.stringify({
      fields: ['name', 'phone'], format: 'csv', modelo: 'equipe:t1', alterado: false,
    }))
    // Alguém da equipe pôs o e-mail no modelo depois.
    simularModelos([modelo({ fields: ['name', 'phone', 'email'] })])
    abrir()
    await waitFor(() => expect(colunas()).toEqual(['name', 'phone', 'email']))
    expect(screen.getByLabelText('Modelo')).toHaveValue('equipe:t1')
    expect(screen.getByRole('radio', { name: 'Planilha CSV' })).toBeChecked()
  })

  it('o último usado com mudança reabre as colunas guardadas, como "(alterado)"', async () => {
    localStorage.setItem('sr:relatorio:people', JSON.stringify({
      fields: ['phone', 'name'], format: 'pdf', modelo: 'equipe:t1', alterado: true,
    }))
    simularModelos([modelo()])
    abrir()
    expect(await screen.findByRole('option', { name: 'Telefones da equipe (alterado)' })).toBeInTheDocument()
    expect(colunas()).toEqual(['phone', 'name'])
  })

  it('o último usado de um modelo da equipe excluído abre com as colunas guardadas, sem quebrar', async () => {
    localStorage.setItem('sr:relatorio:people', JSON.stringify({
      fields: ['phone', 'email'], format: 'pdf', modelo: 'equipe:excluido', alterado: false,
    }))
    simularModelos([modelo()])
    abrir()
    await screen.findByRole('option', { name: 'Telefones da equipe' })
    expect(screen.getByRole('option', { name: 'Montado à mão' })).toBeInTheDocument()
    expect(colunas()).toEqual(['phone', 'email'])
    expect(screen.getByRole('button', { name: 'Baixar PDF (123)' })).toBeEnabled()
  })

  it('back velho ou sem a permissão da fonte (404/403): só os de fábrica e nada de salvar', async () => {
    simularModelos(new ApiError(404, 'Route GET:/admin/report-templates/people not found'))
    abrir()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Salvar como modelo…' })).not.toBeInTheDocument())
    expect(screen.queryByRole('group', { name: 'Modelos da equipe' })).not.toBeInTheDocument()
    expect(screen.queryByText(/não carregaram/)).not.toBeInTheDocument()
  })

  it('a lista que não carrega deixa só os de fábrica e oferece tentar de novo', async () => {
    simularModelos(new ApiError(500, 'HTTP 500'))
    abrir()
    expect(await screen.findByText(/Os modelos da equipe não carregaram\./)).toBeInTheDocument()
    expect(screen.getByLabelText('Modelo')).toHaveValue('padrao')
    simularModelos([modelo()])
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('option', { name: 'Telefones da equipe' })).toBeInTheDocument()
    expect(screen.queryByText(/não carregaram/)).not.toBeInTheDocument()
  })

  it('inscrições: o modelo da equipe liga "Só confirmadas", e salvar manda o confirmed', async () => {
    const pedidos = simularModelos(
      [modelo({ dataset: 'registrations', name: 'Presença', fields: ['ordinal', 'name'], confirmed: true, format: null })],
      p => json(modelo({
        id: 'novo', dataset: 'registrations', name: p.body!.name, fields: p.body!.fields, confirmed: p.body!.confirmed,
      })),
    )
    abrir({
      dataset: 'registrations', catalog: catalogoInscricoes(), selectedIds: undefined,
      filters: { courseIds: ['c1'] }, total: 12, filtered: false,
    })
    await abrirModeloDaEquipe('Presença')
    const confirmadas = screen.getByRole('checkbox', { name: 'Só confirmadas' })
    expect(confirmadas).toBeChecked()
    // Sem formato no modelo, o formato não muda.
    expect(screen.getByRole('radio', { name: 'Planilha CSV' })).toBeChecked()
    // Desmarcar "Só confirmadas" é mudança do modelo.
    await userEvent.click(confirmadas)
    expect(screen.getByRole('button', { name: 'Salvar alterações no modelo' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Salvar como modelo…' }))
    expect(screen.getByText('O modelo fica para toda a equipe, com as colunas, o formato e o "Só confirmadas" de agora.'))
      .toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Nome do modelo'), 'Todas as inscrições{Enter}')
    expect(pedidos[0]).toEqual({
      metodo: 'POST', path: '/admin/report-templates/registrations',
      body: { name: 'Todas as inscrições', fields: ['ordinal', 'name'], format: 'csv', confirmed: false },
    })
  })

  it('no celular: grupo da equipe, autoria e botões de 44 px', async () => {
    celular = true
    simularModelos([modelo()])
    abrir()
    await abrirModeloDaEquipe()
    expect(screen.getByRole('button', { name: 'Salvar como modelo…' })).toHaveClass('h-11')
    expect(screen.getByRole('button', { name: 'Renomear o modelo "Telefones da equipe"' })).toHaveClass('size-11')
    expect(screen.getByRole('button', { name: 'Excluir o modelo "Telefones da equipe"' })).toHaveClass('size-11')
    expect(screen.getByText('Modelo da equipe, criado por gestor em 10/11/2026.')).toBeInTheDocument()
    // O "Imprimir" não existe no celular: o PDF do modelo fica marcado.
    expect(screen.getByRole('radio', { name: 'PDF' })).toBeChecked()
  })
})
