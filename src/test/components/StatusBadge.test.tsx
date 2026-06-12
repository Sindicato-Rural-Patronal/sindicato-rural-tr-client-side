import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '@/components/StatusBadge'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'admin.courses.form.statusPublic': 'Público',
        'admin.courses.form.statusPrivate': 'Privado',
        'admin.courses.form.statusDraft': 'Não publicado',
      }
      return map[key] ?? key
    },
  }),
}))

describe('StatusBadge', () => {
  it('renderiza PUBLIC', () => {
    render(<StatusBadge status="PUBLIC" />)
    expect(screen.getByText('Público')).toBeInTheDocument()
  })

  it('renderiza PRIVATE', () => {
    render(<StatusBadge status="PRIVATE" />)
    expect(screen.getByText('Privado')).toBeInTheDocument()
  })

  it('renderiza UNPUBLISHED', () => {
    render(<StatusBadge status="UNPUBLISHED" />)
    expect(screen.getByText('Não publicado')).toBeInTheDocument()
  })
})
