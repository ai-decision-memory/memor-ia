create table if not exists public.slack_oauth_sessions (
  session_id text primary key,
  oauth_state text,
  slack_access_token text,
  slack_user_id text,
  slack_team_id text,
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

drop trigger if exists set_slack_oauth_sessions_updated_at on public.slack_oauth_sessions;

create trigger set_slack_oauth_sessions_updated_at
before update on public.slack_oauth_sessions
for each row
execute function public.set_updated_at();

alter table public.slack_oauth_sessions enable row level security;
