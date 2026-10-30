/** Lado, em px, da foto do cadastro de pessoa guardada no envio (a do avatar do próprio admin segue 256). */
export const PERSON_PHOTO_SIZE = 800

/**
 * Recorta a imagem no centro para um quadrado `size`x`size` e devolve um JPEG.
 * Foto original menor que `size` não é ampliada: sai com o lado dela.
 */
export function resizeToSquare(file: File, size = 256): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const side = Math.min(img.width, img.height)
      const out = Math.min(size, side)
      const canvas = document.createElement('canvas')
      canvas.width = out
      canvas.height = out
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('no canvas context')); return }
      const sx = (img.width - side) / 2
      const sy = (img.height - side) / 2
      ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out)
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('canvas toBlob failed')); return }
        resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.85)
    }
    img.onerror = reject
    img.src = url
  })
}
