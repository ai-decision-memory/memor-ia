create table if not exists public.agent_docs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  source_chat_id uuid references public.agent_chats(id) on delete set null,
  title text not null,
  kind text not null check (kind in ('technical', 'user-facing')),
  content text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists agent_docs_session_id_updated_at_idx
on public.agent_docs (session_id, updated_at desc);

drop trigger if exists set_agent_docs_updated_at on public.agent_docs;

create trigger set_agent_docs_updated_at
before update on public.agent_docs
for each row
execute function public.set_updated_at();

alter table public.agent_docs enable row level security;
