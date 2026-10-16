// Diálogo de cadastrar/editar beneficiário da Unimed (tela /admin/unimed).
// Fica fora do arquivo de rota, que só exporta `Route`.
import { useState } from 'react'
import { toast } from 'sonner'
import { User, X } from 'lucide-react'
import { apiErrorMessage } from '@/lib/api-error-message'
import {
  UNIMED_MOVEMENT_TYPES, UNIMED_DEPENDENCY_DEGREES, unimedOptionsWith,
} from '@/lib/unimed-options'
import { upperNoAccents } from '@/utils/text-format'
import { maskCPF, maskCNS, unmaskDigits } from '@/utils/masks'
import { PersonPicker, type PickedPerson } from '@/components/PersonPicker'
import { useAdminUser } from '@/hooks/useAdmin'
import {
  useUnimed, useCreateUnimed, useUpdateUnimed,
  type UnimedDetail, type UnimedFields,
} from '@/hooks/useUnimed'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { ConfirmCloseDialog } from '@/components/confirm-close-dialog'
import { LoadErrorRetry } from '@/components/LoadErrorRetry'

// Pessoa selecionada (beneficiário ou titular) — só o essencial pra exibir/vincular.
// A busca é o PersonPicker compartilhado (oferece cadastrar pessoa nova em outra aba).
type PickedUser = PickedPerson

function LinkedUser({ user, onClear, fallback = 'Usuário vinculado' }: {
  user: PickedUser
  onClear?: () => void
  /** Texto enquanto o nome não chegou (a API do convênio devolve só o id do titular). */
  fallback?: string
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
      <span className="inline-flex items-center gap-2 text-muted-foreground min-w-0">
        <User className="size-4 shrink-0" />
        <strong className="text-foreground truncate">{user.name || fallback}</strong>
        {user.cpf && <span className="shrink-0 text-xs text-muted-foreground">{maskCPF(user.cpf)}</span>}
      </span>
      {onClear && (
        <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2 shrink-0" onClick={onClear}>
          <X className="size-3.5" /> Remover
        </Button>
      )}
    </div>
  )
}

/**
 * Titular já gravado: o convênio guarda só o id, então busca o nome da pessoa
 * para o card não ficar com o genérico "Usuário vinculado".
 */
