export const NOT_AN_IMAGE_MESSAGE = 'Este arquivo não é uma imagem. Escolha uma foto (JPG, PNG ou WebP).'

/** O arquivo é uma imagem? Confere o tipo declarado pelo navegador. */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}
