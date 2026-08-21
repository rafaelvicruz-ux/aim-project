create extension if not exists pgcrypto;

create table if not exists public.published_maps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  author text not null,
  description text not null,
  config jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.published_maps enable row level security;

drop policy if exists "Anyone can read published maps" on public.published_maps;
drop policy if exists "Anyone can insert published maps" on public.published_maps;

create policy "Anyone can read published maps"
on public.published_maps
for select
using (true);

create policy "Anyone can insert published maps"
on public.published_maps
for insert
with check (true);
