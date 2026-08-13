create extension if not exists pgcrypto;

create table if not exists public.custom_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null,
  config jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.custom_maps enable row level security;

create policy "Users can read their own maps"
on public.custom_maps
for select
using (auth.uid() = user_id);

create policy "Users can insert their own maps"
on public.custom_maps
for insert
with check (auth.uid() = user_id);

create policy "Users can delete their own maps"
on public.custom_maps
for delete
using (auth.uid() = user_id);
