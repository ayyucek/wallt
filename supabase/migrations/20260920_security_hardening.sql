-- WALLT — güvenlik sertleştirmesi (defense in depth).
-- Supabase Dashboard → SQL Editor'da tek seferde çalıştırılabilir.

-- 1) RPC yalnızca giriş yapmış kullanıcılar tarafından çağrılabilsin.
--    (RLS zaten anon'u engelliyor; bu, yetki yüzeyini de kapatır.)
revoke execute on function public.generate_recurring_payment_transactions(uuid, date[], integer, date, text) from public, anon;
grant execute on function public.generate_recurring_payment_transactions(uuid, date[], integer, date, text) to authenticated;

-- 2) Uzunluk sınırları: RLS'li bir kullanıcı bile API'yi doğrudan çağırıp
--    devasa metinlerle depolamayı şişirmesin. `not valid`: mevcut satırlar
--    taranmaz (eski veri yüzünden migration patlamaz), yeni yazmalar denetlenir.
alter table public.transactions
  add constraint transactions_title_len check (char_length(title) <= 200) not valid,
  add constraint transactions_description_len check (char_length(description) <= 1000) not valid;

alter table public.categories
  add constraint categories_name_len check (char_length(name) between 1 and 60) not valid,
  add constraint categories_color_fmt check (color ~ '^#[0-9A-Fa-f]{6}$') not valid;

alter table public.recurring_payments
  add constraint recurring_title_len check (char_length(title) <= 200) not valid,
  add constraint recurring_installment_count_range
    check (installment_count is null or installment_count between 1 and 600) not valid,
  add constraint recurring_payment_day_range
    check (payment_day is null or payment_day between 1 and 31) not valid;
