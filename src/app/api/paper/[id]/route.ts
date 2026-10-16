import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateSummary } from '@/lib/summarize'
import type { Tables } from '@/types/database'

// POST: regenerate structured summary for a paper
export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: paper } = await supabase
    .from('papers')
    .select('id, title')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const service = createServiceClient()

  const { data: chunks } = await service
    .from('chunks')
    .select('section, page, content')
    .eq('paper_id', id)
    .order('page', { ascending: true })

  if (!chunks?.length) {
    return NextResponse.json({ error: 'Jurnal belum diproses atau tidak memiliki chunk.' }, { status: 400 })
  }

  const summary = await generateSummary(
    paper.title,
    chunks as Pick<Tables<'chunks'>, 'section' | 'page' | 'content'>[]
  )

  await service
    .from('summaries')
    .upsert({ paper_id: id, ...summary }, { onConflict: 'paper_id' })

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership and get file_path
  const { data: paper } = await supabase
    .from('papers')
    .select('id, file_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const service = createServiceClient()

  // Delete PDF from storage (non-fatal if missing)
  if (paper.file_path) {
    await service.storage.from('papers').remove([paper.file_path])
  }

  // Delete paper record — chunks and summaries cascade automatically
  await service.from('papers').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
