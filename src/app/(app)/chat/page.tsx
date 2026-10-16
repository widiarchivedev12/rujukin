import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ChatUI } from '@/components/chat-ui'
import type { ChatMessage } from '@/types/chat'
import type { CitationSource } from '@/types/chat'

export const metadata: Metadata = { title: 'Chat' }

export default async function ChatPage(props: PageProps<'/chat'>) {
  const searchParams = await props.searchParams
  const rawId = searchParams?.id
  const conversationId = Array.isArray(rawId) ? rawId[0] : (rawId ?? null)

  const supabase = await createClient()

  // Load conversation list + user's ready papers in parallel
  const [{ data: conversations }, { data: papers }] = await Promise.all([
    supabase
      .from('conversations')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('papers')
      .select('id, title')
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  // If a conversation ID is provided, load its messages
  let initialMessages: ChatMessage[] = []
  if (conversationId) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, role, content, citations, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgs) {
      initialMessages = msgs.map(m => {
        const citations = Array.isArray(m.citations)
          ? (m.citations as unknown as CitationSource[])
          : []
        const parts: ChatMessage['parts'] = [
          { type: 'text' as const, text: m.content },
          ...(citations.length > 0
            ? [{ type: 'data-citations' as const, data: citations }]
            : []),
        ]
        return {
          id: m.id,
          role: m.role as 'user' | 'assistant',
          parts,
        } satisfies ChatMessage
      })
    }
  }

  return (
    <ChatUI
      conversationId={conversationId}
      initialMessages={initialMessages}
      recentConversations={(conversations ?? []).map(c => ({
        id: c.id,
        title: c.title ?? 'Percakapan',
        createdAt: c.created_at,
      }))}
      papers={(papers ?? []).map(p => ({ id: p.id, title: p.title }))}
    />
  )
}
