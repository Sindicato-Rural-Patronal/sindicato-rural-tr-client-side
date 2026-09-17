import { useEffect } from 'react'
import { useBlocker } from '@tanstack/react-router'

// ─── Confirmação de saída (store imperativo) ────────────────────────────────
// Um hook não renderiza diálogo: o bloqueio pede a confirmação aqui e o
// <LeaveConfirmHost /> (montado uma vez no layout do painel) mostra o diálogo.

let pending: ((leave: boolean) => void) | null = null
let hostCount = 0
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(listener => listener())
}

export function subscribeLeaveConfirm(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** true enquanto há uma pergunta "sair sem salvar?" aberta. */
export function isLeaveConfirmOpen() {
  return pending !== null
}

/** O host avisa que está montado (sem host, cai no window.confirm). */
export function registerLeaveConfirmHost() {
  hostCount++
  return () => {
    hostCount--
    // Sem host não há quem responda: não deixa a navegação presa esperando.
    if (hostCount === 0) answerLeaveConfirm(false)
  }
}

/** Resposta do diálogo: true = sair sem salvar, false = continuar editando. */
export function answerLeaveConfirm(leave: boolean) {
  const resolve = pending
  if (!resolve) return
  pending = null
  emit()
  resolve(leave)
}

/** Pergunta se pode sair. Resolve true para sair. */
export function requestLeaveConfirm(): Promise<boolean> {
  if (hostCount === 0) {
    return Promise.resolve(window.confirm('Você tem alterações não salvas. Sair mesmo assim?'))
  }
  // Outra navegação enquanto a pergunta está aberta (ex.: botão voltar): fica.
  if (pending) return Promise.resolve(false)
  return new Promise(resolve => {
    pending = resolve
    emit()
  })
}

// Quantos formulários com alterações não salvas estão abertos agora.
let activeGuards = 0

/** true se alguma tela aberta tem alterações não salvas (ex.: antes de sair do painel). */
export function hasUnsavedChanges() {
  return activeGuards > 0
}

// ─── Liberação da próxima navegação ─────────────────────────────────────────
// allowLeave() antes de um navigate() pós-salvar/criar/excluir deixa essa
// navegação passar sem perguntar. Vale por poucos segundos, para não liberar
// sem querer uma saída bem depois (quando já pode haver novas alterações).

const ALLOW_WINDOW_MS = 3000
let allowedUntil = 0

export function allowLeave() {
  allowedUntil = Date.now() + ALLOW_WINDOW_MS
}

// Aviso do navegador ao fechar/atualizar a aba — não aparece logo depois de um
// allowLeave() (ex.: sair do painel após já confirmar no diálogo do app).
function shouldWarnOnUnload() {
  return Date.now() > allowedUntil
}

// Usa a liberação na navegação atual. Só zera depois que todos os bloqueios
// dela rodaram (rodam em sequência, só com microtasks entre um e outro), assim
// vários formulários abertos na mesma tela não perguntam cada um.
function consumeAllowance() {
  if (Date.now() > allowedUntil) return false
  setTimeout(() => {
    allowedUntil = 0
  }, 0)
  return true
}

type BlockArgs = {
  current: { pathname: string }
  next: { pathname: string }
}

export async function shouldBlockLeave({ current, next }: BlockArgs): Promise<boolean> {
  // Só filtros/abas na mesma tela (search params) não perdem nada.
  if (current.pathname === next.pathname) return false
  if (consumeAllowance()) return false
  const leave = await requestLeaveConfirm()
  if (leave) {
    // Já respondeu "sair": os demais bloqueios desta navegação não perguntam.
    allowLeave()
    consumeAllowance()
  }
  return !leave
}

// Com alterações não salvas (active), pede confirmação antes de sair da tela:
// links do painel, voltar do navegador e navigate() para outro caminho usam o
// diálogo do app; atualizar/fechar a aba usa o aviso do próprio navegador.
// Devolve allowLeave (estável): chame logo antes de um navigate() depois de
// salvar/criar/excluir para essa saída não perguntar.
export function useUnsavedGuard(active: boolean) {
  useBlocker({
    shouldBlockFn: shouldBlockLeave,
    enableBeforeUnload: shouldWarnOnUnload,
    disabled: !active,
  })

  useEffect(() => {
    if (!active) return
    activeGuards++
    return () => {
      activeGuards--
    }
  }, [active])

  return allowLeave
}

