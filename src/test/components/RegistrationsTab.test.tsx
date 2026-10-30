import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Registration } from '@/hooks/useAdmin'
import { brasiliaToday } from '@/utils/course-status'
import { TooltipProvider } from '@/components/ui/tooltip'
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

const { RegistrationsTab } = await import('@/components/courses/RegistrationsTab')

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

function simular(regs: Registration[], curso: { startDate: string } = { startDate: '2026-12-01' }) {
  const pagina = { data: regs, total: regs.length, page: 1, limit: 20, totalPages: 1 }
  apiFetch.mockImplementation((path: string) => {
    const corpo = (() => {
      if (path === '/admin/me') return { permissions: ['READ_COURSE', 'UPDATE_COURSE', 'READ_USER'] }
      if (path.startsWith('/admin/courses/c1/registrations')) return pagina
      if (path === '/admin/courses/c1') return { id: 'c1', title: 'Curso de Soja', status: 'PUBLIC', instructors: [], ...curso }
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
