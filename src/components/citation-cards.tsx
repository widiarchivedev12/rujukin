import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CitationSource } from '@/types/chat'

function formatAuthors(authors: string[]): string {
  if (!authors.length) return ''
  const lastNames = authors.map(a => a.split(' ').at(-1) ?? a)
  if (lastNames.length === 1) return lastNames[0]
  if (lastNames.length === 2) return `${lastNames[0]} & ${lastNames[1]}`
  return `${lastNames[0]} et al.`
}

export function CitationCards({ citations }: { citations: CitationSource[] }) {
  if (!citations.length) return null

  // Group by paper, collecting all [n] indices that reference it
  const paperMap = new Map<string, { citation: CitationSource; indices: number[] }>()
  for (const c of citations) {
    const existing = paperMap.get(c.paperId)
    if (existing) {
      existing.indices.push(c.index)
    } else {
      paperMap.set(c.paperId, { citation: c, indices: [c.index] })
    }
  }

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
        Sumber
      </p>
      {[...paperMap.values()].map(({ citation: c, indices }) => (
        <Link
          key={c.paperId}
          href={`/paper/${c.paperId}`}
          className="flex items-start gap-2.5 rounded-lg border border-border bg-background/80 px-3 py-2.5 text-xs transition-colors hover:bg-muted/50 hover:border-border/80"
        >
          <BookOpen className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-muted-foreground text-[10px]">
                {indices.map(n => `[${n}]`).join(' ')}
              </span>
              <p className="truncate font-medium leading-snug">{c.paperTitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {formatAuthors(c.authors) && (
                <span className="text-muted-foreground">{formatAuthors(c.authors)}</span>
              )}
              {c.year && (
                <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
                  {c.year}
                </Badge>
              )}
              {c.section && (
                <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
                  {c.section}
                </Badge>
              )}
              {c.page && (
                <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
                  Hal. {c.page}
                </Badge>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
