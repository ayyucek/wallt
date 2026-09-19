-- WALLT — generate_recurring_payment_transactions'ı idempotent yap.
-- Sorun: uygulama iki sekmede/cihazda aynı anda açılırsa (ya da dev'de React
-- StrictMode efekti iki kez çalışırsa) iki istemci de aynı kaçırılmış ayları
-- hesaplayıp RPC'yi çağırıyordu → aynı ay için çift transaction.
-- Çözüm: satırı `for update` ile kilitle (çağrılar sıraya girer) ve yalnızca
-- last_generated_date'ten SONRAKİ tarihleri ekle; eklenecek bir şey yoksa çık.
-- Supabase Dashboard → SQL Editor'da tek seferde çalıştırılabilir.

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
  v_inserted integer := 0;
begin
  select * into v_payment from public.recurring_payments where id = p_payment_id for update;
  if not found then
    raise exception 'recurring payment % not found', p_payment_id;
  end if;

  -- Başka bir istemci arada iptal ettiyse / tamamladıysa hiçbir şey üretme.
  if v_payment.status <> 'active' then
    return;
  end if;

  foreach v_date in array p_occurred_dates loop
    if v_payment.last_generated_date is not null and v_date <= v_payment.last_generated_date then
      continue;
    end if;
    insert into public.transactions (type, title, description, amount, category_id, occurred_at, recurring_payment_id)
    values ('expense', v_payment.title, '', v_payment.amount, v_payment.category_id, v_date::timestamptz, p_payment_id);
    v_inserted := v_inserted + 1;
  end loop;

  if v_inserted = 0 then
    return;
  end if;

  update public.recurring_payments
  set installments_paid = p_new_installments_paid,
      last_generated_date = p_new_last_generated_date,
      status = p_new_status,
      updated_at = now()
  where id = p_payment_id;
end;
$$;
