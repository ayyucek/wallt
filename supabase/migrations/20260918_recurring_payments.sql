-- WALLT — Düzenli Ödemeler (Taksit ve Abonelik).
-- Supabase Dashboard → SQL Editor'da tek seferde çalıştırılabilir.

create table if not exists public.recurring_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('installment', 'subscription')),
  title text not null,
  category_id text not null,
  amount numeric(10,2) not null check (amount > 0),
  start_date date not null,
  installment_count integer,
  installments_paid integer not null default 0,
  payment_day integer,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  last_generated_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bir düzenli ödeme (teorik olarak) silinirse geçmiş transaction'lar
-- referanssız kalmasın diye ON DELETE SET NULL — pratikte MVP'de düzenli
-- ödeme hiç hard-delete edilmiyor (iptal = status='cancelled'), ama bu FK
-- davranışı yine de savunmacı bir güvence.
alter table public.transactions
  add column if not exists recurring_payment_id uuid references public.recurring_payments (id) on delete set null;

create index if not exists recurring_payments_user_id_idx
  on public.recurring_payments (user_id);

create index if not exists transactions_recurring_payment_id_idx
  on public.transactions (recurring_payment_id);

alter table public.recurring_payments enable row level security;

create policy "recurring_payments_select_own" on public.recurring_payments
  for select using (auth.uid() = user_id);

create policy "recurring_payments_insert_own" on public.recurring_payments
  for insert with check (auth.uid() = user_id);

create policy "recurring_payments_update_own" on public.recurring_payments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "recurring_payments_delete_own" on public.recurring_payments
  for delete using (auth.uid() = user_id);

-- Otomatik üretim atomikliği (Teknik Analiz Bölüm 5.14): yeni transaction(lar)ın
-- eklenmesi VE recurring_payments'ın güncellenmesi ayrı sorgular olarak
-- gönderilirse, biri başarılı biri başarısız olduğunda çift üretim ya da
-- atlanan ay riski oluşur. Bu fonksiyon çağrısı Postgres'te tek bir implicit
-- transaction'dır — ya hepsi ya hiçbiri. security definer KULLANILMIYOR
-- (bilinçli): fonksiyon çağıranın yetkisiyle çalışır, mevcut RLS politikaları
-- hem SELECT/UPDATE'te hem INSERT'te olduğu gibi devreye girer; sahibi
-- olmayan bir p_payment_id verilirse RLS zaten satırı gizler, "not found"
-- exception'ı güvenle durur.
create or replace function public.generate_recurring_payment_transactions(
  p_payment_id uuid,
  p_occurred_dates date[],
  p_new_installments_paid integer,
  p_new_last_generated_date date,
  p_new_status text
) returns void
language plpgsql
as $$
declare
  v_payment public.recurring_payments%rowtype;
  v_date date;
begin
  select * into v_payment from public.recurring_payments where id = p_payment_id;
  if not found then
    raise exception 'recurring payment % not found', p_payment_id;
  end if;

  foreach v_date in array p_occurred_dates loop
    insert into public.transactions (type, title, description, amount, category_id, occurred_at, recurring_payment_id)
    values ('expense', v_payment.title, '', v_payment.amount, v_payment.category_id, v_date::timestamptz, p_payment_id);
  end loop;

  update public.recurring_payments
  set installments_paid = p_new_installments_paid,
      last_generated_date = p_new_last_generated_date,
      status = p_new_status,
      updated_at = now()
  where id = p_payment_id;
end;
$$;
