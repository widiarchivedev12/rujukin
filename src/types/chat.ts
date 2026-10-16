import { z } from 'zod'
import type { UIMessage } from 'ai'

export const citationSourceSchema = z.object({
  index: z.number(),
  chunkId: z.string(),
  paperId: z.string(),
  paperTitle: z.string(),
  authors: z.array(z.string()),
  year: z.number().nullable(),
  section: z.string().nullable(),
  page: z.number().nullable(),
})

export type CitationSource = z.infer<typeof citationSourceSchema>

export type ChatDataTypes = {
  citations: CitationSource[]
}

export type ChatMessage = UIMessage<unknown, ChatDataTypes>
