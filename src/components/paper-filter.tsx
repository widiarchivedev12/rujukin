'use client'

import { cn } from '@/lib/utils'
import { BookOpen } from 'lucide-react'

export type PaperItem = { id: string; title: string }

interface PaperFilterProps {
  papers: PaperItem[]
  selected: string[]
  onChange: (ids: string[]) => void
}

export function PaperFilter({ papers, selected, onChange }: PaperFilterProps) {
  if (papers.length === 0) return null
  const all = selected.length === 0

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-3 py-2">
      <BookOpen className="size-3 shrink-0 text-muted-foreground" />
      <button
        onClick={() => onChange([])}
        className={cn(
          'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
          all
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        Semua
      </button>
      {papers.map(p => (
        <button
          key={p.id}
          onClick={() => toggle(p.id)}
          title={p.title}
          className={cn(
            'max-w-[140px] truncate rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
            selected.includes(p.id)
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          {p.title}
        </button>
      ))}
    </div>
  )
}
