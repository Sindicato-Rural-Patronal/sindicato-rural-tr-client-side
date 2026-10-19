import { describe, it, expect } from 'vitest'
import { isImageFile } from '@/utils/image-file'

describe('isImageFile', () => {
  it('aceita imagem e recusa o resto', () => {
    expect(isImageFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).toBe(true)
    expect(isImageFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBe(true)
    expect(isImageFile(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toBe(false)
    expect(isImageFile(new File(['x'], 'a.txt', { type: '' }))).toBe(false)
  })
})
