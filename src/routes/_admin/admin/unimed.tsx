import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  HeartPulse, Plus, Pencil, Trash2, Search, User, X, Receipt, ScrollText, FileSignature, Loader2,
} from 'lucide-react'
import { requirePermission } from '@/lib/auth-guard'
import { apiFetch } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error-message'
import { downloadFichaUnimed } from '@/lib/unimed-ficha-pdf'
import { downloadTermoUnimed } from '@/lib/unimed-termo-pdf'
import { downloadContratoUnimed } from '@/lib/unimed-contrato-pdf'
import { upperNoAccents } from '@/utils/text-format'
import { formatDateFromString } from '@/utils/format-data-from-string'
import { maskCPF } from '@/utils/masks'
import { STICKY_ACTIONS_CELL, STICKY_ACTIONS_ROW } from '@/lib/table-sticky-actions'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAdminUsers } from '@/hooks/useAdmin'
import {
  useUnimedList, useUnimed, useCreateUnimed, useUpdateUnimed, useDeleteUnimed,
  type UnimedRow, type UnimedDetail, type UnimedFields,
} from '@/hooks/useUnimed'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { ConfirmCloseDialog } from '@/components/confirm-close-dialog'
import { LoadErrorBanner } from '@/components/LoadErrorBanner'
import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/ui/pagination'

export const Route = createFileRoute('/_admin/admin/unimed')({
  beforeLoad: () => requirePermission('READ_USER'),
  component: RouteComponent,
})

// Usuário selecionado (beneficiário ou titular) — só o essencial pra exibir/vincular.
type PickedUser = { id: string; name: string; cpf: string | null }


