import { extractText } from 'unpdf'

export type PaperSection =
  | 'Abstract'
  | 'Introduction'
  | 'Methods'
  | 'Results'
  | 'Discussion'
  | 'Conclusion'
  | 'References'
  | 'Other'

export type ExtractedPage = {
  page: number
  text: string
}

export type ExtractedSection = {
  section: PaperSection
  startPage: number
  endPage: number
  text: string
}

export type ExtractedPaper = {
  pages: ExtractedPage[]
  sections: ExtractedSection[]
  fullText: string
}

const SECTION_PATTERNS: [PaperSection, RegExp][] = [
  ['Abstract', /^abstracts?$|^abstrak$/i],
  ['Introduction', /^(?:\d+\.?\s*)?introduction$|^pendahuluan$/i],
  ['Methods', /^(?:\d+\.?\s*)?(?:materials?\s+and\s+)?methods?(?:ology)?$|^metode(?:logi)?$|^metodologi$/i],
  ['Results', /^(?:\d+\.?\s*)?(?:results?|findings?)$|^hasil$/i],
  ['Discussion', /^(?:\d+\.?\s*)?discussion$|^pembahasan$/i],
  ['Conclusion', /^(?:\d+\.?\s*)?conclusions?$|^kesimpulan$/i],
  ['References', /^references?$|^bibliography$|^daftar\s+pustaka$/i],
]

function detectSection(line: string): PaperSection | null {
  const trimmed = line.trim()
  if (trimmed.length > 60 || trimmed.length < 3) return null
  for (const [section, pattern] of SECTION_PATTERNS) {
    if (pattern.test(trimmed)) return section
  }
  return null
}

function buildSections(pages: ExtractedPage[]): ExtractedSection[] {
  const starts: { section: PaperSection; page: number }[] = []

  for (const { page, text } of pages) {
    for (const line of text.split('\n')) {
      const detected = detectSection(line)
      if (detected && detected !== starts.at(-1)?.section) {
        starts.push({ section: detected, page })
      }
    }
  }

  if (starts.length === 0) {
    return [{
      section: 'Other',
      startPage: pages[0]?.page ?? 1,
      endPage: pages.at(-1)?.page ?? 1,
      text: pages.map(p => p.text).join('\n\n'),
    }]
  }

  const lastPage = pages.at(-1)?.page ?? 1
  return starts.map(({ section, page: startPage }, i) => {
    const endPage = starts[i + 1]?.page ? starts[i + 1].page - 1 : lastPage
    const text = pages
      .filter(p => p.page >= startPage && p.page <= endPage)
      .map(p => p.text)
      .join('\n\n')
    return { section, startPage, endPage, text }
  })
}

export async function extractPdf(buffer: ArrayBuffer): Promise<ExtractedPaper> {
  const data = new Uint8Array(buffer)
  const { text: pageTexts } = await extractText(data, { mergePages: false })

  const pages: ExtractedPage[] = (pageTexts as string[]).map((text, i) => ({
    page: i + 1,
    text,
  }))

  const sections = buildSections(pages)
  const fullText = (pageTexts as string[]).join('\n\n')

  return { pages, sections, fullText }
}
