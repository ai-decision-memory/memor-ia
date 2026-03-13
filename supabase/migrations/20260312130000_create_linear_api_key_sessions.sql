create table if not exists public.linear_api_key_sessions (
  session_id text primary key,
  linear_api_key text not null,
  linear_api_key_expires_at timestamptz,
  linear_api_key_last_validated_at timestamptz not null default timezone('utc'::text, now()),
  linear_team_id text not null,
  linear_team_key text not null,
  linear_team_name text not null,
  linear_user_id text not null,
  linear_user_name text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_linear_api_key_sessions_updated_at on public.linear_api_key_sessions;

create trigger set_linear_api_key_sessions_updated_at
before update on public.linear_api_key_sessions
for each row
execute function public.set_updated_at();

alter table public.linear_api_key_sessions enable row level security;
