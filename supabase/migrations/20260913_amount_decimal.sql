-- WALLT — Tutar alanına ondalık (kuruş) desteği.
-- integer -> numeric(10,2) kayıpsız bir genişletme: mevcut tam sayı
-- kayıtlar (örn. 100) otomatik olarak 100.00'a döner, hiçbir satır
-- etkilenmez/silinmez. check (amount > 0) kısıtı aynen korunur.

alter table public.transactions
  alter column amount type numeric(10,2) using amount::numeric(10,2);
