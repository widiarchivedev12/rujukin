import { embed, embedMany } from 'ai'
import { google } from '@ai-sdk/google'

const EMBEDDING_MODEL = 'gemini-embedding-001'
const EMBEDDING_DIMS = 768

const model = google.embedding(EMBEDDING_MODEL)

const sharedOptions = {
  providerOptions: {
    google: { outputDimensionality: EMBEDDING_DIMS },
  },
}

export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model,
    value: text,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMS,
        taskType: 'RETRIEVAL_QUERY',
      },
    },
  })
  return embedding
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model,
    values: texts,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMS,
        taskType: 'RETRIEVAL_DOCUMENT',
      },
    },
  })
  return embeddings
}

export { sharedOptions as embedOptions }
export const EMBEDDING_DIMENSIONS = EMBEDDING_DIMS
