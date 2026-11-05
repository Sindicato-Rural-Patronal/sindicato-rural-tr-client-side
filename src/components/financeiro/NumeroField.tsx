import type { Ref } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NUMERO_MAX_DIGITOS, soDigitosDoNumero, textoAutomatico } from '@/lib/finance-number'

/**
 * Campo "Nº" no topo do formulário de lançamento (decisão 005, SR-066).
 *
 * Novo lançamento: vazio quer dizer automático, e o campo diz "Automático (próximo: 128)"
 * com o `proximo` que vem de `GET /admin/finance/transactions/next-number`. Edição: o campo
 * vem com o número atual e pode ser corrigido (a correção fica na auditoria).
 * O `erro` (número inválido, ou o 409 "O número 123 já é de outro lançamento.") aparece
 * embaixo do campo. Quem confere o salto da sequência e fala com a API é o formulário.
 */
export function NumeroField({ value, onChange, proximo, editando, erro, inputRef, disabled }: {
  value: string
  onChange: (v: string) => void
  /** O próximo Nº automático, quando já carregou. */
  proximo?: number | null
  editando: boolean
  erro?: string | null
  inputRef?: Ref<HTMLInputElement>
  disabled?: boolean
}) {
  const ajuda = editando
    ? 'A correção do número fica na auditoria.'
    : 'Deixe vazio para o número automático.'
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="lanc-numero">Nº</Label>
      <Input
        id="lanc-numero"
        ref={inputRef}
        inputMode="numeric"
        autoComplete="off"
        maxLength={NUMERO_MAX_DIGITOS}
        className="sm:max-w-[16rem]"
        placeholder={editando ? 'Digite o Nº' : textoAutomatico(proximo)}
        value={value}
        disabled={disabled}
        onChange={e => onChange(soDigitosDoNumero(e.target.value))}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? 'lanc-numero-erro' : 'lanc-numero-ajuda'}
      />
      {erro
        ? <p id="lanc-numero-erro" role="alert" className="break-words text-xs text-destructive">{erro}</p>
        : <p id="lanc-numero-ajuda" className="text-[11px] text-muted-foreground">{ajuda}</p>}
    </div>
  )
}
