alter table public.agent_docs
add column if not exists citations jsonb not null default '[]'::jsonb;
