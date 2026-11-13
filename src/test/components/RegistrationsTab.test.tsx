import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Registration } from '@/hooks/useAdmin'
import { brasiliaToday } from '@/utils/course-status'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CATALOGO_INSCRICOES_CRU } from '../lib/export-catalog.fixture'
import '@/i18n'

// Inscritos do curso: a API entrega da mais antiga para a mais nova (ordem de
// chegada) e a tela mostra nessa ordem, com a data e a hora de cada inscrição
// no relógio de Brasília.

const apiFetch = vi.fn()
vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// Os PDFs montados no navegador: nada de react-pdf no jsdom.
const downloadListaPresencaPdf = vi.fn()
vi.mock('@/lib/lista-presenca-pdf', () => ({
  downloadListaPresencaPdf: (...args: unknown[]) => downloadListaPresencaPdf(...args),
}))
const downloadFichaPdf = vi.fn()
vi.mock('@/lib/ficha-inscricao-pdf', () => ({ downloadFichaPdf: (...args: unknown[]) => downloadFichaPdf(...args) }))
// O montador de relatórios (menu Planilha) usa o tamanho da tela e o "?" da Ajuda.
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: { children: ReactNode; to: string; search?: { topico?: string } }) =>
    <a href={`${to}?topico=${search?.topico ?? ''}`} {...props}>{children}</a>,
}))
// jsdom não tem ResizeObserver, e a dica (Tooltip) dos botões de cada inscrição mede
// a setinha com ele ao abrir. O clique passa o mouse no botão antes, e a dica abre
// num setTimeout: se ela abrisse antes do clique chegar, o React derrubava a tela
// inteira ("ResizeObserver is not defined") e o clique se perdia (SR-108).
class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverFalso)

const { RegistrationsTab } = await import('@/components/courses/RegistrationsTab')
const { ApiError } = await import('@/lib/api')
const { toast } = await import('sonner')

function inscricao(id: string, name: string, createdAt: string, over: Partial<Registration> = {}): Registration {
  return {
    id, courseId: 'c1', userDataId: `u-${id}`, confirmed: true, attended: null, createdAt,
    userData: {
      id: `u-${id}`, name, email: null, phone: '44999990000', cpf: '52998224725', avatar: null,
      birthDate: '1990-05-10', boardMember: false, boardPosition: null, memberStatus: null,
      membershipValidUntil: null, publicContact: null, companyMemberships: [],
    },
    ficha: null,
    ...over,
  }
}

// Da mais antiga para a mais nova, como o backend manda. De propósito NÃO está em
// ordem alfabética nem do fim para o começo, para pegar qualquer reordenação.
const ORDEM_DE_CHEGADA = [
  inscricao('r1', 'Zilda Alves', '2026-10-29T14:05:00.000Z'),
  inscricao('r2', 'Bruno Lima', '2026-10-30T02:35:00.000Z'),
  inscricao('r3', 'Ana Souza', '2026-10-30T17:35:00.000Z'),
]

function simular(
  regs: Registration[],
  curso: { startDate: string } = { startDate: '2026-12-01' },
  catalogo: unknown = {},
  permissions: string[] = ['READ_COURSE', 'UPDATE_COURSE', 'READ_USER'],
) {
  const pagina = { data: regs, total: regs.length, page: 1, limit: 20, totalPages: 1 }
  apiFetch.mockImplementation((path: string) => {
    const corpo = (() => {
      if (path === '/admin/me') return { permissions }
      if (path.startsWith('/admin/courses/c1/registrations')) return pagina
      if (path === '/admin/courses/c1') return { id: 'c1', title: 'Curso de Soja', status: 'PUBLIC', instructors: [], ...curso }
      if (path === '/admin/export/registrations/catalog') return catalogo
      return {}
    })()
    return Promise.resolve({ json: () => Promise.resolve(corpo) })
  })
}

function abrir(courseStatus = 'PUBLIC') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <RegistrationsTab courseId="c1" eventNumber={null} courseTitle="Curso de Soja" courseStatus={courseStatus} />
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

const NOMES = /^(Zilda Alves|Bruno Lima|Ana Souza)$/

beforeEach(() => {
  vi.clearAllMocks()
})

