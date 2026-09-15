/**
 * Padroniza texto de identidade: MAIÚSCULO e sem acentos (pontuação mantida).
 * Ex: "São José d'Oeste" → "SAO JOSE D'OESTE".
 * Uso: no onChange de campos de nome/endereço/etc. NÃO usar em e-mail, senha,
 * usuário, URLs, CPF/CNPJ ou campos com máscara.
 */
export function upperNoAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
}
