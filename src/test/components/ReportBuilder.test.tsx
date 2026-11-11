import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/lib/api'
import { catalogoInscricoes, catalogoPessoas } from '../lib/export-catalog.fixture'
import type { ReportBuilderProps } from '@/components/export/ReportBuilder'
import '@/i18n'

// "Montar relatório" (decisão 006): no computador, diálogo de duas colunas;
// no celular, folha de altura cheia com ↑↓ de 44 px e sem "Imprimir".

let celular = false
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => celular }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const downloadExport = vi.fn()
vi.mock('@/lib/export', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/export')>()),
  downloadExport: (...args: unknown[]) => downloadExport(...args),
}))

const { ReportBuilder } = await import('@/components/export/ReportBuilder')

const onOpenChange = vi.fn()

function abrir(over: Partial<ReportBuilderProps> = {}) {
  return render(
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
    />,
  )
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
  downloadExport.mockResolvedValue(123)
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

    expect(downloadExport).toHaveBeenCalledWith(
      'people',
      { search: 'silva', activeMember: true },
      'pdf',
      expect.objectContaining({ fields: ['name', 'cpf'], modelo: 'Nome e CPF', print: false, printWindow: null }),
    )
    expect(JSON.parse(localStorage.getItem('sr:relatorio:people')!)).toEqual({ fields: ['name', 'cpf'], format: 'pdf' })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
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
    expect(downloadExport).toHaveBeenCalledWith('people', expect.anything(), 'pdf', expect.objectContaining({ print: true, printWindow: aba }))
    open.mockRestore()
  })

  it('com seleção na lista, começa em "Selecionados" e manda os ids', async () => {
    abrir({ selectedIds: ['p1', 'p2'] })
    expect(screen.getByRole('radio', { name: 'Selecionados (2)' })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Baixar planilha (2)' }))
    expect(downloadExport).toHaveBeenCalledWith('people', { ids: ['p1', 'p2'] }, 'csv', expect.objectContaining({ fields: expect.any(Array) }))
  })

  it('PDF com mais de 2.000 linhas não baixa e diz por quê', async () => {
    abrir({ total: 2500 })
    await userEvent.click(screen.getByRole('radio', { name: 'PDF' }))
    expect(screen.getByRole('button', { name: 'Baixar PDF (2.500)' })).toBeDisabled()
    expect(screen.getByText('O PDF aceita até 2.000 linhas. Baixe a planilha ou use um filtro.')).toBeInTheDocument()
  })

  it('o erro da API aparece no montador, que continua aberto', async () => {
    downloadExport.mockRejectedValue(new ApiError(403, 'Sem permissão para exportar: RG, Endereço.'))
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
    await userEvent.click(screen.getByRole('button', { name: 'Baixar planilha (12)' }))
    expect(downloadExport).toHaveBeenCalledWith(
      'registrations', { courseIds: ['c1'] }, 'csv',
      expect.objectContaining({ fields: ['ordinal', 'name', 'cpf', 'signature'], confirmed: true, modelo: 'Lista de presença' }),
    )
  })
})

describe('montador no celular', () => {
  beforeEach(() => { celular = true })

  it('folha sem "Imprimir" e sem arrastar; ↑↓ com alvo de 44 px', () => {
    abrir()
    expect(screen.getByRole('dialog', { name: 'Montar relatório · Pessoas' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Imprimir' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'PDF' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Arrastar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Subir CPF' })).toHaveClass('size-11')
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveClass('size-11')
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
