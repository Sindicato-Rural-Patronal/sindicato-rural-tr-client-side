import { cloneElement, isValidElement, useId, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { DatePicker } from '@/components/ui/date-picker'
import { AgeHint } from '@/components/AgeHint'
import { CadproFields } from '@/components/CadproFields'
import { CIN_HINT } from '@/lib/cin'
import {
  PERSON_LABELS, READ_MODE_FIELD,
  type PersonFieldName, type PersonFieldsCtx,
} from '@/lib/person-fields'
import { MEMBER_STATUS, MEMBER_TYPES } from '@/lib/member-types'
import {
  CNH_CATEGORY_OPTIONS, EDUCATION_OPTIONS, ETHNICITY_OPTIONS,
  GENDER_OPTIONS, MARITAL_STATUS_OPTIONS,
} from '@/lib/user-form-options'
import { maskCNH, maskCPF, maskMoney, maskPhone, maskRG } from '@/utils/masks'
import { upperNoAccents } from '@/utils/text-format'
import { cn } from '@/lib/utils'

// Os campos do cadastro de pessoa, definidos UMA vez.
//
// Eles aparecem em duas telas — "Novo associado" (usuarios/novo.tsx) e a ficha
// (usuarios/$id.tsx) — que sempre foram dois blocos de JSX escritos à mão, com
// os mesmos trinta campos repetidos. Foi assim que a **Situação do associado**
// ficou só no cadastro novo: dava para marcar alguém como ATIVO ao criar e
// nunca mais mudar. Os rótulos também já tinham derivado ("Nº cooperado" numa
// tela, "Nº observação" na outra, para a mesma coluna).
//
// Aqui fica o que é IGUAL nas duas: rótulo, tipo de campo, máscara e lista de
// opções. O que é diferente continua em cada tela, por prop:
//   `disabled`  — o modo leitura da ficha
//   `highlight` — o destaque âmbar do "Completar cadastro"
//   `errors`    — a validação antes de enviar
//   `idPrefix`  — os ids precisam ser únicos por tela
//
// A COMPOSIÇÃO também continua em cada tela: qual campo entra em qual cartão e
// em que ordem. As duas telas agrupam diferente de propósito (o nascimento fica
// em "Identidade" no cadastro novo e em "Documentos" na ficha), e juntar isso
// mudaria o desenho das telas sem ninguém ter pedido.

const inp = 'h-9'

export function SelectField({ id, value, onChange, options, placeholder, disabled }: {
  id?: string
  value: string
  onChange: (v: string) => void
  options: readonly { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <NativeSelect
      id={id}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={cn('h-9', disabled && 'disabled:cursor-default disabled:bg-muted/40')}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </NativeSelect>
  )
}

/**
 * Rótulo + campo + mensagem de erro. Junta o que as duas telas tinham
 * separado: o asterisco de obrigatório (cadastro novo) e o destaque âmbar de
 * "está faltando" (ficha). Sem `htmlFor`, o id é gerado e injetado no campo,
 * para clicar no rótulo focar o campo.
 */
export function FieldRow({ label, children, required, highlight, htmlFor, error }: {
  label: string
  children: ReactNode
  required?: boolean
  highlight?: boolean
  htmlFor?: string
  error?: string
}) {
  const autoId = useId()
  const id = htmlFor ?? autoId
  const control = !htmlFor && isValidElement<{ id?: string }>(children) && !children.props.id
    ? cloneElement(children, { id })
    : children
  return (
    <div className={cn(
      'flex flex-col gap-1.5',
      highlight && 'rounded-lg p-2.5 -mx-2.5 bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-300 dark:ring-amber-700',
    )}>
      <Label htmlFor={id} className={cn('text-xs font-medium', highlight ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground')}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
        {highlight && !required && <span className="ml-1 text-amber-500">*</span>}
      </Label>
      {control}
      {error && <p id={`${id}-erro`} className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  )
}


/**
 * O que liga o campo ao rótulo e à mensagem de erro. Vai por parâmetro, e não
 * injetado depois com `cloneElement`: campo que é um fragmento (o CPF traz a
 * dica da CIN embaixo, o nascimento traz a idade) não tem onde receber o id, e
 * o rótulo ficava sem apontar para nada.
 */
type CampoProps = {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

const leitura = (ctx: PersonFieldsCtx) => cn(inp, ctx.disabled && READ_MODE_FIELD)

/** Texto em caixa alta sem acento — o formato dos cadastros. */
function texto(campo: PersonFieldName, ctx: PersonFieldsCtx, p: CampoProps) {
  return (
    <Input
      {...p}
      className={leitura(ctx)}
      disabled={ctx.disabled}
      value={ctx.values[campo] as string}
      onChange={e => ctx.set(campo, upperNoAccents(e.target.value) as never)}
    />
  )
}

function selecao(
  campo: PersonFieldName,
  ctx: PersonFieldsCtx,
  p: CampoProps,
  options: readonly { value: string; label: string }[],
) {
  return (
    <SelectField
      id={p.id}
      disabled={ctx.disabled}
      value={ctx.values[campo] as string}
      onChange={v => ctx.set(campo, v as never)}
      placeholder="Selecione"
      options={options}
    />
  )
}

function data(campo: PersonFieldName, ctx: PersonFieldsCtx, p: CampoProps) {
  return (
    <DatePicker
      id={p.id}
      disabled={ctx.disabled}
      className={cn(ctx.disabled && READ_MODE_FIELD)}
      value={ctx.values[campo] as string}
      onChange={v => ctx.set(campo, v as never)}
    />
  )
}

function telefone(campo: 'phone' | 'phone2' | 'phone3', ctx: PersonFieldsCtx, p: CampoProps) {
  return (
    <Input
      {...p}
      className={leitura(ctx)}
      disabled={ctx.disabled}
      inputMode="tel"
      value={ctx.values[campo]}
      onChange={e => ctx.set(campo, maskPhone(e.target.value))}
      placeholder="(00) 00000-0000"
    />
  )
}

function caixa(campo: 'specialNeeds' | 'boardMember', ctx: PersonFieldsCtx, p: CampoProps) {
  return (
    <div className="flex items-center gap-2 pt-5">
      <input
        type="checkbox"
        id={p.id}
        disabled={ctx.disabled}
        checked={ctx.values[campo]}
        onChange={e => ctx.set(campo, e.target.checked)}
        className="size-4 accent-primary disabled:cursor-default"
      />
      <Label htmlFor={p.id} className={cn('text-sm', !ctx.disabled && 'cursor-pointer')}>
        {PERSON_LABELS[campo]}
      </Label>
    </div>
  )
}

/**
 * Como cada campo é desenhado. `linha: false` = sem FieldRow (caixas de marcar).
 * Sendo um `Record<PersonFieldName, ...>`, esquecer um campo NÃO COMPILA — é o
 * que garante que as duas telas continuem com os mesmos campos.
 */
const CAMPOS: Record<
  PersonFieldName,
  { linha?: false; render: (ctx: PersonFieldsCtx, p: CampoProps) => ReactNode }
> = {
  name: { render: (ctx, p) => texto('name', ctx, p) },
  nickname: { render: (ctx, p) => texto('nickname', ctx, p) },
  email: {
    render: (ctx, p) => (
      <Input
        {...p}
        className={leitura(ctx)}
        disabled={ctx.disabled}
        type="email"
        value={ctx.values.email}
        onChange={e => ctx.set('email', e.target.value)}
      />
    ),
  },
  phone: { render: (ctx, p) => telefone('phone', ctx, p) },
  phone2: { render: (ctx, p) => telefone('phone2', ctx, p) },
  phone3: { render: (ctx, p) => telefone('phone3', ctx, p) },
  cpf: {
    render: (ctx, p) => (
      <>
        <Input
          {...p}
          className={leitura(ctx)}
          disabled={ctx.disabled}
          inputMode="numeric"
          value={ctx.values.cpf}
          onChange={e => ctx.set('cpf', maskCPF(e.target.value))}
          placeholder="000.000.000-00"
        />
        {/* A identidade nova (CIN) traz o CPF como número: quem está com ela na
            mão precisa saber que é esse número que vai aqui. */}
        {!ctx.disabled && <p className="text-xs text-muted-foreground">{CIN_HINT}</p>}
      </>
    ),
  },
  rg: {
    render: (ctx, p) => (
      <Input
        {...p}
        className={leitura(ctx)}
        disabled={ctx.disabled}
        value={ctx.values.rg}
        onChange={e => ctx.set('rg', maskRG(e.target.value))}
        placeholder="00.000.000-0"
        maxLength={12}
      />
    ),
  },
  rgIssuer: { render: (ctx, p) => texto('rgIssuer', ctx, p) },
  rgIssuedAt: { render: (ctx, p) => data('rgIssuedAt', ctx, p) },
  birthDate: {
    render: (ctx, p) => (
      <>
        {data('birthDate', ctx, p)}
        <AgeHint birthDate={ctx.values.birthDate} />
      </>
    ),
  },
  driverLicense: {
    render: (ctx, p) => (
      <Input
        {...p}
        className={leitura(ctx)}
        disabled={ctx.disabled}
        value={ctx.values.driverLicense}
        onChange={e => {
          const v = maskCNH(e.target.value)
          ctx.set('driverLicense', v)
          // CNH apagada deixaria a categoria órfã.
          if (!v) ctx.set('driverLicenseCategory', '')
        }}
        placeholder="00000000000"
        inputMode="numeric"
        maxLength={11}
      />
    ),
  },
  driverLicenseCategory: {
    render: (ctx, p) => selecao('driverLicenseCategory', ctx, p, CNH_CATEGORY_OPTIONS),
  },
  birthPlace: { render: (ctx, p) => texto('birthPlace', ctx, p) },
  nationality: { render: (ctx, p) => texto('nationality', ctx, p) },
  gender: { render: (ctx, p) => selecao('gender', ctx, p, GENDER_OPTIONS) },
  ethnicity: { render: (ctx, p) => selecao('ethnicity', ctx, p, ETHNICITY_OPTIONS) },
  maritalStatus: { render: (ctx, p) => selecao('maritalStatus', ctx, p, MARITAL_STATUS_OPTIONS) },
  educationLevel: { render: (ctx, p) => selecao('educationLevel', ctx, p, EDUCATION_OPTIONS) },
  functionalCategory: { render: (ctx, p) => texto('functionalCategory', ctx, p) },
  cadPro: {
    render: (ctx, p) => (
      // CadproFields não recebe classe: o modo leitura legível vem do seletor aqui.
      <div
        id={p.id}
        className={cn(ctx.disabled && '[&_input:disabled]:opacity-100 [&_input:disabled]:bg-muted/40')}
      >
        <CadproFields value={ctx.values.cadPro} onChange={v => ctx.set('cadPro', v)} disabled={ctx.disabled} />
      </div>
    ),
  },
  familyIncome: {
    render: (ctx, p) => (
      <Input
        {...p}
        className={leitura(ctx)}
        disabled={ctx.disabled}
        value={ctx.values.familyIncome}
        onChange={e => ctx.set('familyIncome', maskMoney(e.target.value))}
        placeholder="R$ 0,00"
        inputMode="numeric"
      />
    ),
  },
  specialNeeds: { linha: false, render: (ctx, p) => caixa('specialNeeds', ctx, p) },
  memberType: { render: (ctx, p) => selecao('memberType', ctx, p, MEMBER_TYPES) },
  memberStatus: { render: (ctx, p) => selecao('memberStatus', ctx, p, MEMBER_STATUS) },
  memberClassification: { render: (ctx, p) => texto('memberClassification', ctx, p) },
  memberSince: { render: (ctx, p) => data('memberSince', ctx, p) },
  membershipValidUntil: { render: (ctx, p) => data('membershipValidUntil', ctx, p) },
  memberNotes: {
    // Textarea, nao Input: e observacao, cabe mais de uma linha. A ficha ja
    // usava textarea e o cadastro novo usava campo de uma linha, para a mesma
    // coluna — ficaram os dois iguais, no que serve melhor aos dois.
    render: (ctx, p) => (
      <textarea
        {...p}
        disabled={ctx.disabled}
        value={ctx.values.memberNotes}
        onChange={e => ctx.set('memberNotes', upperNoAccents(e.target.value))}
        rows={3}
        className={cn(
          'w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
          ctx.disabled && READ_MODE_FIELD,
        )}
      />
    ),
  },
  memberNotesNumber: {
    // Número livre: não passa por máscara nem por caixa alta.
    render: (ctx, p) => (
      <Input
        {...p}
        className={leitura(ctx)}
        disabled={ctx.disabled}
        value={ctx.values.memberNotesNumber}
        onChange={e => ctx.set('memberNotesNumber', e.target.value)}
      />
    ),
  },
  boardMember: { linha: false, render: (ctx, p) => caixa('boardMember', ctx, p) },
  boardPosition: { render: (ctx, p) => texto('boardPosition', ctx, p) },
}

/**
 * Um campo do cadastro de pessoa. A tela decide ONDE ele entra; o rótulo, a
 * máscara e as opções vêm daqui.
 */
export function PersonField({ campo, ctx, required }: {
  campo: PersonFieldName
  ctx: PersonFieldsCtx
  required?: boolean
}) {
  const id = `${ctx.idPrefix}${campo}`
  const def = CAMPOS[campo]
  if (def.linha === false) return <>{def.render(ctx, { id })}</>

  const erro = ctx.errors?.[campo]
  const aria: CampoProps = erro
    ? { id, 'aria-invalid': true, 'aria-describedby': `${id}-erro` }
    : { id }
  return (
    <FieldRow
      label={PERSON_LABELS[campo]}
      required={required}
      highlight={ctx.highlight?.(campo)}
      htmlFor={id}
      error={erro}
    >
      {def.render(ctx, aria)}
    </FieldRow>
  )
}

