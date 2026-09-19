import { computeRecurringGenerations } from "./calculations";
import { DEFAULT_CATEGORIES } from "./categories";
import { createClient } from "./supabase/client";
import type {
  Category,
  RecurringPayment,
  RecurringPaymentStatus,
  RecurringPaymentType,
  Transaction,
  TransactionType,
} from "./types";

// Supabase okuma/yazma katmanı. RLS, satırları auth.uid()'a göre otomatik
// filtrelediği için burada kullanıcı bazlı filtreleme elle yapılmıyor.

interface TransactionRow {
  id: string;
  type: TransactionType;
  title: string;
  description: string;
  amount: number;
  category_id: string;
  occurred_at: string;
  recurring_payment_id: string | null;
}

interface CategoryRow {
  id: string;
  name: string;
  color: string;
}

interface RecurringPaymentRow {
  id: string;
  type: RecurringPaymentType;
  title: string;
  category_id: string;
  amount: number;
  start_date: string;
  installment_count: number | null;
  installments_paid: number;
  payment_day: number | null;
  status: RecurringPaymentStatus;
  last_generated_date: string | null;
}

const TRANSACTION_COLUMNS =
  "id, type, title, description, amount, category_id, occurred_at, recurring_payment_id";
const CATEGORY_COLUMNS = "id, name, color";
const RECURRING_PAYMENT_COLUMNS =
  "id, type, title, category_id, amount, start_date, installment_count, installments_paid, payment_day, status, last_generated_date";

// PostgREST bazen (client/sunucu saat senkronizasyon gecikmesi veya bilinen bir
// PostgREST cache bug'ı yüzünden) yeni basılmış bir JWT'yi "gelecekte basılmış"
// (PGRST303) olarak reddediyor — bkz. 14 Eylül 2026 araştırması, Teknik Analiz
// Bölüm 5.9. Bu genelde tek seferlik ve kısa ömürlü olduğundan, kullanıcıya hiç
// hata göstermeden ~1.5sn sonra bir kez sessizce tekrar deniyoruz.
function isClockSkewError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = "code" in err ? String((err as { code: unknown }).code) : "";
  const message = "message" in err ? String((err as { message: unknown }).message) : "";
  return code === "PGRST303" || message.includes("JWT issued at future");
}

async function withClockSkewRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isClockSkewError(err)) throw err;
    console.warn("[wallt] JWT clock-skew hatası, 1.5sn sonra yeniden deneniyor.", err);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      return await fn();
    } catch (retryErr) {
      console.warn("[wallt] Yeniden deneme sonrası JWT clock-skew hatası hâlâ sürüyor.", retryErr);
      throw retryErr;
    }
  }
}

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    amount: row.amount,
    categoryId: row.category_id,
    timestamp: row.occurred_at,
    recurringPaymentId: row.recurring_payment_id,
  };
}

function rowToCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, color: row.color, isCustom: true };
}

function rowToRecurringPayment(row: RecurringPaymentRow): RecurringPayment {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    categoryId: row.category_id,
    amount: row.amount,
    startDate: row.start_date,
    installmentCount: row.installment_count,
    installmentsPaid: row.installments_paid,
    paymentDay: row.payment_day,
    status: row.status,
    lastGeneratedDate: row.last_generated_date,
  };
}

export async function fetchTransactions(): Promise<Transaction[]> {
  return withClockSkewRetry(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions")
      .select(TRANSACTION_COLUMNS)
      .order("occurred_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToTransaction);
  });
}

export async function addTransaction(input: Omit<Transaction, "id">): Promise<Transaction> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      type: input.type,
      title: input.title,
      description: input.description,
      amount: input.amount,
      category_id: input.categoryId,
      occurred_at: input.timestamp,
      recurring_payment_id: input.recurringPaymentId,
    })
    .select(TRANSACTION_COLUMNS)
    .single();
  if (error) throw error;
  return rowToTransaction(data);
}

