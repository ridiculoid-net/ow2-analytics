-- OW2 Analytics schema (run in Supabase SQL editor)
-- Recommended: create a dedicated schema or keep public. This uses public.

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  played_at timestamptz not null,
  mode text not null,
  result text not null,
  map text not null,
  notes text,
  screenshot_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.match_player_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_key text not null, -- 'ridiculoid' | 'buttstough'
  hero text not null,
  kills int not null,
  deaths int not null,
  assists int not null,
  damage int,
  healing int,
  mitigation int
);

create index if not exists idx_matches_played_at on public.matches (played_at desc);
create index if not exists idx_stats_match_id on public.match_player_stats (match_id);
create index if not exists idx_stats_player on public.match_player_stats (player_key);

-- Optional: basic constraints
alter table public.matches
  add constraint matches_result_chk check (result in ('W','L','D'));

-- You can enable RLS and add policies later.
