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
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToTransaction);
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

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

// DEFAULT_CATEGORIES koda gömülüdür (DB'ye yazılmaz); dönen liste bunlarla
// kullanıcının custom kategorilerinin birleşimidir.
export async function fetchCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return [...DEFAULT_CATEGORIES, ...(data ?? []).map(rowToCategory)];
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
