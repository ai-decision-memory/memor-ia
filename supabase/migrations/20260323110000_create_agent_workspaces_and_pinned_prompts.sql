create table if not exists public.agent_workspaces (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  title text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists agent_workspaces_session_id_updated_at_idx
on public.agent_workspaces (session_id, updated_at desc);

drop trigger if exists set_agent_workspaces_updated_at on public.agent_workspaces;

create trigger set_agent_workspaces_updated_at
before update on public.agent_workspaces
for each row
execute function public.set_updated_at();

alter table public.agent_workspaces enable row level security;

alter table public.agent_chats
add column if not exists workspace_id uuid references public.agent_workspaces(id) on delete cascade;

alter table public.agent_docs
add column if not exists workspace_id uuid references public.agent_workspaces(id) on delete cascade;

with session_sources as (
  select distinct session_id from public.agent_chats
  union
  select distinct session_id from public.agent_docs
)
insert into public.agent_workspaces (session_id, title)
select session_id, 'General'
from session_sources
where not exists (
  select 1
  from public.agent_workspaces existing
  where existing.session_id = session_sources.session_id
);

with workspace_per_session as (
  select distinct on (session_id) session_id, id
  from public.agent_workspaces
  order by session_id, created_at asc, id asc
)
update public.agent_chats as chats
set workspace_id = workspace_per_session.id
from workspace_per_session
where chats.workspace_id is null
  and chats.session_id = workspace_per_session.session_id;

with workspace_per_session as (
  select distinct on (session_id) session_id, id
  from public.agent_workspaces
  order by session_id, created_at asc, id asc
)
update public.agent_docs as docs
set workspace_id = workspace_per_session.id
from workspace_per_session
where docs.workspace_id is null
  and docs.session_id = workspace_per_session.session_id;

alter table public.agent_chats
alter column workspace_id set not null;

alter table public.agent_docs
alter column workspace_id set not null;

create index if not exists agent_chats_workspace_id_updated_at_idx
on public.agent_chats (workspace_id, updated_at desc);

create index if not exists agent_docs_workspace_id_updated_at_idx
on public.agent_docs (workspace_id, updated_at desc);

create table if not exists public.agent_pinned_prompts (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  workspace_id uuid not null references public.agent_workspaces(id) on delete cascade,
  title text not null,
  prompt text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists agent_pinned_prompts_workspace_id_updated_at_idx
on public.agent_pinned_prompts (workspace_id, updated_at desc);

drop trigger if exists set_agent_pinned_prompts_updated_at on public.agent_pinned_prompts;

create trigger set_agent_pinned_prompts_updated_at
before update on public.agent_pinned_prompts
for each row
execute function public.set_updated_at();

alter table public.agent_pinned_prompts enable row level security;
