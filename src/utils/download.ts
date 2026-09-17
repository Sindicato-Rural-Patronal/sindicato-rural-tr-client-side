// Download de arquivos gerados no navegador ou vindos da API (CSV, PDF).

/** Salva o blob com o nome dado (link temporário + clique). */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // revoga com atraso — revogar imediato pode truncar PDFs grandes em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Abre o blob numa aba nova (ex.: PDF para visualizar/imprimir). */
export function openBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Nome de arquivo seguro: sem acento, minúsculo, só letras/números/hífen. `max = Infinity` não corta. */
export function fileSlug(value: string, max = 60): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max)
}
