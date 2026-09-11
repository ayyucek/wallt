-- WALLT — Faz 8: transactions + categories tabloları ve RLS politikaları
-- Supabase Dashboard → SQL Editor'da tek seferde çalıştırılabilir.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('expense', 'saving')),
  title text not null,
  description text not null default '',
  amount integer not null check (amount > 0),
  category_id text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists categories_user_id_idx
  on public.categories (user_id);

create index if not exists transactions_user_id_occurred_at_idx
  on public.transactions (user_id, occurred_at desc);

alter table public.categories enable row level security;
alter table public.transactions enable row level security;

-- categories: kullanıcı yalnızca kendi custom kategorilerini görür/yönetir
-- (DEFAULT_CATEGORIES bu tabloda değil, lib/categories.ts'te sabit kalır).
create policy "categories_select_own" on public.categories
  for select using (auth.uid() = user_id);

create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);

create policy "categories_update_own" on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "categories_delete_own" on public.categories
  for delete using (auth.uid() = user_id);

-- transactions: kullanıcı yalnızca kendi harcama/tasarruf kayıtlarını görür/yönetir
create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);

create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);
