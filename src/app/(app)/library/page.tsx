import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { UploadButton } from '@/components/upload-button'
import { PaperList } from '@/components/paper-list'

export const metadata: Metadata = { title: 'Perpustakaan' }

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: papers } = await supabase
    .from('papers')
    .select('id, title, authors, year, journal, status')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Perpustakaan</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {papers?.length
              ? `${papers.length} jurnal tersimpan`
              : 'Kelola koleksi jurnalmu'}
          </p>
        </div>
        <UploadButton />
      </div>

      <PaperList initialPapers={papers ?? []} />
    </div>
  )
}
