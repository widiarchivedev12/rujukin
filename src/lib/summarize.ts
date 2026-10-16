import { generateText, Output } from 'ai'
import { groq } from '@ai-sdk/groq'
import { z } from 'zod'
import { SUMMARY_SYSTEM_PROMPT } from './prompts'

const summarySchema = z.object({
  problem: z.string().nullable(),
  objective: z.string().nullable(),
  method: z.string().nullable(),
  data: z.string().nullable(),
  findings: z.string().nullable(),
  limitations: z.string().nullable(),
  future_work: z.string().nullable(),
})

export type StructuredSummary = z.infer<typeof summarySchema>

type ChunkInput = { section: string | null; page: number | null; content: string }

const PRIORITY_SECTIONS = ['Abstract', 'Introduction', 'Conclusion', 'Results', 'Discussion']
const MAX_CHUNKS = 6
const MAX_CHARS_PER_CHUNK = 1200

export async function generateSummary(
  title: string,
  chunks: ChunkInput[]
): Promise<StructuredSummary> {
  const prioritized = PRIORITY_SECTIONS.flatMap(sec =>
    chunks.filter(c => c.section === sec)
  )
  const other = chunks.filter(c => !PRIORITY_SECTIONS.includes(c.section ?? ''))
  const selected = [...prioritized, ...other].slice(0, MAX_CHUNKS)

  const context = selected
    .map(c => {
      const content = c.content.length > MAX_CHARS_PER_CHUNK
        ? c.content.slice(0, MAX_CHARS_PER_CHUNK) + '…'
        : c.content
      return `[${c.section ?? 'Other'}${c.page ? ` · Hal. ${c.page}` : ''}]\n${content}`
    })
    .join('\n\n---\n\n')

  const { output } = await generateText({
    model: groq(process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b'),
    output: Output.object({ schema: summarySchema }),
    system: SUMMARY_SYSTEM_PROMPT,
    prompt: `Judul jurnal: "${title}"\n\n${context}`,
  })

  return output
}
