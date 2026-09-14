import { DEFAULT_CATEGORIES } from "./categories";
import { createClient } from "./supabase/client";
import type { Category, Transaction, TransactionType } from "./types";

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
}

interface CategoryRow {
  id: string;
  name: string;
  color: string;
}

const TRANSACTION_COLUMNS = "id, type, title, description, amount, category_id, occurred_at";
const CATEGORY_COLUMNS = "id, name, color";

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
  };
}

function rowToCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, color: row.color, isCustom: true };
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
