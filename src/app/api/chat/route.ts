import {
  streamText,
  toUIMessageStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
} from 'ai'
import type { UIMessage } from 'ai'
import { groq } from '@ai-sdk/groq'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkChatLimit } from '@/lib/rate-limit'
import { embedQuery } from '@/lib/embed'
import { retrieveChunks } from '@/lib/retrieve'
import { buildRagContext, SYSTEM_PROMPT } from '@/lib/prompts'
import type { ChatMessage, CitationSource } from '@/types/chat'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const messages: UIMessage[] = body.messages ?? []
  const paperIds: string[] | null = Array.isArray(body.paperIds) && body.paperIds.length > 0
    ? (body.paperIds as string[])
    : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { success, limit, remaining, reset } = await checkChatLimit(user.id)
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'rate_limit', retryAfter },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
          'Retry-After': String(retryAfter),
        },
      }
    )
  }

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
  const queryText = lastUserMsg?.parts
    ?.find((p): p is { type: 'text'; text: string } => p.type === 'text')
    ?.text ?? ''

  let systemPrompt = SYSTEM_PROMPT
  let citations: CitationSource[] = []

  if (queryText.trim()) {
    try {
      const queryEmbedding = await embedQuery(queryText)
      const chunks = await retrieveChunks(supabase, {
        queryEmbedding,
        matchCount: 5,
        minSimilarity: 0.4,
        paperIds: paperIds ?? undefined,
      })

      if (chunks.length > 0) {
        citations = chunks.map((c, i) => ({
          index: i + 1,
          chunkId: c.id,
          paperId: c.paper_id,
          paperTitle: c.paper?.title ?? 'Tidak diketahui',
          authors: c.paper?.authors ?? [],
          year: c.paper?.year ?? null,
          section: c.section,
          page: c.page,
        }))

        const ctx = buildRagContext(chunks.map(c => ({
          id: c.id,
          paper_id: c.paper_id,
          content: c.content,
          section: c.section,
          page: c.page,
          paper_title: c.paper?.title,
          authors: c.paper?.authors,
          year: c.paper?.year,
        })))
        systemPrompt = `${SYSTEM_PROMPT}\n\nKONTEKS JURNAL:\n${ctx}`
      }
    } catch {
      // Retrieval failure is non-fatal
    }
  }

  const result = streamText({
    model: groq(process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  })

  const uiStream = createUIMessageStream<ChatMessage>({
    execute: ({ writer }) => {
      if (citations.length > 0) {
        writer.write({ type: 'data-citations', data: citations })
      }
      writer.merge(toUIMessageStream({ stream: result.stream }))
    },
  })

  return createUIMessageStreamResponse({ stream: uiStream })
}
