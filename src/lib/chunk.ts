import type { ExtractedSection } from './pdf'

export type Chunk = {
  section: string
  page: number | null
  content: string
}

const CHUNK_WORDS = 400
const OVERLAP_WORDS = 50

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

export function chunkSections(sections: ExtractedSection[]): Chunk[] {
  const chunks: Chunk[] = []

  for (const section of sections) {
    const ws = words(section.text)
    if (ws.length === 0) continue

    let start = 0
    while (start < ws.length) {
      const end = Math.min(start + CHUNK_WORDS, ws.length)
      chunks.push({
        section: section.section,
        page: section.startPage,
        content: ws.slice(start, end).join(' '),
      })
      if (end >= ws.length) break
      start = end - OVERLAP_WORDS
    }
  }

  return chunks
}
