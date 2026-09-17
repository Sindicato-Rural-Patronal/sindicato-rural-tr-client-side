import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { DatePicker } from '@/components/ui/date-picker'

// Formulário controlado de verdade: o valor volta para o DatePicker.
function Controlled({ initial = '', onValue }: { initial?: string; onValue: (v: string) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <DatePicker id="d" value={value} onChange={v => { setValue(v); onValue(v) }} />
      <button type="button" onClick={() => setValue('2026-01-05')}>fora</button>
    </>
  )
}

const input = () => screen.getByRole('textbox') as HTMLInputElement

describe('DatePicker', () => {
  it('mostra o valor como dd/mm/aaaa', () => {
    render(<Controlled initial="1952-05-12" onValue={() => {}} />)
    expect(input().value).toBe('12/05/1952')
  })

  it('digitar a data completa envia AAAA-MM-DD', () => {
    const onValue = vi.fn()
    render(<Controlled onValue={onValue} />)
    fireEvent.change(input(), { target: { value: '12051952' } })
    expect(input().value).toBe('12/05/1952')
    expect(onValue).toHaveBeenLastCalledWith('1952-05-12')
  })

  it('apagar o texto limpa o valor', () => {
    const onValue = vi.fn()
    render(<Controlled initial="1952-05-12" onValue={onValue} />)
    fireEvent.change(input(), { target: { value: '' } })
    expect(onValue).toHaveBeenLastCalledWith('')
    expect(input().value).toBe('')
  })

  it('data inválida não apaga a anterior: marca, e ao sair volta com aviso', () => {
    const onValue = vi.fn()
    render(<Controlled initial="2026-02-10" onValue={onValue} />)
    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: '31022026' } })
    expect(input().value).toBe('31/02/2026')
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(onValue).not.toHaveBeenCalled()
    fireEvent.blur(input())
    expect(input().value).toBe('10/02/2026')
    expect(screen.getByRole('alert')).toHaveTextContent('Data inválida. Mantida 10/02/2026.')
  })

  it('incompleto: não envia nada enquanto digita; ao sair, campo vazio volta vazio com aviso', () => {
    const onValue = vi.fn()
    render(<Controlled onValue={onValue} />)
    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: '1205' } })
    expect(input()).not.toHaveAttribute('aria-invalid')
    expect(onValue).not.toHaveBeenCalled()
    fireEvent.blur(input())
    expect(input().value).toBe('')
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('O campo ficou vazio')
    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: '12052026' } })
    expect(onValue).toHaveBeenLastCalledWith('2026-05-12')
    expect(input()).not.toHaveAttribute('aria-invalid')
  })

  it('valor trocado por fora atualiza o texto', () => {
    render(<Controlled initial="1952-05-12" onValue={() => {}} />)
    fireEvent.click(screen.getByText('fora'))
    expect(input().value).toBe('05/01/2026')
  })

  it('desabilitado trava o campo e o calendário', () => {
    render(<DatePicker value="" onChange={() => {}} disabled />)
    expect(input()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Abrir calendário' })).toBeDisabled()
  })
})
