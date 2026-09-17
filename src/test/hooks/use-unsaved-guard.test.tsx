import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeaveConfirmHost } from '@/components/confirm-close-dialog'
import {
  allowLeave,
  answerLeaveConfirm,
  requestLeaveConfirm,
  shouldBlockLeave,
} from '@/hooks/use-unsaved-guard'

const nav = (from: string, next: string) => ({ current: { pathname: from }, next: { pathname: next } })

// Espera os setTimeout(0) que zeram a liberação.
const flushTimers = () => new Promise(resolve => setTimeout(resolve, 5))

afterEach(async () => {
  answerLeaveConfirm(false)
  await flushTimers()
  vi.restoreAllMocks()
})

describe('useUnsavedGuard — regras de bloqueio', () => {
  it('trocar só filtros/abas (mesmo caminho) não pergunta', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    await expect(shouldBlockLeave(nav('/admin/usuarios', '/admin/usuarios'))).resolves.toBe(false)
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('sem host montado usa window.confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    await expect(shouldBlockLeave(nav('/admin/convenios/1', '/admin/cursos'))).resolves.toBe(true)
    await flushTimers()
    confirmSpy.mockReturnValueOnce(true)
    await expect(shouldBlockLeave(nav('/admin/convenios/1', '/admin/cursos'))).resolves.toBe(false)
    expect(confirmSpy).toHaveBeenCalledTimes(2)
  })

  it('allowLeave libera a próxima navegação sem perguntar', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    allowLeave()
    await expect(shouldBlockLeave(nav('/admin/usuarios/novo', '/admin/usuarios/1'))).resolves.toBe(false)
    expect(confirmSpy).not.toHaveBeenCalled()
    // Consumida: a navegação seguinte volta a perguntar.
    await flushTimers()
    await expect(shouldBlockLeave(nav('/admin/usuarios/1', '/admin/cursos'))).resolves.toBe(true)
    expect(confirmSpy).toHaveBeenCalledTimes(1)
  })

  it('depois de "sair", outro formulário da mesma navegação não pergunta de novo', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await expect(shouldBlockLeave(nav('/admin/x', '/admin/y'))).resolves.toBe(false)
    await expect(shouldBlockLeave(nav('/admin/x', '/admin/y'))).resolves.toBe(false)
    expect(confirmSpy).toHaveBeenCalledTimes(1)
  })
})

describe('LeaveConfirmHost', () => {
  it('mostra o diálogo do app e responde conforme o botão', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    const user = userEvent.setup()
    render(<LeaveConfirmHost />)

    let blocked: Promise<boolean> = Promise.resolve(false)
    act(() => {
      blocked = shouldBlockLeave(nav('/admin/configuracoes', '/admin/cursos'))
    })
    expect(await screen.findByText('Sair sem salvar?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continuar editando' }))
    await expect(blocked).resolves.toBe(true)

    act(() => {
      blocked = shouldBlockLeave(nav('/admin/configuracoes', '/admin/cursos'))
    })
    await user.click(await screen.findByRole('button', { name: 'Sair sem salvar' }))
    await expect(blocked).resolves.toBe(false)
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('uma segunda pergunta enquanto a primeira está aberta fica na tela', async () => {
    render(<LeaveConfirmHost />)
    let first: Promise<boolean> = Promise.resolve(false)
    act(() => {
      first = requestLeaveConfirm()
    })
    await expect(requestLeaveConfirm()).resolves.toBe(false)
    act(() => answerLeaveConfirm(true))
    await expect(first).resolves.toBe(true)
  })

  it('desmontar o host com pergunta aberta não prende a navegação', async () => {
    const { unmount } = render(<LeaveConfirmHost />)
    let pending: Promise<boolean> = Promise.resolve(true)
    act(() => {
      pending = requestLeaveConfirm()
    })
    unmount()
    await expect(pending).resolves.toBe(false)
  })
})
