function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

export type PaperMetadata = {
  title: string
  authors: string[]
  year: number | null
  journal: string | null
  doi: string | null
  abstract: string | null
}

type CrossrefAuthor = { given?: string; family?: string }
type OpenAlexAuthorship = { author: { display_name: string } }

function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  const words: [string, number][] = []
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) words.push([word, pos])
  }
  return words.sort((a, b) => a[1] - b[1]).map(([w]) => w).join(' ')
}

export async function fetchMetadataByDoi(doi: string): Promise<PaperMetadata | null> {
  try {
    const res = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
      {
        headers: { 'User-Agent': 'Rujukin/1.0 (mailto:support@rujukin.app)' },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return null
    const { message: work } = await res.json()
    return {
      title: decodeHtml(work.title?.[0] ?? ''),
      authors: (work.author ?? []).map((a: CrossrefAuthor) =>
        [a.given, a.family].filter(Boolean).join(' ')
      ),
      year: work.published?.['date-parts']?.[0]?.[0] ?? null,
      journal: work['container-title']?.[0] ? decodeHtml(work['container-title'][0]) : null,
      doi: work.DOI ?? doi,
      abstract: work.abstract ? decodeHtml(work.abstract) : null,
    }
  } catch {
    return null
  }
}

export async function fetchMetadataByTitle(title: string): Promise<PaperMetadata | null> {
  try {
    const url = new URL('https://api.openalex.org/works')
    url.searchParams.set('search', title)
    url.searchParams.set('per_page', '1')
    url.searchParams.set('mailto', 'support@rujukin.app')

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const { results } = await res.json()
    const work = results?.[0]
    if (!work) return null

    return {
      title: work.display_name ?? title,
      authors: (work.authorships ?? []).map(
        (a: OpenAlexAuthorship) => a.author?.display_name ?? ''
      ).filter(Boolean),
      year: work.publication_year ?? null,
      journal: work.primary_location?.source?.display_name ?? null,
      doi: work.doi?.replace('https://doi.org/', '') ?? null,
      abstract: work.abstract_inverted_index
        ? reconstructAbstract(work.abstract_inverted_index)
        : null,
    }
  } catch {
    return null
  }
}
