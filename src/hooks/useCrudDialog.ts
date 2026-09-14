import { useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Lifecycle compartilhado dos diálogos de CRUD do admin (salas, cotações,
 * categorias e caixas do Financeiro): abrir para criar/editar, snapshot para
 * detectar alterações não salvas, gate de confirmação ao fechar sujo, alvo de
 * exclusão e mensagem de erro do formulário.
 *
 * O hook cuida SÓ do estado do diálogo/formulário e das transições de
 * abrir/fechar. As mutações (create/update/delete) e os toasts continuam em
 * cada tela, pois são específicos de cada recurso.
 *
 * Telas sem gate de "descartar alterações" (salas, cotações) simplesmente
 * fecham com `forceClose` e ignoram `isDirty`/`confirmCloseOpen`. Telas com
 * gate (Financeiro) usam `requestClose` + o `ConfirmCloseDialog`.
 */
export interface UseCrudDialogOptions<TForm, TEntity> {
  /** Formulário vazio para "novo". Chamado no momento do `openCreate`. */
  empty: () => TForm
  /** Constrói o formulário a partir da entidade em edição. Chamado no `openEdit`. */
  toForm: (entity: TEntity) => TForm
}

export interface CrudDialog<TForm, TEntity> {
  /** Diálogo de criar/editar aberto? */
  open: boolean
  /** Entidade em edição, ou `null` quando é criação. */
  editing: TEntity | null
  form: TForm
  setForm: Dispatch<SetStateAction<TForm>>
  setField: <K extends keyof TForm>(key: K, value: TForm[K]) => void
  /** `true` quando o formulário difere do snapshot tirado ao abrir. */
  isDirty: boolean
  openCreate: () => void
  openEdit: (entity: TEntity) => void
  /** Fecha; se estiver sujo, abre o gate de confirmação em vez de fechar. */
  requestClose: () => void
  /** Fecha o diálogo (e o gate) sem perguntar. */
  forceClose: () => void
  deleteTarget: TEntity | null
  setDeleteTarget: Dispatch<SetStateAction<TEntity | null>>
  confirmCloseOpen: boolean
  setConfirmCloseOpen: Dispatch<SetStateAction<boolean>>
  error: string | null
  setError: Dispatch<SetStateAction<string | null>>
}

export function useCrudDialog<TForm, TEntity>(
  options: UseCrudDialogOptions<TForm, TEntity>,
): CrudDialog<TForm, TEntity> {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TEntity | null>(null)
  const [form, setForm] = useState<TForm>(options.empty)
  const [snapshot, setSnapshot] = useState('')
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TEntity | null>(null)

  const isDirty = JSON.stringify(form) !== snapshot

  function setField<K extends keyof TForm>(key: K, value: TForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }) as TForm)
  }

  function openCreate() {
    const f = options.empty()
    setEditing(null)
    setForm(f)
    setSnapshot(JSON.stringify(f))
    setError(null)
    setOpen(true)
  }

  function openEdit(entity: TEntity) {
    const f = options.toForm(entity)
    setEditing(entity)
    setForm(f)
    setSnapshot(JSON.stringify(f))
    setError(null)
    setOpen(true)
  }

  function forceClose() {
    setConfirmCloseOpen(false)
    setOpen(false)
  }

  function requestClose() {
    if (isDirty) setConfirmCloseOpen(true)
    else setOpen(false)
  }

  return {
    open,
    editing,
    form,
    setForm,
    setField,
    isDirty,
    openCreate,
    openEdit,
    requestClose,
    forceClose,
    deleteTarget,
    setDeleteTarget,
    confirmCloseOpen,
    setConfirmCloseOpen,
    error,
    setError,
  }
}