function LinkedTitular({ id, onClear }: { id: string; onClear: () => void }) {
  const { data, isLoading } = useAdminUser(id)
  return (
    <LinkedUser
      user={{ id, name: data?.name ?? '', cpf: data?.cpf ?? null }}
      onClear={onClear}
      fallback={isLoading ? 'Carregando…' : 'Titular vinculado'}
    />
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
    cns: maskCNS(d.cns ?? ''),
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
    cns: unmaskDigits(form.cns) || null,
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

export function UnimedFormDialog({ open, editId, onClose }: {
  open: boolean
  editId: string | null
  onClose: () => void
}) {
  const isEdit = !!editId
  const detailQuery = useUnimed(open && isEdit ? editId : null)
  const detail = detailQuery.data
  // Edição só com o cadastro carregado: sem ele o formulário estaria vazio (ou
  // com os dados de outro beneficiário) e salvar gravaria isso por cima.
  const waitingDetail = isEdit && !detail
  const detailFailed = waitingDetail && detailQuery.isError
  const createM = useCreateUnimed()
  const updateM = useUpdateUnimed(editId ?? '')

  const [beneficiary, setBeneficiary] = useState<PickedUser | null>(null)
  const [titular, setTitular] = useState<PickedUser | null>(null)
  const [form, setForm] = useState<UnimedForm>(emptyForm)
  const [snapshot, setSnapshot] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Popula (edição → quando o detalhe chega ou muda). Qualquer outra troca —
  // abrir um novo, fechar, passar para outro beneficiário que ainda não
  // carregou ou falhou — zera tudo: nada do cadastro anterior fica no estado.
  // Ajustado no render comparando com a origem da última carga: o Dialog não
  // pode remontar (o fechar depende do `dirty` deste estado).
  const source: UnimedDetail | 'novo' | null | undefined = !open ? null : isEdit ? detail : 'novo'
  const [loadedFrom, setLoadedFrom] = useState<typeof source>(null)
  if (source !== loadedFrom) {
    setLoadedFrom(source)
    if (!source || source === 'novo') {
      const f = emptyForm()
      setForm(f)
      setBeneficiary(null)
      setTitular(null)
      setSnapshot(snapshotOf(f, null, null))
      setError(null)
    } else {
      const f = toForm(source)
      const ben: PickedUser = { id: source.userDataId, name: source.userData.name, cpf: source.userData.cpf }
      const tit: PickedUser | null = source.titularId ? { id: source.titularId, name: '', cpf: null } : null
      setForm(f)
      setBeneficiary(ben)
      setTitular(tit)
      setSnapshot(snapshotOf(f, ben.id, tit?.id ?? null))
      setError(null)
    }
  }

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
    if (waitingDetail) return
    if (!isEdit && !beneficiary) {
      setError('Selecione o usuário beneficiário.')
      return
    }
    const cnsDigits = unmaskDigits(form.cns)
    if (cnsDigits && cnsDigits.length !== 15) {
      setError('O CNS precisa ter 15 dígitos.')
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

          {detailFailed ? (
            <LoadErrorRetry
              className="py-4"
              message="Não foi possível carregar os dados deste beneficiário. O Salvar fica desligado até carregar, para não gravar campos vazios por cima do cadastro."
              onRetry={() => void detailQuery.refetch()}
              retrying={detailQuery.isFetching}
            />
          ) : waitingDetail ? (
            <div className="flex flex-col gap-3 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Beneficiário (usuário vinculado) */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="unimed-beneficiary">Beneficiário {isEdit ? '' : '*'}</Label>
                {isEdit && beneficiary ? (
                  <LinkedUser user={beneficiary} />
                ) : beneficiary ? (
                  <LinkedUser user={beneficiary} onClear={() => setBeneficiary(null)} />
                ) : (
                  <PersonPicker id="unimed-beneficiary" onPick={setBeneficiary} limit={6} placeholder="Buscar o beneficiário (nome, e-mail ou CPF)…" />
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
                    <Label htmlFor="unimed-tipo-movimento">Tipo de movimento</Label>
                    <NativeSelect
                      id="unimed-tipo-movimento"
                      value={form.tipoMovimento}
                      onChange={e => setF('tipoMovimento', e.target.value)}
                    >
                      <option value="">Selecione…</option>
                      {unimedOptionsWith(UNIMED_MOVEMENT_TYPES, form.tipoMovimento).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Tipo de dependente</Label>
                    <Input value={form.tipoDependente} onChange={e => setUpper('tipoDependente', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="unimed-grau">Grau de dependência</Label>
                    <NativeSelect
                      id="unimed-grau"
                      value={form.grauDependencia}
                      onChange={e => setF('grauDependencia', e.target.value)}
                    >
                      <option value="">Selecione…</option>
                      {unimedOptionsWith(UNIMED_DEPENDENCY_DEGREES, form.grauDependencia).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Data de adesão</Label>
                    <Input type="date" value={form.dataAdesao} onChange={e => setF('dataAdesao', e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="unimed-titular">Titular da família</Label>
                  {titular ? (
                    titular.name
                      ? <LinkedUser user={titular} onClear={() => setTitular(null)} />
                      : <LinkedTitular id={titular.id} onClear={() => setTitular(null)} />
                  ) : (
                    <PersonPicker id="unimed-titular" onPick={setTitular} limit={6} placeholder="Vincular o titular (nome, e-mail ou CPF)…" />
                  )}
                </div>
              </div>

              {/* Dados */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="unimed-cns">CNS</Label>
                    <Input
                      id="unimed-cns"
                      inputMode="numeric"
                      placeholder="000 0000 0000 0000"
                      value={form.cns}
                      onChange={e => setF('cns', maskCNS(e.target.value))}
                    />
                    <p className="text-[11px] text-muted-foreground">Cartão Nacional de Saúde — 15 dígitos.</p>
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
            <Button onClick={handleSubmit} disabled={saving || waitingDetail}>
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
