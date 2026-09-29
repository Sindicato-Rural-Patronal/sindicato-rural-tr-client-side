import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PersonField } from '@/components/cadastro/person-form-fields'
import {
  PERSON_FIELD_NAMES, PERSON_LABELS,
  type PersonFieldName, type PersonFieldsCtx, type PersonFormValues,
} from '@/lib/person-fields'

// Os campos do cadastro de pessoa viviam duplicados em duas telas de JSX
// escrito à mão, e a duplicação já custou um bug (a Situação do associado
// existia só no cadastro novo, e não havia como mudá-la depois). Agora existem
// uma vez, e é aqui que a fiação de cada um é conferida: digitar no campo tem
// de chamar `set` com a CHAVE certa — trocar duas chaves de lugar é o erro que
// um refactor assim comete, e ele não aparece no type check.

const VAZIO: PersonFormValues = {
  name: '', nickname: '', email: '',
  phone: '', phone2: '', phone3: '',
  cpf: '', rg: '', rgIssuer: '', rgIssuedAt: '',
  birthDate: '', driverLicense: '', driverLicenseCategory: '',
  birthPlace: '', nationality: '', gender: '', ethnicity: '', maritalStatus: '',
  educationLevel: '', functionalCategory: '', cadPro: [], familyIncome: '',
  specialNeeds: false,
  memberType: '', memberStatus: '', memberClassification: '',
  memberSince: '', membershipValidUntil: '',
  memberNotes: '', memberNotesNumber: '',
  boardMember: false, boardPosition: '',
}

const set = vi.fn()

function ctx(over: Partial<PersonFieldsCtx> = {}): PersonFieldsCtx {
  return { values: VAZIO, set, idPrefix: 'teste-', ...over }
}

/** O campo de um FieldRow, achado pelo id que o componente injeta. */
const campoDe = (nome: string) =>
  document.getElementById('teste-' + nome) as HTMLInputElement | HTMLSelectElement

beforeEach(() => vi.clearAllMocks())

describe('PersonField — todos os campos', () => {
  it('a lista de campos cobre os dois formulários', () => {
    expect(PERSON_FIELD_NAMES.length).toBeGreaterThanOrEqual(30)
  })


  it.each(PERSON_FIELD_NAMES)('%s tem rótulo e aparece na tela', campo => {
    render(<PersonField campo={campo} ctx={ctx()} />)
    expect(PERSON_LABELS[campo].trim()).not.toBe('')
    expect(screen.getByText(PERSON_LABELS[campo])).toBeInTheDocument()
  })
})

// Campos de texto simples: digitar chama set com a própria chave, em caixa alta.
const TEXTO: PersonFieldName[] = [
  'name', 'nickname', 'rgIssuer', 'birthPlace', 'nationality',
  'functionalCategory', 'memberClassification', 'memberNotes', 'boardPosition',
]

describe('fiação dos campos de texto', () => {
  it.each(TEXTO)('%s grava na própria chave, em caixa alta sem acento', campo => {
    render(<PersonField campo={campo} ctx={ctx()} />)
    fireEvent.change(campoDe(campo), { target: { value: 'joão' } })
    expect(set).toHaveBeenCalledWith(campo, 'JOAO')
  })
})

describe('campos com máscara', () => {
  it('telefone recebe a máscara e vai para a própria chave', () => {
    for (const campo of ['phone', 'phone2', 'phone3'] as const) {
      set.mockClear()
      const { unmount } = render(<PersonField campo={campo} ctx={ctx()} />)
      fireEvent.change(campoDe(campo), { target: { value: '44999990001' } })
      expect(set).toHaveBeenCalledWith(campo, '(44) 99999-0001')
      unmount()
    }
  })

  it('CPF recebe a máscara', () => {
    render(<PersonField campo="cpf" ctx={ctx()} />)
    fireEvent.change(campoDe('cpf'), { target: { value: '11144477735' } })
    expect(set).toHaveBeenCalledWith('cpf', '111.444.777-35')
  })

  it('e-mail NÃO vai para caixa alta', () => {
    render(<PersonField campo="email" ctx={ctx()} />)
    fireEvent.change(campoDe('email'), { target: { value: 'Maria@Email.com' } })
    expect(set).toHaveBeenCalledWith('email', 'Maria@Email.com')
  })

  it('nº de cooperado vai como digitado, sem máscara nem caixa alta', () => {
    render(<PersonField campo="memberNotesNumber" ctx={ctx()} />)
    fireEvent.change(campoDe('memberNotesNumber'), { target: { value: 'abc123' } })
    expect(set).toHaveBeenCalledWith('memberNotesNumber', 'abc123')
  })

  it('renda familiar recebe a máscara de dinheiro', () => {
    render(<PersonField campo="familyIncome" ctx={ctx()} />)
    fireEvent.change(campoDe('familyIncome'), { target: { value: '150000' } })
    expect(set).toHaveBeenCalledWith('familyIncome', expect.stringContaining('1.500,00'))
  })

  it('apagar a CNH limpa a categoria, que ficaria órfã', () => {
    render(<PersonField campo="driverLicense" ctx={ctx({ values: { ...VAZIO, driverLicense: '12345678901' } })} />)
    fireEvent.change(campoDe('driverLicense'), { target: { value: '' } })
    expect(set).toHaveBeenCalledWith('driverLicense', '')
    expect(set).toHaveBeenCalledWith('driverLicenseCategory', '')
  })
})