describe('inscritos do curso: ordem de chegada', () => {
  it('mostra na ordem em que a API entrega: quem se inscreveu primeiro fica no topo', async () => {
    simular(ORDEM_DE_CHEGADA)
    abrir()
    await screen.findByText('Zilda Alves')
    expect(screen.getAllByText(NOMES).map(el => el.textContent)).toEqual(['Zilda Alves', 'Bruno Lima', 'Ana Souza'])
  })

  it('não reordena por nome nem inverte: a ordem recebida é a da tela', async () => {
    const invertida = [...ORDEM_DE_CHEGADA].reverse()
    simular(invertida)
    abrir()
    await screen.findByText('Ana Souza')
    // Se o front reordenasse, sairia sempre igual; aqui sai como veio.
    expect(screen.getAllByText(NOMES).map(el => el.textContent)).toEqual(['Ana Souza', 'Bruno Lima', 'Zilda Alves'])
  })

  it('pede a página sem parâmetro de ordenação (a ordem é do backend)', async () => {
    simular(ORDEM_DE_CHEGADA)
    abrir()
    await screen.findByText('Zilda Alves')
    const pedidosDaLista = apiFetch.mock.calls
      .map(c => c[0] as string)
      .filter(p => p.startsWith('/admin/courses/c1/registrations'))
    expect(pedidosDaLista.length).toBeGreaterThan(0)
    for (const p of pedidosDaLista) expect(p).not.toMatch(/sort|order/i)
  })
})

describe('inscritos do curso: data e hora da inscrição', () => {
  it('mostra dd/mm/aaaa hh:mm no horário de Brasília, na ordem da lista', async () => {
    simular(ORDEM_DE_CHEGADA)
    abrir()
    await screen.findByText('Zilda Alves')
    const horas = document.querySelectorAll('time')
    expect([...horas].map(t => t.textContent)).toEqual([
      '29/10/2026 11:05',
      // 02:35 em UTC ainda é 23:35 do dia anterior em Brasília.
      '29/10/2026 23:35',
      '30/10/2026 14:35',
    ])
    expect(horas[0].getAttribute('datetime')).toBe('2026-10-29T14:05:00.000Z')
  })

  it('a data fica junto da pessoa, com o rótulo "Inscrito em"', async () => {
    simular([ORDEM_DE_CHEGADA[2]])
    abrir()
    const linha = (await screen.findByText('Ana Souza')).closest('.rounded-lg') as HTMLElement
    expect(within(linha).getByText(/Inscrito em/)).toHaveTextContent('Inscrito em 30/10/2026 14:35')
  })

  it('aparece em qualquer largura: nenhum elemento acima da data está escondido no celular', async () => {
    simular([ORDEM_DE_CHEGADA[0]])
    abrir()
    await screen.findByText('Zilda Alves')
    const hora = document.querySelector('time') as HTMLElement
    for (let el: HTMLElement | null = hora; el && el !== document.body; el = el.parentElement) {
      expect(el.classList.contains('hidden')).toBe(false)
    }
  })

  it('inscrição sem data válida não mostra "Invalid Date"', async () => {
    simular([inscricao('r9', 'Carla Dias', 'sem-data')])
    abrir()
    await screen.findByText('Carla Dias')
    expect(document.body.textContent).not.toMatch(/Invalid Date|NaN/)
  })
})

describe('inscritos do curso: selo "Associado"', () => {
  // O mesmo MemberBadge do cadastro (lib/membership.ts): ATIVO e validade vazia ou de hoje em diante.
  function comSocio(id: string, name: string, memberStatus: 'ACTIVE' | 'INACTIVE' | null, membershipValidUntil: string | null) {
    const r = inscricao(id, name, '2026-10-29T14:05:00.000Z')
    return { ...r, userData: { ...r.userData, memberStatus, membershipValidUntil } }
  }

  it('associado em dia: selo "Associado" com a dica "Associado em dia", junto do nome', async () => {
    simular([comSocio('r1', 'Zilda Alves', 'ACTIVE', null), comSocio('r2', 'Bruno Lima', 'ACTIVE', '2099-12-31T00:00:00.000Z')])
    abrir()
    await screen.findByText('Zilda Alves')
    const selos = screen.getAllByText('Associado')
    expect(selos).toHaveLength(2)
    for (const selo of selos) expect(selo).toHaveAttribute('title', 'Associado em dia')
    const linha = screen.getByText('Zilda Alves').closest('.rounded-lg') as HTMLElement
    expect(within(linha).getByText('Associado')).toBeInTheDocument()
  })

  it('sem selo para quem não está em dia: inativo, validade vencida ou sem situação', async () => {
    simular([
      comSocio('r1', 'Zilda Alves', 'INACTIVE', null),
      comSocio('r2', 'Bruno Lima', 'ACTIVE', '2020-01-31T00:00:00.000Z'),
      comSocio('r3', 'Ana Souza', null, null),
    ])
    abrir()
    await screen.findByText('Ana Souza')
    expect(screen.queryByText('Associado')).not.toBeInTheDocument()
  })
})

