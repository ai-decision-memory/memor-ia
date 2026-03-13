create table if not exists public.github_pat_sessions (
  session_id text primary key,
  github_pat text not null,
  github_pat_expires_at timestamptz,
  github_pat_last_validated_at timestamptz not null default now(),
  github_org_login text not null,
  github_user_id text not null,
  github_user_login text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
