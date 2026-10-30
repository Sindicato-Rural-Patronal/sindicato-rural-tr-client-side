import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumeroField } from '@/components/financeiro/NumeroField'
import { NumeroSaltoDialog } from '@/components/financeiro/NumeroSaltoDialog'

/** O campo controlado, como o formulário o usa. */
function Campo(props: Partial<React.ComponentProps<typeof NumeroField>> & { inicial?: string }) {
  const { inicial = '', ...resto } = props
  const [v, setV] = useState(inicial)
  return <NumeroField value={v} onChange={setV} editando={false} {...resto} />
}

describe('NumeroField: lançamento novo', () => {
  it('vazio diz "Automático (próximo: 128)" com o próximo que a API informou', () => {
    render(<Campo proximo={128} />)
    expect(screen.getByLabelText('Nº')).toHaveAttribute('placeholder', 'Automático (próximo: 128)')
    expect(screen.getByText('Deixe vazio para o número automático.')).toBeInTheDocument()
  })

  it('sem o próximo carregado diz só "Automático"', () => {
    render(<Campo />)
    expect(screen.getByLabelText('Nº')).toHaveAttribute('placeholder', 'Automático')
  })

  it('só aceita dígitos (letras e pontos são tirados do que se digita)', async () => {
    render(<Campo proximo={5} />)
    const campo = screen.getByLabelText('Nº')
    await userEvent.type(campo, '1a2.3')
    expect(campo).toHaveValue('123')
  })

  it('não passa de 10 dígitos', async () => {
    render(<Campo />)
    const campo = screen.getByLabelText('Nº')
    await userEvent.type(campo, '123456789012')
    expect(campo).toHaveValue('1234567890')
  })

  it('o teclado do celular é o numérico', () => {
    render(<Campo />)
    expect(screen.getByLabelText('Nº')).toHaveAttribute('inputmode', 'numeric')
  })
})

describe('NumeroField: edição', () => {
  it('vem com o número atual e diz que a correção fica na auditoria', () => {
    render(<Campo editando inicial="12" proximo={128} />)
    expect(screen.getByLabelText('Nº')).toHaveValue('12')
    expect(screen.getByText('A correção do número fica na auditoria.')).toBeInTheDocument()
  })

  it('apagado, não diz "Automático": editar não tem número automático', async () => {
    render(<Campo editando inicial="12" proximo={128} />)
    const campo = screen.getByLabelText('Nº')
    await userEvent.clear(campo)
    expect(campo).toHaveAttribute('placeholder', 'Digite o Nº')
  })
})

describe('NumeroField: o erro fica embaixo do campo', () => {
  it('mostra o texto da API como veio, avisa o leitor de tela e marca o campo', () => {
    render(<Campo erro="O número 123 já é de outro lançamento." />)
    const campo = screen.getByLabelText('Nº')
    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent('O número 123 já é de outro lançamento.')
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(campo).toHaveAttribute('aria-describedby', alerta.id)
  })

  it('sem erro, não há alerta e o campo não está marcado', () => {
    render(<Campo />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByLabelText('Nº')).not.toHaveAttribute('aria-invalid')
  })
})

describe('NumeroSaltoDialog', () => {
  const salto = { de: 128, para: 5000, depois: 5001 }

  it('fechado (sem salto): nada na tela', () => {
    render(<NumeroSaltoDialog salto={null} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('aberto: a pergunta da decisão 005 e os dois botões', () => {
    render(<NumeroSaltoDialog salto={salto} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Esse número pula do 128 para o 5000. Os próximos automáticos continuam do 5001.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Corrigir o número' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Usar o Nº 5000' })).toBeInTheDocument()
  })

  it('"Usar o Nº 5000" confirma; "Corrigir o número" volta sem confirmar', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<NumeroSaltoDialog salto={salto} onConfirm={onConfirm} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Usar o Nº 5000' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Corrigir o número' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