describe('inscritos do curso: presença continua funcionando', () => {
  it('curso cujo dia de início chegou mostra a presença (é o que cai em Armazenados)', async () => {
    simular(ORDEM_DE_CHEGADA, { startDate: brasiliaToday() })
    abrir('PUBLIC')
    await screen.findByText('Zilda Alves')
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Presente/ }).length).toBe(3))
    expect(screen.getByText(/0 presentes · 0 faltas · 3 sem marcar/)).toBeInTheDocument()
  })

  it('marcar presença manda o PATCH da inscrição', async () => {
    simular(ORDEM_DE_CHEGADA, { startDate: brasiliaToday() })
    abrir('IN_PROGRESS')
    await screen.findByText('Zilda Alves')
    const botoes = await screen.findAllByRole('button', { name: /Presente/ })
    await userEvent.setup().click(botoes[0])
    await waitFor(() => {
      const chamada = apiFetch.mock.calls.find(c => c[0] === '/admin/registrations/r1/attendance')
      expect(chamada).toBeTruthy()
      expect(JSON.parse((chamada![1] as RequestInit).body as string)).toEqual({ attended: true })
    })
  })

  it('curso que ainda não começou não mostra presença', async () => {
    simular(ORDEM_DE_CHEGADA, { startDate: '2099-01-01' })
    abrir('PUBLIC')
    await screen.findByText('Zilda Alves')
    // Dá tempo de o detalhe do curso chegar antes de afirmar a ausência.
    await waitFor(() => expect(apiFetch.mock.calls.some(c => c[0] === '/admin/courses/c1')).toBe(true))
    expect(screen.queryByRole('button', { name: /Presente/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Presença:/)).not.toBeInTheDocument()
  })
})

