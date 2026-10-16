import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

// POST: create/update conversation + append new messages
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    conversationId: string
    title?: string
    messages: { role: 'user' | 'assistant'; content: string; citations: Json[] }[]
  }

  const service = createServiceClient()

  // Upsert conversation (creates if new, updates title if set)
  const upsertData: { id: string; user_id: string; title?: string } = {
    id: body.conversationId,
    user_id: user.id,
  }
  if (body.title) upsertData.title = body.title

  const { error: convError } = await service
    .from('conversations')
    .upsert(upsertData, { onConflict: 'id' })

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 })
  }

  // Append new messages (caller sends only the delta)
  if (body.messages.length > 0) {
    const { error: msgError } = await service.from('messages').insert(
      body.messages.map(m => ({
        conversation_id: body.conversationId,
        role: m.role,
        content: m.content,
        citations: m.citations ?? [],
      }))
    )
    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ id: body.conversationId })
}

// GET: list user's recent conversations
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json(conversations ?? [])
}
