import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { CitationSource } from '@/types/chat'

// GET: load a conversation with all its messages
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, title, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, citations, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    conversation,
    messages: (messages ?? []).map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      citations: Array.isArray(m.citations) ? (m.citations as unknown as CitationSource[]) : [],
      createdAt: m.created_at,
    })),
  })
}

// DELETE: delete a conversation and all its messages
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership before deleting
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const service = createServiceClient()
  await service.from('conversations').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
