export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      collections: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      papers: {
        Row: {
          id: string
          user_id: string
          collection_id: string | null
          title: string
          authors: string[]
          year: number | null
          journal: string | null
          doi: string | null
          file_path: string | null
          status: 'uploading' | 'processing' | 'ready' | 'error'
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          collection_id?: string | null
          title: string
          authors?: string[]
          year?: number | null
          journal?: string | null
          doi?: string | null
          file_path?: string | null
          status?: 'uploading' | 'processing' | 'ready' | 'error'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          collection_id?: string | null
          title?: string
          authors?: string[]
          year?: number | null
          journal?: string | null
          doi?: string | null
          file_path?: string | null
          status?: 'uploading' | 'processing' | 'ready' | 'error'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      chunks: {
        Row: {
          id: string
          paper_id: string
          section: string | null
          page: number | null
          content: string
          embedding: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          paper_id: string
          section?: string | null
          page?: number | null
          content: string
          embedding?: number[] | null
          created_at?: string
        }
        Update: {
          id?: string
          paper_id?: string
          section?: string | null
          page?: number | null
          content?: string
          embedding?: number[] | null
          created_at?: string
        }
        Relationships: []
      }
      summaries: {
        Row: {
          id: string
          paper_id: string
          problem: string | null
          objective: string | null
          method: string | null
          data: string | null
          findings: string | null
          limitations: string | null
          future_work: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          paper_id: string
          problem?: string | null
          objective?: string | null
          method?: string | null
          data?: string | null
          findings?: string | null
          limitations?: string | null
          future_work?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          paper_id?: string
          problem?: string | null
          objective?: string | null
          method?: string | null
          data?: string | null
          findings?: string | null
          limitations?: string | null
          future_work?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          id: string
          paper_id: string
          chunk_id: string | null
          quote: string | null
          user_note: string | null
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          paper_id: string
          chunk_id?: string | null
          quote?: string | null
          user_note?: string | null
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          paper_id?: string
          chunk_id?: string | null
          quote?: string | null
          user_note?: string | null
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          collection_id: string | null
          title: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          collection_id?: string | null
          title?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          collection_id?: string | null
          title?: string | null
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          citations: Json
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          citations?: Json
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant'
          content?: string
          citations?: Json
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      match_chunks: {
        Args: {
          query_embedding: number[]
          match_count?: number
          filter_paper_ids?: string[] | null
          filter_collection_id?: string | null
        }
        Returns: {
          id: string
          paper_id: string
          section: string | null
          page: number | null
          content: string
          similarity: number
        }[]
      }
    }
    Enums: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Citation = {
  paper_id: string
  paper_title: string
  authors: string[]
  year: number | null
  page: number | null
  quote: string
  chunk_id: string
}
