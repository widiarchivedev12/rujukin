-- ============================================================
-- Rujukin - Initial Schema
-- Jalankan ini di Supabase SQL Editor
-- ============================================================

-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- ============================================================
-- Tables
-- ============================================================

create table if not exists collections (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users(id) on delete cascade not null,
  name        text        not null,
  created_at  timestamptz default now() not null
);

create table if not exists papers (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        references auth.users(id) on delete cascade not null,
  collection_id   uuid        references collections(id) on delete set null,
  title           text        not null,
  authors         text[]      not null default '{}',
  year            integer,
  journal         text,
  doi             text,
  file_path       text,           -- path di bucket Supabase Storage: {user_id}/{paper_id}.pdf
  status          text        not null default 'uploading'
                              check (status in ('uploading', 'processing', 'ready', 'error')),
  error_message   text,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create table if not exists chunks (
  id          uuid        default gen_random_uuid() primary key,
  paper_id    uuid        references papers(id) on delete cascade not null,
  section     text,           -- Abstract, Introduction, Methods, Results, Discussion, Conclusion
  page        integer,
  content     text        not null,
  embedding   extensions.vector(768),   -- gemini-embedding-001 @ 768 dims
  created_at  timestamptz default now() not null
);

create table if not exists summaries (
  id           uuid        default gen_random_uuid() primary key,
  paper_id     uuid        references papers(id) on delete cascade not null unique,
  problem      text,
  objective    text,
  method       text,
  data         text,
  findings     text,
  limitations  text,
  future_work  text,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

create table if not exists notes (
  id          uuid        default gen_random_uuid() primary key,
  paper_id    uuid        references papers(id) on delete cascade not null,
  chunk_id    uuid        references chunks(id) on delete set null,
  quote       text,
  user_note   text,
  user_id     uuid        references auth.users(id) on delete cascade not null,
  created_at  timestamptz default now() not null
);

create table if not exists conversations (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        references auth.users(id) on delete cascade not null,
  collection_id   uuid        references collections(id) on delete set null,
  title           text,
  created_at      timestamptz default now() not null
);

create table if not exists messages (
  id                  uuid        default gen_random_uuid() primary key,
  conversation_id     uuid        references conversations(id) on delete cascade not null,
  role                text        not null check (role in ('user', 'assistant')),
  content             text        not null,
  citations           jsonb       default '[]'::jsonb,
  created_at          timestamptz default now() not null
);

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists papers_user_id_idx        on papers(user_id);
create index if not exists papers_collection_id_idx  on papers(collection_id);
create index if not exists chunks_paper_id_idx       on chunks(paper_id);
create index if not exists messages_conversation_idx on messages(conversation_id);

-- Vector index — aktifkan setelah ada data (>= 1000 chunks)
-- create index on chunks using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 100);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger papers_updated_at   before update on papers   for each row execute function update_updated_at();
create trigger summaries_updated_at before update on summaries for each row execute function update_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table collections  enable row level security;
alter table papers        enable row level security;
alter table chunks        enable row level security;
alter table summaries     enable row level security;
alter table notes         enable row level security;
alter table conversations enable row level security;
alter table messages      enable row level security;

-- Collections: full CRUD untuk owner
create policy "collections_owner" on collections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Papers: full CRUD untuk owner
create policy "papers_owner" on papers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Chunks: read/insert/delete melalui paper ownership
create policy "chunks_select" on chunks for select
  using (exists (select 1 from papers where papers.id = chunks.paper_id and papers.user_id = auth.uid()));

create policy "chunks_insert" on chunks for insert
  with check (exists (select 1 from papers where papers.id = chunks.paper_id and papers.user_id = auth.uid()));

create policy "chunks_delete" on chunks for delete
  using (exists (select 1 from papers where papers.id = chunks.paper_id and papers.user_id = auth.uid()));

-- Summaries: CRUD melalui paper ownership
create policy "summaries_owner" on summaries for all
  using (exists (select 1 from papers where papers.id = summaries.paper_id and papers.user_id = auth.uid()))
  with check (exists (select 1 from papers where papers.id = summaries.paper_id and papers.user_id = auth.uid()));

-- Notes: full CRUD untuk owner
create policy "notes_owner" on notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Conversations: full CRUD untuk owner
create policy "conversations_owner" on conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Messages: CRUD melalui conversation ownership
create policy "messages_owner" on messages for all
  using (exists (select 1 from conversations where conversations.id = messages.conversation_id and conversations.user_id = auth.uid()))
  with check (exists (select 1 from conversations where conversations.id = messages.conversation_id and conversations.user_id = auth.uid()));

-- ============================================================
-- Vector similarity search function
-- ============================================================

create or replace function match_chunks(
  query_embedding extensions.vector(768),
  match_count      int     default 10,
  filter_paper_ids uuid[]  default null,
  filter_collection_id uuid default null
)
returns table (
  id         uuid,
  paper_id   uuid,
  section    text,
  page       integer,
  content    text,
  similarity float
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  select
    c.id,
    c.paper_id,
    c.section,
    c.page,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join papers p on p.id = c.paper_id
  where p.user_id = auth.uid()
    and (filter_paper_ids is null or c.paper_id = any(filter_paper_ids))
    and (filter_collection_id is null or p.collection_id = filter_collection_id)
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ============================================================
-- Storage bucket & policies
-- Jalankan bagian ini setelah bucket 'papers' dibuat di dashboard
-- ============================================================

-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values ('papers', 'papers', false, 20971520, array['application/pdf']);

create policy "storage_upload" on storage.objects for insert
  with check (bucket_id = 'papers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "storage_read" on storage.objects for select
  using (bucket_id = 'papers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "storage_delete" on storage.objects for delete
  using (bucket_id = 'papers' and auth.uid()::text = (storage.foldername(name))[1]);