export async function updateTransaction(
  id: string,
  input: Omit<Transaction, "id">
): Promise<Transaction> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({
      type: input.type,
      title: input.title,
      description: input.description,
      amount: input.amount,
      category_id: input.categoryId,
      occurred_at: input.timestamp,
    })
    .eq("id", id)
    .select(TRANSACTION_COLUMNS)
    .single();
  if (error) throw error;
  return rowToTransaction(data);
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

// DEFAULT_CATEGORIES koda gömülüdür (DB'ye yazılmaz); dönen liste bunlarla
// kullanıcının custom kategorilerinin birleşimidir.
export async function fetchCategories(): Promise<Category[]> {
  return withClockSkewRetry(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return [...DEFAULT_CATEGORIES, ...(data ?? []).map(rowToCategory)];
  });
}

export async function addCategory(input: { name: string; color: string }): Promise<Category> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: input.name, color: input.color })
    .select(CATEGORY_COLUMNS)
    .single();
  if (error) throw error;
  return rowToCategory(data);
}

export async function updateCategory(id: string, input: { name: string; color: string }): Promise<Category> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ name: input.name, color: input.color })
    .eq("id", id)
    .select(CATEGORY_COLUMNS)
    .single();
  if (error) throw error;
  return rowToCategory(data);
}

// Bir kategoriyi siler. Önce ona bağlı TÜM transaction'ları tek bir toplu
// UPDATE ile reassignTo'ya (varsayılan "diger") taşır, sonra kategori
// satırını siler — hiçbir kayıt referanssız (orphan category_id) kalmaz.
// Supabase client'ı çok-ifadeli bir DB transaction desteklemediğinden bu iki
// adım ayrı sorgudur; taşıma başarısız olursa silme hiç denenmez (throw ile
// durur), taşıma başarılı olup silme başarısız olursa kategori veri kaybı
// olmadan "zombi" kalır (elle tekrar denenebilir).
export async function deleteCategory(id: string, reassignTo = "diger"): Promise<void> {
  const supabase = createClient();
  const { error: reassignError } = await supabase
    .from("transactions")
    .update({ category_id: reassignTo })
    .eq("category_id", id);
  if (reassignError) throw reassignError;
  // Düzenli ödemeler de kategoriye bağlı: taşınmazsa gelecekteki otomatik
  // üretim silinmiş kategori id'siyle (referanssız) transaction yazardı.
  const { error: recurringReassignError } = await supabase
    .from("recurring_payments")
    .update({ category_id: reassignTo })
    .eq("category_id", id);
  if (recurringReassignError) throw recurringReassignError;
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// Düzenli Ödemeler — Taksit ve Abonelik (18 Eylül 2026 eklentisi, PRD 5.6,
// Teknik Analiz Bölüm 5.14).
export async function fetchRecurringPayments(): Promise<RecurringPayment[]> {
  return withClockSkewRetry(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("recurring_payments")
      .select(RECURRING_PAYMENT_COLUMNS)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(rowToRecurringPayment);
  });
}

// Tanımlama akışında (page.tsx), bu çağrıyla AYNI anda bugünün tarihiyle bir
// ilk transaction da elle oluşturulur (bkz. AddExpenseSheet). installmentsPaid
// ve lastGeneratedDate BURADA, tek bir INSERT'te "bugün" ile set edilir —
// computeRecurringGenerations ilk ayı asla tekrar üretmesin diye (Teknik
// Analiz 5.14). Bu iki yazma (recurring_payments + transactions) atomik
// değildir; ama checkAndGenerateRecurringPayments'taki gibi bir çift-üretim
// riski taşımaz (aynı ay için en fazla bir kez çağrılan, tekilleştirmeye
// gerek duymayan bir oluşturma akışı) — atomik RPC bilinçli olarak sadece
// otomatik üretim tarafında kullanılıyor.
export async function addRecurringPayment(input: {
  type: RecurringPaymentType;
  title: string;
  categoryId: string;
  amount: number;
  startDate: string;
  installmentCount: number | null;
  paymentDay: number | null;
  installmentsPaid: number;
  lastGeneratedDate: string;
  status?: RecurringPaymentStatus;
}): Promise<RecurringPayment> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring_payments")
    .insert({
      type: input.type,
      title: input.title,
      category_id: input.categoryId,
      amount: input.amount,
      start_date: input.startDate,
      installment_count: input.installmentCount,
      payment_day: input.paymentDay,
      installments_paid: input.installmentsPaid,
      last_generated_date: input.lastGeneratedDate,
      status: input.status ?? "active",
    })
    .select(RECURRING_PAYMENT_COLUMNS)
    .single();
  if (error) throw error;
  return rowToRecurringPayment(data);
}

