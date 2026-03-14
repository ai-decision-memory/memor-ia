alter table public.slack_oauth_sessions
  add column if not exists slack_team_name text;
