'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, FileText, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

type Paper = {
  id: string
  title: string
  authors: string[] | null
  year: number | null
  journal: string | null
  status: 'uploading' | 'processing' | 'ready' | 'error'
}

const STATUS_CONFIG: Record<Paper['status'], { label: string; className: string; animate?: boolean }> = {
  uploading: {
    label: 'Mengunggah…',
    className: 'bg-secondary text-secondary-foreground border-border',
    animate: true,
  },
  processing: {
    label: 'Memproses…',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    animate: true,
  },
  ready: {
    label: 'Siap',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  },
  error: {
    label: 'Error',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
}

export function PaperList({ initialPapers }: { initialPapers: Paper[] }) {
  const [papers, setPapers] = useState(initialPapers)

  // Sync when the server re-renders (e.g. after router.refresh() in UploadButton)
  useEffect(() => {
    setPapers(initialPapers)
  }, [initialPapers])

  useEffect(() => {
    const hasActive = papers.some(p => p.status === 'uploading' || p.status === 'processing')
    if (!hasActive) return

    const interval = setInterval(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('papers')
        .select('id, title, authors, year, journal, status')
        .order('created_at', { ascending: false })
      if (data) setPapers(data as Paper[])
    }, 3000)

    return () => clearInterval(interval)
  }, [papers])

  if (!papers.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
          <BookOpen className="size-7 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Perpustakaanmu masih kosong</p>
          <p className="text-sm text-muted-foreground">Upload PDF jurnal untuk mulai membaca dan bertanya.</p>
        </div>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {papers.map((p) => {
        const cfg = STATUS_CONFIG[p.status]
        const isActive = p.status === 'uploading' || p.status === 'processing'

        return (
          <li key={p.id}>
            <Link
              href={`/paper/${p.id}`}
              className="group flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 space-y-1">
                  {isActive ? (
                    <Skeleton className="h-4 w-52 rounded" />
                  ) : (
                    <p className="truncate font-medium leading-snug">{p.title}</p>
                  )}
                  <p className="truncate text-sm text-muted-foreground">
                    {[p.authors?.[0], p.year?.toString(), p.journal].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              <Badge
                className={`shrink-0 gap-1 border ${cfg.className}`}
                variant="outline"
              >
                {cfg.animate && <Loader2 className="size-3 animate-spin" />}
                {cfg.label}
              </Badge>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
