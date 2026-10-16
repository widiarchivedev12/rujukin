import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CiteButton } from '@/components/cite-button'
import { DeletePaperButton } from '@/components/delete-paper-button'
import { RegenerateSummaryButton } from '@/components/regenerate-summary-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const metadata: Metadata = { title: 'Detail Jurnal' }

const SUMMARY_FIELDS: { key: string; label: string }[] = [
  { key: 'problem', label: 'Masalah Penelitian' },
  { key: 'objective', label: 'Tujuan' },
  { key: 'method', label: 'Metode' },
  { key: 'data', label: 'Data' },
  { key: 'findings', label: 'Temuan' },
  { key: 'limitations', label: 'Keterbatasan' },
  { key: 'future_work', label: 'Saran Penelitian Lanjutan' },
]

const STATUS_CONFIG = {
  uploading: { label: 'Mengunggah', className: 'bg-secondary text-secondary-foreground border-border' },
  processing: { label: 'Memproses', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
  ready: { label: 'Siap', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
  error: { label: 'Error', className: 'bg-destructive/10 text-destructive border-destructive/20' },
}

export default async function PaperPage(props: PageProps<'/paper/[id]'>) {
  const { id } = await props.params
  const supabase = await createClient()

  const [{ data: paper }, { data: summary }] = await Promise.all([
    supabase.from('papers').select('*').eq('id', id).single(),
    supabase.from('summaries').select('*').eq('paper_id', id).maybeSingle(),
  ])

  if (!paper) return notFound()

  const statusCfg = STATUS_CONFIG[paper.status] ?? { label: paper.status, className: '' }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Kembali ke Perpustakaan
      </Link>

      {/* Paper header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base leading-snug">{paper.title}</CardTitle>
            <Badge variant="outline" className={`shrink-0 ${statusCfg.className}`}>
              {statusCfg.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {paper.authors?.map((author, i) => (
              <Badge key={i} variant="secondary" className="font-normal">
                {author}
              </Badge>
            ))}
            {paper.year && (
              <Badge variant="outline" className="font-normal">{paper.year}</Badge>
            )}
            {paper.journal && (
              <Badge variant="outline" className="font-normal">{paper.journal}</Badge>
            )}
          </div>

          {paper.doi && (
            <p className="text-xs text-muted-foreground">
              DOI: <span className="font-mono">{paper.doi}</span>
            </p>
          )}

          <Separator />

          <div className="flex items-center gap-2 flex-wrap">
            <CiteButton
              citation={{
                title: paper.title,
                authors: paper.authors ?? [],
                year: paper.year,
                journal: paper.journal,
                doi: paper.doi,
              }}
            />
            <DeletePaperButton paperId={paper.id} title={paper.title} />
          </div>
        </CardContent>
      </Card>

      {/* Status states */}
      {paper.status === 'processing' && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Jurnal sedang diproses, ringkasan akan muncul sebentar lagi…
          </CardContent>
        </Card>
      )}

      {paper.status === 'error' && (
        <Card className="border-destructive/30">
          <CardContent className="py-8 text-center text-sm text-destructive">
            Terjadi kesalahan saat memproses jurnal.
            {paper.error_message && (
              <p className="mt-1 text-xs opacity-70">{paper.error_message}</p>
            )}
          </CardContent>
        </Card>
      )}

      {paper.status === 'ready' && !summary && (
        <Card className="border-dashed">
          <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Ringkasan belum tersedia untuk jurnal ini.
            </p>
            <RegenerateSummaryButton paperId={paper.id} />
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {summary && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ringkasan Terstruktur
            </h2>
            <RegenerateSummaryButton paperId={paper.id} />
          </div>
          <div className="space-y-2">
            {SUMMARY_FIELDS.map(({ key, label }) => {
              const value = summary[key as keyof typeof summary] as string | null
              if (!value) return null
              return (
                <Card key={key} size="sm">
                  <CardContent>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {label}
                    </p>
                    <p className="text-sm leading-relaxed">{value}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