describe('inscritos do curso: Montar relatório', () => {
  it('o montador diz o nome do curso e conta as confirmadas da lista', async () => {
    simular([
      ORDEM_DE_CHEGADA[0],
      { ...ORDEM_DE_CHEGADA[1], confirmed: false },
      ORDEM_DE_CHEGADA[2],
    ], undefined, CATALOGO_INSCRICOES_CRU)
    abrir()
    await screen.findByText('Zilda Alves')
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Planilha' }))
    await usuario.click(await screen.findByRole('menuitem', { name: 'Montar relatório…' }))
    expect(await screen.findByText('Filtros: Curso: Curso de Soja')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Todos (3)' })).toBeChecked()
    await usuario.click(screen.getByRole('checkbox', { name: 'Só confirmadas (2)' }))
    expect(screen.getByRole('button', { name: 'Baixar planilha (2)' })).toBeEnabled()
  })
})

/**
 * O item "Baixar ficha de inscrição" de uma inscrição. No redesign as ações da linha
 * são o `RowActions`: com telefone, WhatsApp e Ligar ficam à vista e a ficha vai para
 * o menu "Mais ações" da linha.
 */
async function itemDaFicha(usuario: ReturnType<typeof userEvent.setup>, nome = 'Zilda Alves') {
  const acoes = screen.getByRole('group', { name: `Ações da inscrição de ${nome}` })
  await usuario.click(within(acoes).getByRole('button', { name: 'Mais ações' }))
  return screen.findByRole('menuitem', { name: 'Baixar ficha de inscrição' })
}

describe('documentos do curso na auditoria antes de gerar (SR-106)', () => {
  /** A simulação de sempre, mais a ficha da pessoa e o registro do documento (`documento` = a resposta dele). */
  function comDocumentos(documento: () => Promise<unknown> = () => Promise.resolve({ status: 204 })) {
    simular(ORDEM_DE_CHEGADA)
    const base = apiFetch.getMockImplementation()!
    apiFetch.mockImplementation((path: string, init?: RequestInit) => {
      if (path.startsWith('/admin/export/documents/')) return documento()
      const pessoa = path.match(/^\/admin\/users\/u-(r\d)$/)
      if (pessoa) {
        const nome = ORDEM_DE_CHEGADA.find(r => r.id === pessoa[1])!.userData.name
        return Promise.resolve({ json: () => Promise.resolve({ id: `u-${pessoa[1]}`, name: nome }) })
      }
      return base(path, init)
    })
  }

  function registros(kind: string) {
    return apiFetch.mock.calls
      .filter(c => c[0] === `/admin/export/documents/${kind}`)
      .map(c => JSON.parse((c[1] as RequestInit).body as string))
  }

  it('lista de presença: uma linha com o curso e as confirmadas, antes do PDF', async () => {
    const ordem: string[] = []
    comDocumentos(() => { ordem.push('auditoria'); return Promise.resolve({ status: 204 }) })
    downloadListaPresencaPdf.mockImplementation(() => { ordem.push('pdf'); return Promise.resolve() })
    abrir()
    await screen.findByText('Zilda Alves')
    await userEvent.click(screen.getByRole('button', { name: /Lista de presença/ }))
    await waitFor(() => expect(downloadListaPresencaPdf).toHaveBeenCalled())
    expect(ordem).toEqual(['auditoria', 'pdf'])
    expect(registros('lista-presenca')).toEqual([{ linhas: 3, alvo: 'Curso de Soja', ids: ['r1', 'r2', 'r3'] }])
  })

  it('se o registro falhar, a lista não sai e a mensagem aparece', async () => {
    comDocumentos(() => Promise.reject(new ApiError(429, 'Muitos documentos seguidos. Aguarde um minuto e tente de novo.')))
    abrir()
    await screen.findByText('Zilda Alves')
    await userEvent.click(screen.getByRole('button', { name: /Lista de presença/ }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Muitos documentos seguidos. Aguarde um minuto e tente de novo.'))
    expect(downloadListaPresencaPdf).not.toHaveBeenCalled()
  })

  it('"Exportar todas": uma chamada só, com todas as inscrições', async () => {
    comDocumentos()
    downloadFichaPdf.mockResolvedValue(undefined)
    abrir()
    await screen.findByText('Zilda Alves')
    await userEvent.click(screen.getByRole('button', { name: 'Exportar todas' }))
    await waitFor(() => expect(downloadFichaPdf).toHaveBeenCalled())
    expect(registros('ficha-inscricao')).toEqual([
      { linhas: 3, alvo: 'Curso de Soja', ids: ['r1', 'r2', 'r3'], escopo: 'todos' },
    ])
  })

  it('uma ficha: o curso e a pessoa no alvo, a inscrição nos ids', async () => {
    comDocumentos()
    downloadFichaPdf.mockResolvedValue(undefined)
    abrir()
    await screen.findByText('Zilda Alves')
    const usuario = userEvent.setup()
    await usuario.click(await itemDaFicha(usuario))
    await waitFor(() => expect(downloadFichaPdf).toHaveBeenCalled())
    expect(registros('ficha-inscricao')).toEqual([{ linhas: 1, alvo: 'Curso de Soja · Zilda Alves', ids: ['r1'] }])
  })

  it('ficha sem permissão: não gera e diz por quê', async () => {
    comDocumentos(() => Promise.reject(new ApiError(403, 'Forbidden')))
    abrir()
    await screen.findByText('Zilda Alves')
    const usuario = userEvent.setup()
    await usuario.click(await itemDaFicha(usuario))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Você não tem permissão para gerar este documento.'))
    expect(downloadFichaPdf).not.toHaveBeenCalled()
  })
})

describe('ficha de inscrição sem "Visualizar usuários" (SR-111)', () => {
  it('as fichas ficam desligadas, com o motivo na dica, e nada é pedido à API', async () => {
    simular(ORDEM_DE_CHEGADA, undefined, {}, ['READ_COURSE', 'UPDATE_COURSE'])
    abrir()
    await screen.findByText('Zilda Alves')
    // As permissões podem chegar depois da lista: até lá, os botões ficam ligados.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar todas' })).toBeDisabled())
    const usuario = userEvent.setup()
    // A ficha de cada inscrição fica no menu "Mais ações", desligada e com o motivo escrito
    // embaixo do nome (o item desligado não recebe o mouse, então uma dica não apareceria).
    for (const { userData: { name } } of ORDEM_DE_CHEGADA) {
      const item = await itemDaFicha(usuario, name)
      expect(item).toHaveAttribute('aria-disabled', 'true')
      expect(item).toHaveTextContent('Baixar ficha de inscriçãoPede a permissão Visualizar usuários')
      expect(item).toHaveAccessibleDescription('Pede a permissão Visualizar usuários')
      // Clicar no item desligado não faz nada.
      await usuario.click(item)
      await usuario.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Baixar ficha de inscrição' })).not.toBeInTheDocument())
    }

    // No "Exportar todas", o motivo aparece na dica, pelo teclado (o botão desligado não recebe o mouse).
    act(() => { (screen.getByRole('button', { name: 'Exportar todas' }).parentElement as HTMLElement).focus() })
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Pede a permissão Visualizar usuários')

    expect(apiFetch.mock.calls.some(c => String(c[0]).startsWith('/admin/users/'))).toBe(false)
    expect(downloadFichaPdf).not.toHaveBeenCalled()
  })

  it('com a permissão tirada depois de abrir a tela, o 403 da pessoa diz que falta permissão', async () => {
    simular(ORDEM_DE_CHEGADA)
    const base = apiFetch.getMockImplementation()!
    apiFetch.mockImplementation((path: string, init?: RequestInit) =>
      path.startsWith('/admin/users/') ? Promise.reject(new ApiError(403, 'Forbidden')) : base(path, init))
    abrir()
    await screen.findByText('Zilda Alves')
    const usuario = userEvent.setup()
    await usuario.click(await itemDaFicha(usuario))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Você não tem permissão para gerar este documento.'))
    expect(downloadFichaPdf).not.toHaveBeenCalled()
  })
})
