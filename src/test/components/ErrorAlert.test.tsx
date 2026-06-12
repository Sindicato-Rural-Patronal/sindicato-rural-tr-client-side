import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorAlert } from '@/components/ErrorAlert'

describe('ErrorAlert', () => {
  it('não renderiza quando message é null', () => {
    const { container } = render(<ErrorAlert message={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza a mensagem de erro', () => {
    render(<ErrorAlert message="Erro inesperado" />)
    expect(screen.getByText('Erro inesperado')).toBeInTheDocument()
  })

  it('não renderiza quando message é string vazia', () => {
    const { container } = render(<ErrorAlert message="" />)
    expect(container).toBeEmptyDOMElement()
  })
})
