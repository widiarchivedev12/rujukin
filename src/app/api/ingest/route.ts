import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkIngestLimit } from '@/lib/rate-limit'
import { extractPdf } from '@/lib/pdf'
import { chunkSections } from '@/lib/chunk'
import { embedDocuments } from '@/lib/embed'
import { fetchMetadataByDoi, fetchMetadataByTitle } from '@/lib/metadata'
import { generateSummary } from '@/lib/summarize'

function extractDoiFromText(text: string): string | null {
  const match = text.match(/\b(10\.\d{4,9}\/[^\s,;()\[\]"'<>]+)/i)
  return match ? match[1].replace(/[.,;:)\]"']+$/, '') : null
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const e = err as Error & { status?: number; statusCode?: number }
  if (e.status === 429 || e.statusCode === 429) return true
  const msg = err.message.toLowerCase()
  return msg.includes('rate limit') || msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('too many request')
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const paperId: string | undefined = body?.paperId
  if (!paperId) {
    return NextResponse.json({ error: 'paperId required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { success, limit, remaining, reset } = await checkIngestLimit(user.id)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(reset),
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
      },
    })
  }

  const service = createServiceClient()

  const { data: paper } = await service
    .from('papers')
    .select('*')
    .eq('id', paperId)
    .eq('user_id', user.id)
    .single()

  if (!paper) {
    return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
  }

  try {
    await service.from('papers').update({ status: 'processing' }).eq('id', paperId)

    const { data: fileData, error: downloadError } = await service.storage
      .from('papers')
      .download(paper.file_path!)

    if (downloadError || !fileData) throw new Error('Failed to download PDF from storage')

    const buffer = await fileData.arrayBuffer()
    const extracted = await extractPdf(buffer)
    const chunks = chunkSections(extracted.sections)

    if (chunks.length === 0) throw new Error('No text could be extracted from the PDF')

    const embeddings = await embedDocuments(chunks.map(c => c.content))

    await service.from('chunks').insert(
      chunks.map((chunk, i) => ({
        paper_id: paperId,
        section: chunk.section,
        page: chunk.page,
        content: chunk.content,
        embedding: embeddings[i],
      }))
    )

    // Try DOI from the paper record first, then scan the PDF text for one
    const doiInText = extractDoiFromText(extracted.fullText.slice(0, 4000))
    const effectiveDoi = paper.doi ?? doiInText

    let meta = effectiveDoi ? await fetchMetadataByDoi(effectiveDoi) : null
    // Only fall back to title search if it doesn't look like a raw filename
    if (!meta && !/[+_].*[+_]/.test(paper.title)) {
      meta = await fetchMetadataByTitle(paper.title)
    }

    const finalTitle = meta?.title || paper.title

    await service.from('papers').update({
      status: 'ready',
      ...(meta && {
        title: finalTitle,
        authors: meta.authors.length ? meta.authors : paper.authors,
        year: meta.year ?? paper.year,
        journal: meta.journal ?? paper.journal,
        doi: meta.doi ?? paper.doi,
      }),
    }).eq('id', paperId)

    // Generate and store structured summary (non-blocking failure)
    try {
      const summary = await generateSummary(finalTitle, chunks)
      await service.from('summaries').insert({
        paper_id: paperId,
        ...summary,
      })
    } catch {
      // Summary failure doesn't fail the whole ingest
    }

    return NextResponse.json({ success: true, chunks: chunks.length })
  } catch (err) {
    const isQuota = isQuotaError(err)
    const message = isQuota
      ? 'Kuota API habis (Gemini/Groq). Coba upload lagi nanti.'
      : err instanceof Error ? err.message : 'Unknown error'
    await service.from('papers').update({ status: 'error', error_message: message }).eq('id', paperId)
    return NextResponse.json({ error: message }, { status: isQuota ? 429 : 500 })
  }
}
