import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PropertiesManager, type PropertiesManagerProps } from '@/components/cadastro/PropertiesManager'

const noop = () => Promise.resolve()
const base: PropertiesManagerProps = {
  properties: [], total: 0, loading: false, primaryId: null,
  onCreate: noop, creating: false, onDelete: noop, deleting: false, onSetPrimary: noop, settingPrimary: false,
}

function renderPM(props: Partial<PropertiesManagerProps>) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PropertiesManager {...base} {...props} />
    </QueryClientProvider>,
  )
}

describe('PropertiesManager', () => {
  it('lista vazia de verdade: "Nenhuma propriedade cadastrada"', () => {
    renderPM({})
    expect(screen.getByText('Nenhuma propriedade cadastrada')).toBeInTheDocument()
  })

  it('lista que não carregou: aviso com "Tentar de novo", sem dizer que está vazia', () => {
    const onRetry = vi.fn()
    renderPM({ loadError: { onRetry } })
    expect(screen.queryByText('Nenhuma propriedade cadastrada')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Adicionar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar as propriedades.')
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
