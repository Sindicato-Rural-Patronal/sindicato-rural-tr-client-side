import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PersonPhoto } from '@/components/cadastro/PersonPhoto'

describe('PersonPhoto', () => {
  it('com foto: mostra grande e abre ampliada ao clicar', () => {
    render(<PersonPhoto src="https://x.test/maria.jpg" name="MARIA DA SILVA" />)
    const foto = screen.getByAltText('Foto de MARIA DA SILVA')
    // 128 px no celular, 160 no computador
    expect(foto.className).toContain('size-32')
    expect(foto.className).toContain('sm:size-40')
    expect(screen.queryByAltText('Foto ampliada de MARIA DA SILVA')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ampliar a foto de MARIA DA SILVA' }))
    expect(screen.getByAltText('Foto ampliada de MARIA DA SILVA')).toHaveAttribute('src', 'https://x.test/maria.jpg')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('o diálogo fecha com Esc', () => {
    render(<PersonPhoto src="https://x.test/maria.jpg" name="MARIA" />)
    fireEvent.click(screen.getByRole('button', { name: /Ampliar/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sem foto: só o ícone, sem botão para ampliar', () => {
    render(<PersonPhoto src={null} name="MARIA" />)
    expect(screen.getByRole('img', { name: 'Sem foto' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('nome vazio não quebra o texto do botão', () => {
    render(<PersonPhoto src="https://x.test/a.jpg" name="  " />)
    expect(screen.getByRole('button', { name: 'Ampliar a foto de a pessoa' })).toBeInTheDocument()
  })
})
