export type CitationStyle = 'apa7' | 'ieee' | 'harvard'

export type CitationInput = {
  title: string
  authors: string[]
  year: number | null
  journal: string | null
  doi: string | null
  volume?: string | null
  issue?: string | null
  pages?: string | null
}

function toApaAuthor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  const last = parts.at(-1)!
  const initials = parts.slice(0, -1).map(p => `${p[0].toUpperCase()}.`).join(' ')
  return `${last}, ${initials}`
}

function lastNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/).at(-1) ?? fullName
}

// APA 7 in-text: (Author, Year) / (Author & Author, Year) / (Author et al., Year)
function apa7InText(input: CitationInput): string {
  const year = input.year ? String(input.year) : 'n.d.'
  const last = input.authors.map(lastNameOf)
  if (!last.length) return `(${year})`
  if (last.length === 1) return `(${last[0]}, ${year})`
  if (last.length === 2) return `(${last[0]} & ${last[1]}, ${year})`
  return `(${last[0]} et al., ${year})`
}

// APA 7 reference list entry
function apa7Reference(input: CitationInput): string {
  const year = input.year ? `(${input.year})` : '(n.d.)'

  let authorStr = ''
  if (input.authors.length === 1) {
    authorStr = toApaAuthor(input.authors[0])
  } else if (input.authors.length === 2) {
    authorStr = `${toApaAuthor(input.authors[0])}, & ${toApaAuthor(input.authors[1])}`
  } else if (input.authors.length > 2) {
    const main = input.authors.slice(0, -1).map(toApaAuthor).join(', ')
    authorStr = `${main}, & ${toApaAuthor(input.authors.at(-1)!)}`
  }

  const journal = input.journal ? `*${input.journal}*` : null
  const vol = input.volume
    ? input.issue
      ? `*${input.volume}*(${input.issue})`
      : `*${input.volume}*`
    : null
  const pageStr = input.pages ?? null
  const doi = input.doi ? `https://doi.org/${input.doi}` : null

  const parts = [
    authorStr || null,
    year,
    input.title,
    [journal, vol, pageStr].filter(Boolean).join(', ') || null,
    doi,
  ].filter(Boolean)

  return parts.join('. ') + '.'
}

// IEEE in-text: [1]
function ieeeInText(_input: CitationInput): string {
  return '[n]'
}

// IEEE reference
function ieeeReference(input: CitationInput): string {
  const authors = input.authors.map(a => {
    const parts = a.trim().split(/\s+/)
    if (parts.length === 1) return parts[0]
    const last = parts.at(-1)!
    const initials = parts.slice(0, -1).map(p => `${p[0].toUpperCase()}.`).join(' ')
    return `${initials} ${last}`
  }).join(', ')

  const year = input.year ? `, ${input.year}` : ''
  const journal = input.journal ? `*${input.journal}*` : ''
  const vol = input.volume ? `, vol. ${input.volume}` : ''
  const iss = input.issue ? `, no. ${input.issue}` : ''
  const pages = input.pages ? `, pp. ${input.pages}` : ''
  const doi = input.doi ? `, doi: ${input.doi}` : ''

  return `${authors}, "${input.title}," ${journal}${vol}${iss}${pages}${year}${doi}.`
}

// Harvard in-text: (Author Year) / (Author & Author Year) / (Author et al. Year)
function harvardInText(input: CitationInput): string {
  const year = input.year ? String(input.year) : 'n.d.'
  const last = input.authors.map(lastNameOf)
  if (!last.length) return `(${year})`
  if (last.length === 1) return `(${last[0]} ${year})`
  if (last.length === 2) return `(${last[0]} & ${last[1]} ${year})`
  return `(${last[0]} et al. ${year})`
}

// Harvard reference
function harvardReference(input: CitationInput): string {
  const year = input.year ? `${input.year}.` : 'n.d.'
  const authors = input.authors.map(toApaAuthor).join(', ')
  const journal = input.journal ? `*${input.journal}*` : null
  const vol = input.volume
    ? input.issue ? `${input.volume}(${input.issue})` : input.volume
    : null
  const pages = input.pages ?? null
  const doi = input.doi ? `Available at: https://doi.org/${input.doi}` : null

  const parts = [
    authors || null,
    year,
    `*${input.title}*`,
    [journal, vol, pages].filter(Boolean).join(', ') || null,
    doi,
  ].filter(Boolean)

  return parts.join(' ') + '.'
}

export function formatInText(input: CitationInput, style: CitationStyle = 'apa7'): string {
  if (style === 'ieee') return ieeeInText(input)
  if (style === 'harvard') return harvardInText(input)
  return apa7InText(input)
}

export function formatReference(input: CitationInput, style: CitationStyle = 'apa7'): string {
  if (style === 'ieee') return ieeeReference(input)
  if (style === 'harvard') return harvardReference(input)
  return apa7Reference(input)
}