// ── Busca/vínculo de usuário (padrão VincularUsuario do Financeiro) ─────────────
function UserPicker({ onPick, placeholder }: {
  onPick: (u: PickedUser) => void
  placeholder?: string
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const dq = useDebouncedValue(q, 300).trim()
  const { data, isFetching } = useAdminUsers({ search: dq, limit: 6 })
  const results = dq.length >= 2 ? (data?.data ?? []) : []

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder ?? 'Buscar usuário (nome, CPF)…'}
          className="pl-10 text-sm"
        />
      </div>
      {open && dq.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {isFetching && <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>}
          {!isFetching && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum usuário encontrado.</div>
          )}
          {results.map(u => (
            <button
              key={u.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onPick({ id: u.id, name: u.name, cpf: u.cpf }); setQ(''); setOpen(false) }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="truncate">{u.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{u.cpf ?? ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LinkedUser({ user, onClear }: { user: PickedUser; onClear?: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
      <span className="inline-flex items-center gap-2 text-muted-foreground min-w-0">
        <User className="size-4 shrink-0" />
        <strong className="text-foreground truncate">{user.name || 'Usuário vinculado'}</strong>
        {user.cpf && <span className="shrink-0 text-xs text-muted-foreground">{user.cpf}</span>}
      </span>
      {onClear && (
        <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2 shrink-0" onClick={onClear}>
          <X className="size-3.5" /> Remover
        </Button>
      )}
    </div>
  )
}

// ── Formulário ──────────────────────────────────────────────────────────────
type UnimedForm = {
  dataAdesao: string
  tipoMovimento: string
  tipoDependente: string
  grauDependencia: string
  cns: string
  nomeMae: string
  profissao: string
  plano: string
  matricula: string
  empresa: string
  contratante: string
  motivo: string
  obs: string
}
const emptyForm = (): UnimedForm => ({
  dataAdesao: '', tipoMovimento: '', tipoDependente: '', grauDependencia: '', cns: '',
  nomeMae: '', profissao: '', plano: '', matricula: '', empresa: '', contratante: '',
  motivo: '', obs: '',
})
function toForm(d: UnimedDetail): UnimedForm {
  return {
    dataAdesao: d.dataAdesao ? d.dataAdesao.slice(0, 10) : '',
    tipoMovimento: d.tipoMovimento ?? '',
    tipoDependente: d.tipoDependente ?? '',
    grauDependencia: d.grauDependencia ?? '',
    cns: d.cns ?? '',
    nomeMae: d.nomeMae ?? '',
    profissao: d.profissao ?? '',
    plano: d.plano ?? '',
    matricula: d.matricula ?? '',
    empresa: d.empresa ?? '',
    contratante: d.contratante ?? '',
    motivo: d.motivo ?? '',
    obs: d.obs ?? '',
  }
}
function formToFields(form: UnimedForm, titularId: string | null): UnimedFields {
  const s = (v: string) => (v.trim() ? v.trim() : null)
  return {
    dataAdesao: form.dataAdesao || null,
    tipoMovimento: s(form.tipoMovimento),
    tipoDependente: s(form.tipoDependente),
    grauDependencia: s(form.grauDependencia),
    cns: s(form.cns),
    nomeMae: s(form.nomeMae),
    profissao: s(form.profissao),
    plano: s(form.plano),
    matricula: s(form.matricula),
    empresa: s(form.empresa),
    contratante: s(form.contratante),
    titularId: titularId ?? null,
    motivo: s(form.motivo),
    obs: s(form.obs),
  }
}
function snapshotOf(form: UnimedForm, userId: string | null, titularId: string | null): string {
  return JSON.stringify({ form, userId: userId ?? '', titularId: titularId ?? '' })
}

function UnimedFormDialog({ open, editId, onClose }: {
  open: boolean
  editId: string | null
  onClose: () => void
}) {
  const isEdit = !!editId
  const { data: detail, isLoading: loadingDetail } = useUnimed(open && isEdit ? editId : null)
  const createM = useCreateUnimed()
  const updateM = useUpdateUnimed(editId ?? '')

  const [beneficiary, setBeneficiary] = useState<PickedUser | null>(null)
  const [titular, setTitular] = useState<PickedUser | null>(null)
  const [form, setForm] = useState<UnimedForm>(emptyForm)
  const [snapshot, setSnapshot] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Popula (novo → vazio; edição → quando o detalhe chega).
  useEffect(() => {
    if (!open) return
    if (isEdit) {
      if (detail) {
        const f = toForm(detail)
        const ben: PickedUser = { id: detail.userDataId, name: detail.userData.name, cpf: detail.userData.cpf }
        const tit: PickedUser | null = detail.titularId ? { id: detail.titularId, name: '', cpf: null } : null
        setForm(f)
        setBeneficiary(ben)
        setTitular(tit)
        setSnapshot(snapshotOf(f, ben.id, tit?.id ?? null))
        setError(null)
      }
    } else {
      const f = emptyForm()
      setForm(f)
      setBeneficiary(null)
      setTitular(null)
      setSnapshot(snapshotOf(f, null, null))
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, detail])

  function setF<K extends keyof UnimedForm>(k: K, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }
  // Campos de identidade em texto livre → MAIÚSCULO sem acentos.
  function setUpper<K extends keyof UnimedForm>(k: K, v: string) {
    setForm(prev => ({ ...prev, [k]: upperNoAccents(v) }))
  }

  const dirty = snapshotOf(form, beneficiary?.id ?? null, titular?.id ?? null) !== snapshot
  const saving = createM.isPending || updateM.isPending

  function requestClose() {
    if (dirty && !saving) setConfirmClose(true)
    else onClose()
  }

  async function handleSubmit() {
    setError(null)
    if (!isEdit && !beneficiary) {
      setError('Selecione o usuário beneficiário.')
      return
    }
    const fields = formToFields(form, titular?.id ?? null)
    try {
      if (isEdit) {
        await updateM.mutateAsync(fields)
        toast.success('Beneficiário atualizado!')
      } else {
        await createM.mutateAsync({ userDataId: beneficiary!.id, ...fields })
        toast.success('Beneficiário cadastrado!')
      }
      onClose()
    } catch (e) {
      const msg = apiErrorMessage(e, 'Erro ao salvar o beneficiário.')
      setError(msg)
      toast.error(msg)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={o => { if (!o) requestClose() }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Editar beneficiário' : 'Novo beneficiário'}</DialogTitle>
            <DialogDescription>
              Dados do beneficiário do plano de saúde (Unimed).
            </DialogDescription>
          </DialogHeader>

          {isEdit && loadingDetail ? (
            <div className="flex flex-col gap-3 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Beneficiário (usuário vinculado) */}
              <div className="flex flex-col gap-1.5">
                <Label>Beneficiário {isEdit ? '' : '*'}</Label>
                {isEdit && beneficiary ? (
                  <LinkedUser user={beneficiary} />
                ) : beneficiary ? (
                  <LinkedUser user={beneficiary} onClear={() => setBeneficiary(null)} />
                ) : (
                  <UserPicker onPick={setBeneficiary} placeholder="Buscar o usuário beneficiário (nome, CPF)…" />
                )}
                {isEdit && (
                  <p className="text-[11px] text-muted-foreground">O usuário vinculado não pode ser alterado.</p>
                )}
              </div>

              {/* Contratante / plano */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contratante e plano</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Contratante</Label>
                    <Input value={form.contratante} onChange={e => setUpper('contratante', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Empresa</Label>
                    <Input value={form.empresa} onChange={e => setUpper('empresa', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Plano</Label>
                    <Input value={form.plano} onChange={e => setF('plano', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Matrícula</Label>
                    <Input value={form.matricula} onChange={e => setF('matricula', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Dependência */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dependência e movimento</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Tipo de movimento</Label>
                    <Input value={form.tipoMovimento} onChange={e => setUpper('tipoMovimento', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Tipo de dependente</Label>
                    <Input value={form.tipoDependente} onChange={e => setUpper('tipoDependente', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Grau de dependência</Label>
                    <Input value={form.grauDependencia} onChange={e => setUpper('grauDependencia', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Data de adesão</Label>
                    <Input type="date" value={form.dataAdesao} onChange={e => setF('dataAdesao', e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Titular da família</Label>
                  {titular ? (
                    <LinkedUser user={titular} onClear={() => setTitular(null)} />
                  ) : (
                    <UserPicker onPick={setTitular} placeholder="Vincular o titular (nome, CPF)…" />
                  )}
                </div>
              </div>

              {/* Dados */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>CNS</Label>
                    <Input value={form.cns} onChange={e => setF('cns', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Profissão</Label>
                    <Input value={form.profissao} onChange={e => setUpper('profissao', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label>Nome da mãe</Label>
                    <Input value={form.nomeMae} onChange={e => setUpper('nomeMae', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label>Motivo</Label>
                    <Input value={form.motivo} onChange={e => setUpper('motivo', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="flex flex-col gap-1.5">
                <Label>Observações</Label>
                <Textarea rows={3} value={form.obs} onChange={e => setUpper('obs', e.target.value)} />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={requestClose} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving || (isEdit && loadingDetail)}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmCloseDialog
        open={confirmClose}
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => { setConfirmClose(false); onClose() }}
      />
    </>
  )
}

// ── Tela ──────────────────────────────────────────────────────────────────────
function RouteComponent() {
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300).trim()
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [search])

  const { data, isLoading, isError } = useUnimedList({ page, limit: 20, search })
  const deleteM = useDeleteUnimed()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UnimedRow | null>(null)
  const [fichaBusyId, setFichaBusyId] = useState<string | null>(null)
  const [termoBusyId, setTermoBusyId] = useState<string | null>(null)
  const [contratoBusyId, setContratoBusyId] = useState<string | null>(null)

  const rows = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  function openNew() { setEditId(null); setDialogOpen(true) }
  function openEdit(id: string) { setEditId(id); setDialogOpen(true) }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteM.mutateAsync(deleteTarget.id)
      toast.success('Beneficiário removido.')
      setDeleteTarget(null)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao remover o beneficiário.'))
    }
  }

  // Busca o beneficiário completo + a pessoa (e o titular, se houver) e baixa a Ficha PDF.
  async function gerarFicha(row: UnimedRow) {
    setFichaBusyId(row.id)
    try {
      const unimed = await apiFetch(`/admin/unimed/${row.id}`).then(r => r.json()) as UnimedDetail
      const user = await apiFetch(`/admin/users/${unimed.userDataId}`).then(r => r.json())
      let titularName: string | undefined
      if (unimed.titularId) {
        const titular = await apiFetch(`/admin/users/${unimed.titularId}`).then(r => r.json())
        titularName = titular?.name ?? undefined
      }
      await downloadFichaUnimed({ unimed, user, titularName })
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao gerar a ficha.'))
    } finally {
      setFichaBusyId(null)
    }
  }

  // Busca o beneficiário completo + a pessoa e baixa o Termo de adesão PDF.
  async function gerarTermo(row: UnimedRow) {
    setTermoBusyId(row.id)
    try {
      const unimed = await apiFetch(`/admin/unimed/${row.id}`).then(r => r.json()) as UnimedDetail
      const user = await apiFetch(`/admin/users/${unimed.userDataId}`).then(r => r.json())
      await downloadTermoUnimed({ unimed, user })
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao gerar o termo.'))
    } finally {
      setTermoBusyId(null)
    }
  }

  // Busca o beneficiário completo + a pessoa e baixa o Termo de Ciência e
  // Consentimento (o "Contrato" do sistema antigo) em PDF.
  async function gerarContrato(row: UnimedRow) {
    setContratoBusyId(row.id)
    try {
      const unimed = await apiFetch(`/admin/unimed/${row.id}`).then(r => r.json()) as UnimedDetail
      const user = await apiFetch(`/admin/users/${unimed.userDataId}`).then(r => r.json())
      await downloadContratoUnimed({ unimed, user })
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erro ao gerar o contrato.'))
    } finally {
      setContratoBusyId(null)
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Unimed — Beneficiários</h1>
          <p className="text-sm text-muted-foreground">
            Beneficiários do plano de saúde vinculados aos usuários cadastrados.
          </p>
        </div>
        <Button onClick={openNew} className="shrink-0">
          <Plus className="size-4" /> Novo beneficiário
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou CPF..."
          className="pl-9"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
      </div>

      {isError && <LoadErrorBanner message="Erro ao carregar os beneficiários." />}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Com a sidebar ocupando ~256px, as 7 colunas só cabem em telas
                    bem largas — as menos essenciais somem por breakpoint. E, se
                    ainda assim sobrar conteúdo (nomes longos em telas estreitas),
                    a coluna de Ações fica presa à direita (STICKY_ACTIONS_CELL) para
                    nunca sair da área visível. */}
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">CPF</TableHead>
                <TableHead className="hidden 2xl:table-cell">Plano</TableHead>
                <TableHead className="hidden xl:table-cell">Matrícula</TableHead>
                <TableHead className="hidden xl:table-cell">Tipo dependente</TableHead>
                <TableHead className="hidden lg:table-cell">Data adesão</TableHead>
                <TableHead className={`text-right ${STICKY_ACTIONS_CELL}`}>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="hidden 2xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className={STICKY_ACTIONS_CELL}><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={HeartPulse}
                      title="Nenhum beneficiário"
                      description={search ? 'Nada encontrado com essa busca.' : 'Clique em "Novo beneficiário" para cadastrar.'}
                    />
                  </TableCell>
                </TableRow>
              )}
              {rows.map(r => (
                <TableRow key={r.id} className={STICKY_ACTIONS_ROW}>
                  <TableCell className="font-medium text-foreground">{r.userData.name}</TableCell>
                  <TableCell className="hidden sm:table-cell tabular-nums text-muted-foreground">{r.userData.cpf ? maskCPF(r.userData.cpf) : '—'}</TableCell>
                  <TableCell className="hidden 2xl:table-cell text-muted-foreground">{r.plano ?? '—'}</TableCell>
                  <TableCell className="hidden xl:table-cell tabular-nums text-muted-foreground">{r.matricula ?? '—'}</TableCell>
                  <TableCell className="hidden xl:table-cell text-muted-foreground">{r.tipoDependente ?? '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell tabular-nums text-muted-foreground">
                    {r.dataAdesao ? formatDateFromString(r.dataAdesao) : '—'}
                  </TableCell>
                  <TableCell className={`text-right ${STICKY_ACTIONS_CELL}`}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => gerarFicha(r)}
                        disabled={fichaBusyId === r.id}
                        aria-label="Gerar Ficha"
                        title="Gerar Ficha"
                      >
                        {fichaBusyId === r.id
                          ? <Loader2 className="size-4 animate-spin" />
                          : <Receipt className="size-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => gerarTermo(r)}
                        disabled={termoBusyId === r.id}
                        aria-label="Gerar Termo"
                        title="Gerar Termo"
                      >
                        {termoBusyId === r.id
                          ? <Loader2 className="size-4 animate-spin" />
                          : <ScrollText className="size-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => gerarContrato(r)}
                        disabled={contratoBusyId === r.id}
                        aria-label="Gerar Contrato"
                        title="Gerar Contrato (Termo de Ciência e Consentimento)"
                      >
                        {contratoBusyId === r.id
                          ? <Loader2 className="size-4 animate-spin" />
                          : <FileSignature className="size-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => openEdit(r.id)} aria-label="Editar" title="Editar">
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(r)} aria-label="Excluir" title="Excluir">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {total > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={20}
          onPageChange={setPage}
          showLimitSelector={false}
        />
      )}

      <UnimedFormDialog
        open={dialogOpen}
        editId={editId}
        onClose={() => { setDialogOpen(false); setEditId(null) }}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => { if (!o) setDeleteTarget(null) }}
        title="Excluir beneficiário"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir o beneficiário "${deleteTarget.userData.name}"? Esta ação não pode ser desfeita.`
            : ''
        }
        onConfirm={handleDelete}
        pending={deleteM.isPending}
      />
    </div>
  )
}