describe('campos de lista', () => {
  it('situação do associado oferece Ativo e Inativo', () => {
    render(<PersonField campo="memberStatus" ctx={ctx()} />)
    expect(screen.getByRole('option', { name: 'Ativo' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Inativo' })).toBeInTheDocument()
    fireEvent.change(campoDe('memberStatus'), { target: { value: 'INACTIVE' } })
    expect(set).toHaveBeenCalledWith('memberStatus', 'INACTIVE')
  })

  it('tipo de membro usa a lista fixa e grava o valor, não o rótulo', () => {
    render(<PersonField campo="memberType" ctx={ctx()} />)
    fireEvent.change(campoDe('memberType'), { target: { value: 'PRODUTOR RURAL' } })
    expect(set).toHaveBeenCalledWith('memberType', 'PRODUTOR RURAL')
  })

  it('gênero, etnia, estado civil e escolaridade gravam na própria chave', () => {
    for (const [campo, valor] of [
      ['gender', 'FEMALE'], ['ethnicity', 'MIXED'],
      ['maritalStatus', 'MARRIED'], ['educationLevel', 'COMPLETE_HIGHER'],
    ] as const) {
      set.mockClear()
      const { unmount } = render(<PersonField campo={campo} ctx={ctx()} />)
      fireEvent.change(campoDe(campo), { target: { value: valor } })
      expect(set).toHaveBeenCalledWith(campo, valor)
      unmount()
    }
  })
})

describe('caixas de marcar', () => {
  it.each(['specialNeeds', 'boardMember'] as const)('%s alterna e grava booleano', campo => {
    render(<PersonField campo={campo} ctx={ctx()} />)
    fireEvent.click(screen.getByLabelText(PERSON_LABELS[campo]))
    expect(set).toHaveBeenCalledWith(campo, true)
  })
})

describe('modos da tela', () => {
  it('modo leitura desabilita o campo, mas o mantém legível', () => {
    render(<PersonField campo="name" ctx={ctx({ disabled: true })} />)
    const campo = campoDe('name')
    expect(campo).toBeDisabled()
    // Sem isto o Input fica a 50% de opacidade e a ficha não se lê.
    expect(campo.className).toContain('disabled:opacity-100')
  })

  it('modo leitura esconde a dica da CIN (é instrução de quem digita)', () => {
    const { rerender } = render(<PersonField campo="cpf" ctx={ctx()} />)
    expect(screen.getByText(/identidade nova/i)).toBeInTheDocument()
    rerender(<PersonField campo="cpf" ctx={ctx({ disabled: true })} />)
    expect(screen.queryByText(/identidade nova/i)).toBeNull()
  })

  it('obrigatório marca o rótulo com asterisco', () => {
    render(<PersonField campo="name" ctx={ctx()} required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('destaque do "Completar cadastro" aparece só no campo apontado', () => {
    render(<PersonField campo="gender" ctx={ctx({ highlight: c => c === 'gender' })} />)
    expect(screen.getByText(PERSON_LABELS.gender).className).toContain('amber')
  })

  it('erro de validação aparece e é ligado ao campo pelo aria', () => {
    render(<PersonField campo="cpf" ctx={ctx({ errors: { cpf: 'CPF inválido.' } })} />)
    expect(screen.getByRole('alert')).toHaveTextContent('CPF inválido.')
    expect(campoDe('cpf')).toHaveAttribute('aria-invalid', 'true')
    expect(campoDe('cpf')).toHaveAttribute('aria-describedby', 'teste-cpf-erro')
  })

  it('o prefixo do id separa as duas telas', () => {
    render(<PersonField campo="name" ctx={ctx({ idPrefix: 'pessoa-' })} />)
    expect(document.getElementById('pessoa-name')).toBeInTheDocument()
  })
})
