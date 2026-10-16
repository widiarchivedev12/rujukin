import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/database'

export type RetrievedChunk = {
  id: string
  paper_id: string
  section: string | null
  page: number | null
  content: string
  similarity: number
  paper?: Pick<Tables<'papers'>, 'title' | 'authors' | 'year' | 'doi'>
}

export type RetrieveOptions = {
  queryEmbedding: number[]
  matchCount?: number
  minSimilarity?: number
  paperIds?: string[]
  collectionId?: string
}

export async function retrieveChunks(
  supabase: SupabaseClient<Database>,
  opts: RetrieveOptions
): Promise<RetrievedChunk[]> {
  const { data: chunks, error } = await supabase.rpc('match_chunks', {
    query_embedding: opts.queryEmbedding,
    match_count: opts.matchCount ?? 5,
    filter_paper_ids: opts.paperIds ?? null,
    filter_collection_id: opts.collectionId ?? null,
  })

  if (error) { console.error('[retrieve] match_chunks error:', error); return [] }
  if (!chunks?.length) return []

  const minSim = opts.minSimilarity ?? 0
  const filtered = minSim > 0 ? chunks.filter(c => c.similarity >= minSim) : chunks
  if (!filtered.length) return []

  const paperIds = [...new Set(filtered.map(c => c.paper_id))]
  const { data: papers } = await supabase
    .from('papers')
    .select('id, title, authors, year, doi')
    .in('id', paperIds)

  const paperMap = new Map(papers?.map(p => [p.id, p]) ?? [])

  return filtered.map(c => ({
    id: c.id,
    paper_id: c.paper_id,
    section: c.section,
    page: c.page,
    content: c.content,
    similarity: c.similarity,
    paper: paperMap.get(c.paper_id),
  }))
}