// Tanımlama akışında ilk transaction yazılamazsa, kayıtsız kalan (ilk ayı hiç
// üretilmeyecek) düzenli ödemeyi geri almak için kullanılır.
export async function deleteRecurringPayment(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("recurring_payments").delete().eq("id", id);
  if (error) throw error;
}

// Yalnızca tutar/ödeme günü güncellenebilir — geçmiş transaction'lara
// dokunulmaz, sadece gelecekteki üretim bu yeni değerleri kullanır.
export async function updateRecurringPayment(
  id: string,
  input: { amount: number; paymentDay: number | null }
): Promise<RecurringPayment> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring_payments")
    .update({ amount: input.amount, payment_day: input.paymentDay })
    .eq("id", id)
    .select(RECURRING_PAYMENT_COLUMNS)
    .single();
  if (error) throw error;
  return rowToRecurringPayment(data);
}

// İptal bir DELETE değil UPDATE'tir (status='cancelled') — geçmiş
// transaction'lar hiç etkilenmez, sadece gelecekteki üretim durur.
export async function cancelRecurringPayment(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("recurring_payments")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}

// Otomatik/backfill üretim (Faz 3, PRD 5.6, Teknik Analiz 5.14) — uygulama
// açılışında bir kez çağrılır. Her düzenli ödeme için computeRecurringGenerations
// (saf fonksiyon, lib/calculations.ts) kaçırılan ayları hesaplar; sonuç boş
// değilse migration'daki generate_recurring_payment_transactions RPC'sine tek
// çağrıda yazılır. Bu RPC Postgres'te TEK bir implicit transaction olarak
// çalışır — transaction insert'leri VE recurring_payments güncellemesi
// (installments_paid/last_generated_date/status) ya hep birlikte yazılır ya
// hiç yazılmaz; biri başarısız olursa diğeri de otomatik geri alınır. RPC
// void döndüğünden üretilen transaction id'lerini geri vermez — bu yüzden
// true dönerse çağıran (page.tsx) transactions ve recurring_payments'ı
// yeniden fetch ederek güncel id'lerle taze state kurar.
export async function checkAndGenerateRecurringPayments(
  recurringPayments: RecurringPayment[],
  today: Date = new Date()
): Promise<boolean> {
  const supabase = createClient();

  // Ödemeler birbirinden bağımsız olduğundan RPC'ler paralel çalışır; biri
  // başarısız olsa bile diğerlerinin yazımı sürer ve çağıran güncel veriyi
  // yeniden çeker (tek bir bozuk kayıt tüm uygulamanın açılışını engellemez).
  const results = await Promise.allSettled(
    recurringPayments.map(async (payment) => {
      const generations = computeRecurringGenerations(payment, today);
      if (generations.length === 0) return false;

      const last = generations[generations.length - 1];
      const { error } = await supabase.rpc("generate_recurring_payment_transactions", {
        p_payment_id: payment.id,
        p_occurred_dates: generations.map((g) => g.date),
        p_new_installments_paid: last.installmentsPaidAfter,
        p_new_last_generated_date: last.date,
        p_new_status: last.completesPayment ? "completed" : "active",
      });
      if (error) throw error;
      return true;
    })
  );

  results.forEach((r) => {
    if (r.status === "rejected") {
      console.warn("[wallt] Düzenli ödeme üretimi başarısız, sonraki açılışta tekrar denenecek.", r.reason);
    }
  });

  return results.some((r) => r.status === "fulfilled" && r.value);
}
