import { describe, it, expect } from 'vitest'
import { markdownToText } from '../../../server/markdown-text.mjs'
import { markdownToPlainText } from '@/lib/markdown-text'

// O servidor (Node puro) tem a própria cópia da regra que monta a descrição
// das prévias de link (WhatsApp/redes). Aqui confere que ela não se afasta da
// usada nos cards e no useSeo.
const samples = [
  '## Sobre o curso\n\n**Aulas práticas** com _técnicos_.\n\n- Item um\n- [Saiba mais](https://x.com)\n\n> Citação `código`',
  '# NR-31\n\n1. Segurança\n2. Máquinas\n\n![foto](https://x/y.jpg)\n\n---\n\n| Dia | Tema |\n|---|---|\n| 1 | Teoria |',
  'Preço 5 * 2 = 10',
  'Texto simples\ncom quebra de linha',
  '',
]

describe('markdownToText (server/markdown-text.mjs)', () => {
  it('tira a marcação do markdown', () => {
    expect(markdownToText('## Conteúdo\n\n**Aulas** práticas')).toBe('Conteúdo Aulas práticas')
    expect(markdownToText(null)).toBe('')
  })

  it.each(samples)('dá o mesmo resultado que src/lib/markdown-text.ts: %j', md => {
    expect(markdownToText(md)).toBe(markdownToPlainText(md))
  })
})
