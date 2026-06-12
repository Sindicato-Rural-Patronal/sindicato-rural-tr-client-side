export type NewsStatus = 'PUBLISHED' | 'UNPUBLISHED'

// ─── Content blocks ──────────────────────────────────────────────────────────

export type ParagraphBlock = {
  type: 'paragraph'
  text: string
}

export type ImageBlock = {
  type: 'image'
  url: string
  caption?: string
}

export type ImageTextBlock = {
  type: 'image-text'
  url: string
  text: string
  imagePosition: 'left' | 'right'
}

export type ContentBlock = ParagraphBlock | ImageBlock | ImageTextBlock

// ─── News model ───────────────────────────────────────────────────────────────

export type News = {
  id: string
  title: string
  /** JSON-serialized ContentBlock[] */
  content: string
  summary: string | null
  bannerUrl: string | null
  status: NewsStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function parseBlocks(content: string): ContentBlock[] {
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) return parsed as ContentBlock[]
  } catch {
    // Legacy plain text — wrap as single paragraph
    if (content.trim()) return [{ type: 'paragraph', text: content }]
  }
  return []
}

export function serializeBlocks(blocks: ContentBlock[]): string {
  return JSON.stringify(blocks)
}
