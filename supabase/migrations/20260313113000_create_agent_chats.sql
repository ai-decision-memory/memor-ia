create table if not exists public.agent_chats (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  title text not null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists agent_chats_session_id_updated_at_idx
on public.agent_chats (session_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_agent_chats_updated_at on public.agent_chats;

create trigger set_agent_chats_updated_at
before update on public.agent_chats
for each row
execute function public.set_updated_at();

alter table public.agent_chats enable row level security;
