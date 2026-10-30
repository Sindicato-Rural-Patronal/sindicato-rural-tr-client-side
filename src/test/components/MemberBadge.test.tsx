import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemberBadge } from '@/components/MemberBadge'
import { PersonNameCell } from '@/components/cadastro/PersonNameCell'
import { PersonHeading } from '@/components/cadastro/PersonHeading'

// Datas longe de hoje: o teste não depende do relógio.
const EM_DIA = { memberStatus: 'ACTIVE' as const, membershipValidUntil: '2099-12-31T00:00:00.000Z' }
const SEM_VALIDADE = { memberStatus: 'ACTIVE' as const, membershipValidUntil: null }
const VENCIDO = { memberStatus: 'ACTIVE' as const, membershipValidUntil: '2000-01-01T00:00:00.000Z' }
const INATIVO = { memberStatus: 'INACTIVE' as const, membershipValidUntil: null }
const SEM_SITUACAO = { memberStatus: null, membershipValidUntil: null }

describe('MemberBadge', () => {
  it('aparece para quem está ATIVO, com validade em dia ou sem validade', () => {
    const { rerender } = render(<MemberBadge person={EM_DIA} />)
    expect(screen.getByTestId('member-badge')).toHaveTextContent('Associado')
    rerender(<MemberBadge person={SEM_VALIDADE} />)
    expect(screen.getByTestId('member-badge')).toBeInTheDocument()
  })

  it('não aparece para validade vencida, inativo ou sem situação', () => {
    for (const person of [VENCIDO, INATIVO, SEM_SITUACAO, {}]) {
      const { container, unmount } = render(<MemberBadge person={person} />)
      expect(container).toBeEmptyDOMElement()
      unmount()
    }
  })

  it('não encolhe nem quebra o texto (quem trunca é o nome)', () => {
    render(<MemberBadge person={EM_DIA} />)
    const selo = screen.getByTestId('member-badge')
    expect(selo).toHaveClass('shrink-0')
    expect(selo).toHaveClass('whitespace-nowrap')
  })
})

describe('PersonNameCell (coluna Nome da lista de pessoas)', () => {
  const base = { name: 'JOSE DA SILVA', email: 'jose@example.com', avatar: null }

  it('mostra o selo junto do nome de quem é associado em dia', () => {
    render(<PersonNameCell person={{ ...base, ...EM_DIA }} />)
    const nome = screen.getByText('JOSE DA SILVA')
    expect(nome.parentElement).toContainElement(screen.getByTestId('member-badge'))
  })

  it('não mostra o selo para quem não é associado em dia', () => {
    for (const situacao of [VENCIDO, INATIVO, SEM_SITUACAO]) {
      const { unmount } = render(<PersonNameCell person={{ ...base, ...situacao }} />)
      expect(screen.queryByTestId('member-badge')).not.toBeInTheDocument()
      expect(screen.getByText('JOSE DA SILVA')).toBeInTheDocument()
      unmount()
    }
  })

  it('o nome continua com reticências e o texto inteiro no title, com ou sem selo', () => {
    const comprido = 'MARIA APARECIDA DE FATIMA DOS SANTOS OLIVEIRA PEREIRA DE ALMEIDA'
    for (const situacao of [EM_DIA, INATIVO]) {
      const { unmount } = render(<PersonNameCell person={{ ...base, name: comprido, ...situacao }} />)
      const nome = screen.getByText(comprido)
      expect(nome).toHaveClass('truncate')
      expect(nome.parentElement).toHaveClass('min-w-0')
      expect(nome).toHaveAttribute('title', comprido)
      unmount()
    }
  })

  it('o e-mail do celular continua embaixo do nome', () => {
    render(<PersonNameCell person={{ ...base, ...EM_DIA }} />)
    const email = screen.getByText('jose@example.com')
    expect(email).toHaveClass('md:hidden')
    expect(email).toHaveClass('truncate')
  })

  it('sem e-mail não desenha a linha do e-mail', () => {
    render(<PersonNameCell person={{ ...base, email: null, ...EM_DIA }} />)
    expect(screen.queryByText('jose@example.com')).not.toBeInTheDocument()
  })
})

describe('PersonHeading (topo da ficha)', () => {
  it('mostra o selo ao lado do nome de quem é associado em dia', () => {
    render(<PersonHeading person={{ name: 'JOSE DA SILVA', ...EM_DIA }} />)
    const titulo = screen.getByRole('heading', { level: 1, name: 'JOSE DA SILVA' })
    expect(titulo.parentElement).toContainElement(screen.getByTestId('member-badge'))
  })

  it('não mostra o selo para inativo ou com validade vencida', () => {
    for (const situacao of [VENCIDO, INATIVO, SEM_SITUACAO]) {
      const { unmount } = render(<PersonHeading person={{ name: 'JOSE DA SILVA', ...situacao }} />)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('JOSE DA SILVA')
      expect(screen.queryByTestId('member-badge')).not.toBeInTheDocument()
      unmount()
    }
  })

  it('nome comprido continua limitado a 3 linhas, com o texto inteiro no title', () => {
    const comprido = 'MARIA APARECIDA DE FATIMA DOS SANTOS OLIVEIRA PEREIRA DE ALMEIDA'
    render(<PersonHeading person={{ name: comprido, ...EM_DIA }} />)
    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo).toHaveClass('line-clamp-3')
    expect(titulo).toHaveAttribute('title', comprido)
  })
})
